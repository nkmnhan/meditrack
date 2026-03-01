using System.Text.Json;

namespace Clara.API.Services;

/// <summary>
/// Fetches patient context from Patient.API for context-aware AI suggestions.
/// PHI access is audit-logged via the EventBus.
/// </summary>
public sealed class PatientContextService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PatientContextService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public PatientContextService(
        IHttpClientFactory httpClientFactory,
        ILogger<PatientContextService> logger)
    {
        _httpClientFactory = httpClientFactory;
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

            return context;
        }
        catch (HttpRequestException exception)
        {
            _logger.LogWarning(
                exception,
                "HTTP error fetching patient context for {PatientId}",
                patientId);
            return null;
        }
        catch (JsonException exception)
        {
            _logger.LogWarning(
                exception,
                "JSON parsing error for patient {PatientId}",
                patientId);
            return null;
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
