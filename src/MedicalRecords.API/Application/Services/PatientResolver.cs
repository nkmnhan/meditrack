using System.Text.Json;

namespace MediTrack.MedicalRecords.API.Application.Services;

/// <summary>
/// Http-based resolver that calls Patient.API to resolve patient information.
/// </summary>
public class PatientResolver : IPatientResolver
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PatientResolver> _logger;

    public PatientResolver(HttpClient httpClient, ILogger<PatientResolver> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<Guid?> GetPatientIdByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
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
            var patientData = JsonSerializer.Deserialize<PatientIdResponse>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return patientData?.PatientId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception resolving patient ID for user {UserId}", userId);
            return null;
        }
    }

    /// <summary>
    /// Response DTO for Patient.API GET /api/patients/by-user/{userId} endpoint.
    /// </summary>
    private sealed record PatientIdResponse(Guid PatientId);
}
