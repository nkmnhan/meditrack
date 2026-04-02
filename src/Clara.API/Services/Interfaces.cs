using Clara.API.Domain;

namespace Clara.API.Services;

public interface ISuggestionService
{
    Task<List<Suggestion>> GenerateSuggestionsAsync(Guid sessionId, string source, CancellationToken cancellationToken = default);
}

public interface IKnowledgeService
{
    Task<List<KnowledgeSearchResult>> SearchAsync(string query, int topK = 3, float minScore = 0.7f, CancellationToken cancellationToken = default);
    Task<List<KnowledgeSearchResult>> SearchForContextAsync(string query, int topK = 5, CancellationToken cancellationToken = default);
}

public interface IPatientContextService
{
    Task<PatientContext?> GetPatientContextAsync(string patientId, CancellationToken cancellationToken = default);
}

public interface IBatchTriggerService : IDisposable
{
    Task OnTranscriptLineAddedAsync(string sessionId, TranscriptLine line);
    void CleanupSession(string sessionId);
}

public interface ISessionService
{
    Task<Clara.API.Application.Models.SessionResponse> StartSessionAsync(string doctorId, Clara.API.Application.Models.StartSessionRequest request, CancellationToken cancellationToken = default);
    Task<List<Clara.API.Application.Models.SessionSummaryResponse>> GetSessionsAsync(string doctorId, int limit = 10, CancellationToken cancellationToken = default);
    Task<Clara.API.Application.Models.SessionResponse?> GetSessionAsync(Guid sessionId, string doctorId, CancellationToken cancellationToken = default);
    Task<Clara.API.Application.Models.SessionResponse> EndSessionAsync(Guid sessionId, string doctorId, CancellationToken cancellationToken = default);
}
