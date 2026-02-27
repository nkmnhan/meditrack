using EmergenAI.API.Data;
using EmergenAI.API.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Pgvector;
using Pgvector.EntityFrameworkCore;

namespace EmergenAI.API.Services;

/// <summary>
/// RAG search service for querying the knowledge base using vector similarity.
/// </summary>
public sealed class KnowledgeService
{
    private readonly EmergenDbContext _db;
    private readonly IEmbeddingGenerator<string, Embedding<float>> _embeddingGenerator;
    private readonly ILogger<KnowledgeService> _logger;

    public KnowledgeService(
        EmergenDbContext db,
        IEmbeddingGenerator<string, Embedding<float>> embeddingGenerator,
        ILogger<KnowledgeService> logger)
    {
        _db = db;
        _embeddingGenerator = embeddingGenerator;
        _logger = logger;
    }

    /// <summary>
    /// Searches the knowledge base for relevant chunks using cosine similarity.
    /// </summary>
    /// <param name="query">Natural language query text.</param>
    /// <param name="topK">Number of results to return (default: 3).</param>
    /// <param name="minScore">Minimum similarity score threshold (default: 0.7).</param>
    /// <returns>List of matching chunks with similarity scores.</returns>
    public async Task<List<KnowledgeSearchResult>> SearchAsync(
        string query, 
        int topK = 3, 
        float minScore = 0.7f,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);
        
        var startTime = DateTimeOffset.UtcNow;

        try
        {
            // Generate embedding for the query using M.E.AI abstraction
            // GenerateAsync returns GeneratedEmbeddings<Embedding<float>>
            var embeddingResult = await _embeddingGenerator.GenerateAsync([query], cancellationToken: cancellationToken);
            var queryVector = new Vector(embeddingResult[0].Vector.ToArray());

            // Query using cosine distance (pgvector <=> operator)
            // Note: pgvector uses distance (lower is better), so we convert to similarity
            var results = await _db.KnowledgeChunks
                .Where(chunk => chunk.Embedding != null)
                .Select(chunk => new
                {
                    Chunk = chunk,
                    Distance = chunk.Embedding!.CosineDistance(queryVector)
                })
                .OrderBy(result => result.Distance)
                .Take(topK * 2) // Fetch extra to filter by threshold
                .ToListAsync(cancellationToken);

            // Convert distance to similarity score (1 - distance for cosine)
            // Then filter by minimum score
            var searchResults = results
                .Select(result => new KnowledgeSearchResult
                {
                    ChunkId = result.Chunk.Id,
                    DocumentName = result.Chunk.DocumentName,
                    Content = result.Chunk.Content,
                    Category = result.Chunk.Category,
                    Score = (float)(1.0 - result.Distance)
                })
                .Where(result => result.Score >= minScore)
                .Take(topK)
                .ToList();

            var elapsedMs = (DateTimeOffset.UtcNow - startTime).TotalMilliseconds;
            
            _logger.LogInformation(
                "Knowledge search completed: query length {QueryLength}, results {ResultCount}, elapsed {ElapsedMs}ms",
                query.Length, searchResults.Count, elapsedMs);

            return searchResults;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Knowledge search failed for query: {Query}", query);
            throw;
        }
    }

    /// <summary>
    /// Searches with a lower threshold for broader context gathering.
    /// Used when we need more background information for LLM suggestions.
    /// </summary>
    public async Task<List<KnowledgeSearchResult>> SearchForContextAsync(
        string query,
        int topK = 5,
        CancellationToken cancellationToken = default)
    {
        // Use lower threshold for context gathering
        return await SearchAsync(query, topK, minScore: 0.5f, cancellationToken);
    }
}

/// <summary>
/// A search result from the knowledge base.
/// </summary>
public sealed record KnowledgeSearchResult
{
    public required Guid ChunkId { get; init; }
    public required string DocumentName { get; init; }
    public required string Content { get; init; }
    public string? Category { get; init; }
    public required float Score { get; init; }
}
