using System.Text.Json;
using MediTrack.Shared.Services;

namespace Clara.API.Services;

/// <summary>
/// Fetches patient context from Patient.API for context-aware AI suggestions.
/// PHI access is audit-logged via the EventBus on every access attempt (HIPAA mandatory).
/// </summary>
public sealed class PatientContextService : IPatientContextService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IPHIAuditService _auditService;
    private readonly ILogger<PatientContextService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public PatientContextService(
        IHttpClientFactory httpClientFactory,
        IPHIAuditService auditService,
        ILogger<PatientContextService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _auditService = auditService;
        _logger = logger;
    }

    /// <summary>
    /// Fetches a minimal patient summary for AI context.
    /// Returns null on failure (non-fatal — suggestions can still work without patient context).
    /// </summary>
    public async Task<PatientContext?> GetPatientContextAsync(
        string patientId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(patientId))
        {
            return null;
        }

        try
        {
            var client = _httpClientFactory.CreateClient("PatientApi");

            var response = await client.GetAsync(
                $"/api/patients/{patientId}",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Failed to fetch patient context for {PatientId}: {StatusCode}",
                    patientId, response.StatusCode);
                await PublishAuditEventAsync(patientId, isSuccess: false,
                    errorMessage: $"HTTP {(int)response.StatusCode}", cancellationToken: cancellationToken);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var patientResponse = JsonSerializer.Deserialize<PatientApiResponse>(content, JsonOptions);

            if (patientResponse == null)
            {
                return null;
            }

            // Map to minimal context for AI (avoid excessive PHI exposure)
            var context = new PatientContext
            {
                PatientId = patientId,
                Age = CalculateAge(patientResponse.DateOfBirth),
                Gender = patientResponse.Gender,
                Allergies = patientResponse.Allergies ?? [],
                ActiveMedications = patientResponse.ActiveMedications ?? [],
                ChronicConditions = patientResponse.ChronicConditions ?? [],
                RecentVisitReason = patientResponse.RecentVisitReason
            };

            _logger.LogDebug(
                "Fetched patient context for {PatientId}: {AllergiesCount} allergies, {MedicationsCount} medications",
                patientId, context.Allergies.Count, context.ActiveMedications.Count);

            await PublishAuditEventAsync(patientId, isSuccess: true,
                accessedFields: "age,gender,allergies,medications,conditions,recentVisit",
                cancellationToken: cancellationToken);

            return context;
        }
        catch (HttpRequestException exception)
        {
            _logger.LogWarning(
                exception,
                "HTTP error fetching patient context for {PatientId}",
                patientId);
            await PublishAuditEventAsync(patientId, isSuccess: false,
                errorMessage: exception.Message, cancellationToken: cancellationToken);
            return null;
        }
        catch (JsonException exception)
        {
            _logger.LogWarning(
                exception,
                "JSON parsing error for patient {PatientId}",
                patientId);
            // Data was fetched (HTTP 200) but parsing failed — still audit the access attempt
            await PublishAuditEventAsync(patientId, isSuccess: false,
                errorMessage: "JSON parsing error", cancellationToken: cancellationToken);
            return null;
        }
    }

    /// <summary>
    /// Best-effort PHI audit publish. Failures are logged as warnings but never propagate
    /// to the caller — audit must never interrupt a clinical workflow.
    /// </summary>
    private async Task PublishAuditEventAsync(
        string patientId,
        bool isSuccess,
        string? accessedFields = null,
        string? errorMessage = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _auditService.PublishAccessAsync(
                resourceType: "PatientContext",
                resourceId: patientId,
                patientId: Guid.TryParse(patientId, out var parsedId) ? parsedId : Guid.Empty,
                action: "AIContextAccess",
                accessedFields: accessedFields,
                success: isSuccess,
                errorMessage: errorMessage,
                additionalContext: new { purpose = "AI suggestion generation" },
                cancellationToken: cancellationToken);
        }
        catch (Exception exception)
        {
            // Never let audit failures impact clinical workflows
            _logger.LogWarning(
                exception,
                "Failed to publish PHI audit event for patient {PatientId}", patientId);
        }
    }

    private static int? CalculateAge(DateOnly? dateOfBirth)
    {
        if (dateOfBirth == null)
        {
            return null;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var age = today.Year - dateOfBirth.Value.Year;
        if (dateOfBirth.Value.AddYears(age) > today)
            age--;
        return age;
    }
}

/// <summary>
/// Minimal patient context for AI suggestions.
/// Contains only what's needed for clinical decision support — not full patient record.
/// </summary>
public sealed record PatientContext
{
    public required string PatientId { get; init; }
    public int? Age { get; init; }
    public string? Gender { get; init; }
    public IReadOnlyList<string> Allergies { get; init; } = [];
    public IReadOnlyList<string> ActiveMedications { get; init; } = [];
    public IReadOnlyList<string> ChronicConditions { get; init; } = [];
    public string? RecentVisitReason { get; init; }

    /// <summary>
    /// Formats context for LLM prompt injection.
    /// </summary>
    public string ToPromptSection()
    {
        var parts = new List<string>();

        if (Age.HasValue)
        {
            parts.Add($"Age: {Age}");
        }

        if (!string.IsNullOrWhiteSpace(Gender))
        {
            parts.Add($"Gender: {Gender}");
        }

        if (Allergies.Count > 0)
        {
            parts.Add($"Allergies: {string.Join(", ", Allergies)}");
        }

        if (ActiveMedications.Count > 0)
        {
            parts.Add($"Current Medications: {string.Join(", ", ActiveMedications)}");
        }

        if (ChronicConditions.Count > 0)
        {
            parts.Add($"Chronic Conditions: {string.Join(", ", ChronicConditions)}");
        }

        if (!string.IsNullOrWhiteSpace(RecentVisitReason))
        {
            parts.Add($"Recent Visit: {RecentVisitReason}");
        }

        return parts.Count > 0
            ? $"## Patient Information\n{string.Join("\n", parts)}"
            : "";
    }
}

/// <summary>
/// Response shape from Patient.API (partial — only fields we need).
/// </summary>
internal sealed record PatientApiResponse
{
    public DateOnly? DateOfBirth { get; init; }
    public string? Gender { get; init; }
    public List<string>? Allergies { get; init; }
    public List<string>? ActiveMedications { get; init; }
    public List<string>? ChronicConditions { get; init; }
    public string? RecentVisitReason { get; init; }
}
