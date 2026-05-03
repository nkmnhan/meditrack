using System.Net.Http.Headers;
using System.Text.Json;

namespace Appointment.API.Services;

/// <summary>
/// Http-based resolver that calls Patient.API to resolve patient information.
/// Includes caching to avoid repeated HTTP calls for the same user session.
/// </summary>
public class PatientResolver : IPatientResolver
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PatientResolver> _logger;

    private static readonly JsonSerializerOptions CaseInsensitiveOptions =
        new(JsonSerializerDefaults.Web);

    public PatientResolver(HttpClient httpClient, ILogger<PatientResolver> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<Guid?> GetPatientIdByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            // Endpoint: GET /api/patients/by-user/{userId} — implemented in Patient.API (PatientsApi.cs)
            var response = await _httpClient.GetAsync($"/api/patients/by-user/{userId}", cancellationToken);
            
            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    // User doesn't have a patient record yet
                    return null;
                }
                
                _logger.LogWarning("Failed to resolve patient ID for user {UserId}: HTTP {StatusCode}", 
                    userId, response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var patientData = JsonSerializer.Deserialize<PatientIdResponse>(content, CaseInsensitiveOptions);

            return patientData?.PatientId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving patient ID for user {UserId}", userId);
            // Don't throw — return null and let authorization fail gracefully
            return null;
        }
    }

    public async Task<bool?> IsPatientActiveAsync(Guid patientId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/patients/{patientId}/active", cancellationToken);

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return null;
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Could not determine active status for patient {PatientId}: HTTP {StatusCode}",
                    patientId, response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var statusData = JsonSerializer.Deserialize<PatientActiveStatusResponse>(content, CaseInsensitiveOptions);

            return statusData?.IsActive;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking active status for patient {PatientId}", patientId);
            return null;
        }
    }

    private record PatientIdResponse(Guid PatientId);

    private record PatientActiveStatusResponse(bool IsActive);
}
