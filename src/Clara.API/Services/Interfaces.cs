using Clara.API.Application.Models;
using Clara.API.Domain;

namespace Clara.API.Services;

public interface IAgentMemoryService
{
    /// <summary>
    /// Stores an observation in persistent memory, generating a vector embedding for future
    /// semantic recall. Embedding failure is non-fatal — the record is stored without a vector.
    /// </summary>
    Task<AgentMemory> StoreMemoryAsync(
        string agentId,
        Guid sessionId,
        string? patientId,
        string content,
        string memoryType,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the most recently accessed memories for a patient, ordered by recency.
    /// Updates access metadata (LastAccessedAt, AccessCount) for every recalled record.
    /// </summary>
    Task<List<AgentMemory>> RecallMemoriesForPatientAsync(
        string agentId,
        string patientId,
        int limit = 5,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns semantically similar memories using cosine distance on pgvector embeddings.
    /// When embedding generation fails, falls back to <see cref="RecallMemoriesForPatientAsync"/>.
    /// </summary>
    Task<List<AgentMemory>> RecallSimilarMemoriesAsync(
        string agentId,
        string query,
        string? patientId = null,
        int limit = 5,
        CancellationToken cancellationToken = default);
}

public interface ISuggestionService
{
    Task<List<Suggestion>> GenerateSuggestionsAsync(
        Guid sessionId,
        SuggestionSourceEnum source,
        Func<AgentEvent, Task>? onAgentEvent = null,
        CancellationToken cancellationToken = default);
    Task<SuggestionResponse> AcceptSuggestionAsync(Guid sessionId, Guid suggestionId, string doctorId, CancellationToken cancellationToken = default);
    Task<SuggestionResponse> DismissSuggestionAsync(Guid sessionId, Guid suggestionId, string doctorId, CancellationToken cancellationToken = default);
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

public interface ICorrectiveRagService
{
    Task<List<KnowledgeSearchResult>> SearchWithGradingAsync(
        string query,
        int topK = 3,
        float minScore = 0.7f,
        CancellationToken cancellationToken = default);
}

public interface IBatchTriggerService : IDisposable
{
    Task OnTranscriptLineAddedAsync(string sessionId, TranscriptLine line);
    void CleanupSession(string sessionId);
}

public interface ISessionService
{
    Task<SessionResponse> StartSessionAsync(string doctorId, StartSessionRequest request, CancellationToken cancellationToken = default);
    Task<List<SessionSummaryResponse>> GetSessionsAsync(string doctorId, int limit = 10, CancellationToken cancellationToken = default);
    Task<SessionResponse?> GetSessionAsync(Guid sessionId, string doctorId, CancellationToken cancellationToken = default);
    Task<SessionResponse> EndSessionAsync(Guid sessionId, string doctorId, CancellationToken cancellationToken = default);
}

internal interface ISuggestionCriticService
{
    Task<List<SuggestionItem>> CritiqueAsync(
        List<SuggestionItem> suggestions,
        string transcript,
        CancellationToken cancellationToken = default);
}
