using Clara.API.Application.Models;
using Clara.API.Domain;

namespace Clara.API.Services;

public interface ITranscriptionService
{
    /// <summary>
    /// Transcribes an audio chunk and returns the result, or null if transcription failed.
    /// </summary>
    Task<TranscriptionResult?> TranscribeAsync(
        string sessionId,
        byte[] audioChunk,
        CancellationToken cancellationToken = default);
}

/// <summary>Result from a speech-to-text transcription.</summary>
public sealed record TranscriptionResult(string Transcript, float? Confidence);

public interface ISpeakerDetectionService
{
    /// <summary>
    /// Infers the current speaker ("Doctor" or "Patient") for the next transcript line.
    /// </summary>
    Task<string> InferSpeakerAsync(Guid sessionId, CancellationToken cancellationToken = default);
}

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

public interface IAskService
{
    Task<string> AskAsync(string question, string? patientId, CancellationToken cancellationToken = default);
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

/// <summary>
/// A single transcript result from the Deepgram streaming WebSocket.
/// IsFinal=false means an interim result; IsFinal=true means the phrase is committed.
/// </summary>
public sealed record TranscriptChunk(string Transcript, float? Confidence, bool IsFinal);

/// <summary>
/// Manages one persistent Deepgram WebSocket per session for real-time streaming STT.
/// </summary>
public interface IStreamingTranscriptionService
{
    /// <summary>
    /// Opens a Deepgram WebSocket for the session and starts a background receive loop
    /// that invokes <paramref name="onTranscript"/> for every non-empty transcript chunk.
    /// No-op if a stream is already open for this session.
    /// </summary>
    Task OpenStreamAsync(
        string sessionId,
        Func<TranscriptChunk, Task> onTranscript,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Sends raw PCM16 audio bytes to the open Deepgram WebSocket for the session.
    /// Silently ignores if no stream is open.
    /// </summary>
    Task SendAudioAsync(string sessionId, byte[] audioBytes, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sends a CloseStream message to Deepgram, waits for the final transcript,
    /// and disposes the WebSocket for the session.
    /// </summary>
    Task CloseStreamAsync(string sessionId);
}

/// <summary>
/// Abstraction over ClientWebSocket to allow unit testing without network access.
/// </summary>
public interface IDeepgramWebSocket : IAsyncDisposable
{
    System.Net.WebSockets.WebSocketState State { get; }
    Task ConnectAsync(Uri uri, System.Net.Http.Headers.HttpRequestHeaders? headers, CancellationToken cancellationToken);
    Task SendAsync(ReadOnlyMemory<byte> buffer, System.Net.WebSockets.WebSocketMessageType messageType, bool endOfMessage, CancellationToken cancellationToken);
    ValueTask<System.Net.WebSockets.ValueWebSocketReceiveResult> ReceiveAsync(Memory<byte> buffer, CancellationToken cancellationToken);
    Task CloseAsync(System.Net.WebSockets.WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken);
}

public interface IDeepgramWebSocketFactory
{
    IDeepgramWebSocket Create();
}
