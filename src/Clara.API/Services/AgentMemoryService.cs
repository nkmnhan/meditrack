using Clara.API.Data;
using Clara.API.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Pgvector;
using Pgvector.EntityFrameworkCore;

namespace Clara.API.Services;

/// <summary>
/// Persists and retrieves agent observations for cross-session continuity of care.
/// Uses pgvector cosine similarity for semantic recall, with a recency-based fallback
/// when embedding generation fails.
/// </summary>
public sealed class AgentMemoryService : IAgentMemoryService
{
    private readonly ClaraDbContext _db;
    private readonly IEmbeddingGenerator<string, Embedding<float>> _embeddingGenerator;
    private readonly ILogger<AgentMemoryService> _logger;

    public AgentMemoryService(
        ClaraDbContext db,
        IEmbeddingGenerator<string, Embedding<float>> embeddingGenerator,
        ILogger<AgentMemoryService> logger)
    {
        _db = db;
        _embeddingGenerator = embeddingGenerator;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<AgentMemory> StoreMemoryAsync(
        string agentId,
        Guid sessionId,
        string? patientId,
        string content,
        string memoryType,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(agentId);
        ArgumentException.ThrowIfNullOrWhiteSpace(content);
        ArgumentException.ThrowIfNullOrWhiteSpace(memoryType);

        Vector? embedding = null;

        try
        {
            var embeddingResult = await _embeddingGenerator.GenerateAsync(
                [content],
                cancellationToken: cancellationToken);

            embedding = new Vector(embeddingResult[0].Vector.ToArray());
        }
        catch (Exception exception)
        {
            // Embedding is an enrichment — never block memory storage on provider failure.
            // The record is still useful for recency-based recall without a vector.
            _logger.LogWarning(
                exception,
                "Embedding generation failed for agent memory (agentId: {AgentId}, patientId: {PatientId}). Storing without vector.",
                agentId, patientId);
        }

        var memory = new AgentMemory
        {
            AgentId = agentId,
            SessionId = sessionId,
            PatientId = patientId,
            Content = content,
            MemoryType = memoryType,
            Embedding = embedding,
            CreatedAt = DateTimeOffset.UtcNow,
            LastAccessedAt = DateTimeOffset.UtcNow,
            AccessCount = 0
        };

        _db.AgentMemories.Add(memory);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Agent memory stored (id: {MemoryId}, agentId: {AgentId}, patientId: {PatientId}, hasVector: {HasVector})",
            memory.Id, agentId, patientId, embedding is not null);

        return memory;
    }

    /// <inheritdoc />
    public async Task<List<AgentMemory>> RecallMemoriesForPatientAsync(
        string agentId,
        string patientId,
        int limit = 5,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(agentId);
        ArgumentException.ThrowIfNullOrWhiteSpace(patientId);

        var memories = await _db.AgentMemories
            .Where(memory => memory.AgentId == agentId && memory.PatientId == patientId)
            .OrderByDescending(memory => memory.LastAccessedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);

        await UpdateAccessMetadataAsync(memories, cancellationToken);

        return memories;
    }

    /// <inheritdoc />
    public async Task<List<AgentMemory>> RecallSimilarMemoriesAsync(
        string agentId,
        string query,
        string? patientId = null,
        int limit = 5,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(agentId);
        ArgumentException.ThrowIfNullOrWhiteSpace(query);

        Vector queryVector;

        try
        {
            var embeddingResult = await _embeddingGenerator.GenerateAsync(
                [query],
                cancellationToken: cancellationToken);

            queryVector = new Vector(embeddingResult[0].Vector.ToArray());
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "Embedding generation failed during RecallSimilarMemoriesAsync (agentId: {AgentId}). Falling back to recency-based recall.",
                agentId);

            // Fallback: return recent memories for the patient when vector search is unavailable
            if (!string.IsNullOrWhiteSpace(patientId))
            {
                return await RecallMemoriesForPatientAsync(agentId, patientId, limit, cancellationToken);
            }

            return [];
        }

        // Raise ef_search for higher recall on clinical data (default 40 is too low).
        // SET is session-scoped — safe here because each request gets a new DbContext scope.
        if (_db.Database.ProviderName == "Npgsql.EntityFrameworkCore.PostgreSQL")
        {
            await _db.Database.ExecuteSqlRawAsync("SET hnsw.ef_search = 100", cancellationToken);
        }

        // Filter base query by agent, optionally by patient
        var baseQuery = _db.AgentMemories
            .Where(memory => memory.AgentId == agentId && memory.Embedding != null);

        if (!string.IsNullOrWhiteSpace(patientId))
        {
            baseQuery = baseQuery.Where(memory => memory.PatientId == patientId);
        }

        // Order by cosine distance (ascending — smaller distance = more similar)
        var memories = await baseQuery
            .OrderBy(memory => memory.Embedding!.CosineDistance(queryVector))
            .Take(limit)
            .ToListAsync(cancellationToken);

        await UpdateAccessMetadataAsync(memories, cancellationToken);

        return memories;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private async Task UpdateAccessMetadataAsync(
        List<AgentMemory> memories,
        CancellationToken cancellationToken)
    {
        if (memories.Count == 0)
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;

        foreach (var memory in memories)
        {
            memory.LastAccessedAt = now;
            memory.AccessCount++;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }
}
