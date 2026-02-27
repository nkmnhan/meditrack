using Clara.API.Data;
using Clara.API.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Pgvector;

namespace Clara.API.Services;

/// <summary>
/// Seeds the knowledge base with embedded document chunks on startup.
/// Only processes new documents (idempotent).
/// </summary>
public sealed class KnowledgeSeederService
{
    private readonly ILogger<KnowledgeSeederService> _logger;
    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IEmbeddingGenerator<string, Embedding<float>> _embeddingGenerator;

    public KnowledgeSeederService(
        ILogger<KnowledgeSeederService> logger,
        IConfiguration configuration,
        IServiceScopeFactory scopeFactory,
        IEmbeddingGenerator<string, Embedding<float>> embeddingGenerator)
    {
        _logger = logger;
        _configuration = configuration;
        _scopeFactory = scopeFactory;
        _embeddingGenerator = embeddingGenerator;
    }

    private static readonly string[] PlaceholderKeys =
        ["REPLACE_IN_OVERRIDE", "sk-placeholder-for-dev", "placeholder-for-dev", ""];

    /// <summary>
    /// Seeds knowledge base with documents from SeedData/Guidelines/.
    /// Skips documents that already exist in the database.
    /// Skips entirely when the OpenAI API key is a placeholder (avoids error spam in dev).
    /// </summary>
    public async Task SeedKnowledgeBaseAsync()
    {
        // Skip seeding when API key is a placeholder — embeddings require a real key
        var apiKey = _configuration["AI:OpenAI:ApiKey"];
        if (string.IsNullOrEmpty(apiKey) || PlaceholderKeys.Contains(apiKey, StringComparer.OrdinalIgnoreCase))
        {
            _logger.LogWarning(
                "OpenAI API key is not configured or is a placeholder. Skipping knowledge base seeding. " +
                "Set a real API key in AI:OpenAI:ApiKey to enable seeding");
            return;
        }

        var guidelinesPath = Path.Combine(AppContext.BaseDirectory, "SeedData", "Guidelines");

        if (!Directory.Exists(guidelinesPath))
        {
            _logger.LogWarning("Guidelines directory not found at {GuidelinesPath}. No knowledge seeded", guidelinesPath);
            return;
        }

        // Load both .txt and .md guideline files
        var guidelineFiles = Directory.GetFiles(guidelinesPath, "*.txt")
            .Concat(Directory.GetFiles(guidelinesPath, "*.md"))
            .ToArray();

        var chunkSize = _configuration.GetValue("Knowledge:ChunkSize", 500);
        var chunkOverlap = _configuration.GetValue("Knowledge:ChunkOverlap", 100);

        foreach (var filePath in guidelineFiles)
        {
            try
            {
                await ProcessDocumentAsync(filePath, chunkSize, chunkOverlap);
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Failed to process document {FilePath}", filePath);
            }
        }
    }

    private async Task ProcessDocumentAsync(string filePath, int chunkSize, int chunkOverlap)
    {
        var fileName = Path.GetFileName(filePath);
        
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ClaraDbContext>();

        // Check if document already exists (idempotent)
        var existingDocument = await db.Documents
            .FirstOrDefaultAsync(document => document.FileName == fileName);

        if (existingDocument != null)
        {
            _logger.LogDebug("Document {FileName} already exists, skipping", fileName);
            return;
        }

        _logger.LogInformation("Processing document: {FileName}", fileName);

        var content = await File.ReadAllTextAsync(filePath);
        var chunks = ChunkText(content, chunkSize, chunkOverlap);
        var category = ExtractCategory(fileName);

        // Create document record
        var document = new Document
        {
            Id = Guid.NewGuid(),
            FileName = fileName,
            UploadedAt = DateTimeOffset.UtcNow,
            UploadedBy = "system-seeder",
            ChunkCount = chunks.Count,
            Category = category
        };

        db.Documents.Add(document);

        // Generate embeddings for all chunks
        var knowledgeChunks = new List<KnowledgeChunk>();
        
        for (int chunkIndex = 0; chunkIndex < chunks.Count; chunkIndex++)
        {
            var chunkContent = chunks[chunkIndex];
            
            // Generate embedding using M.E.AI abstraction
            // GenerateAsync returns GeneratedEmbeddings<Embedding<float>> (a collection)
            var embeddingResult = await _embeddingGenerator.GenerateAsync([chunkContent]);
            var embeddingVector = embeddingResult[0].Vector;
            
            var knowledgeChunk = new KnowledgeChunk
            {
                Id = Guid.NewGuid(),
                DocumentId = document.Id,
                DocumentName = fileName,
                Content = chunkContent,
                Embedding = new Vector(embeddingVector.ToArray()),
                Category = category,
                ChunkIndex = chunkIndex,
                CreatedAt = DateTimeOffset.UtcNow
            };

            knowledgeChunks.Add(knowledgeChunk);
        }

        db.KnowledgeChunks.AddRange(knowledgeChunks);
        await db.SaveChangesAsync();

        _logger.LogInformation(
            "Seeded document {FileName}: {ChunkCount} chunks, category '{Category}'",
            fileName, chunks.Count, category);
    }

    /// <summary>
    /// Splits text into overlapping chunks for embedding.
    /// Simple word-based chunking (token approximation).
    /// </summary>
    private static List<string> ChunkText(string content, int chunkSize, int chunkOverlap)
    {
        var chunks = new List<string>();
        var words = content.Split([' ', '\n', '\r', '\t'], StringSplitOptions.RemoveEmptyEntries);
        
        if (words.Length == 0)
            return chunks;

        // Approximate: 1 word ≈ 1.3 tokens, so chunk size in words ≈ chunkSize / 1.3
        var wordsPerChunk = (int)(chunkSize / 1.3);
        var wordsOverlap = (int)(chunkOverlap / 1.3);

        for (int startIndex = 0; startIndex < words.Length; startIndex += wordsPerChunk - wordsOverlap)
        {
            var endIndex = Math.Min(startIndex + wordsPerChunk, words.Length);
            var chunkWords = words[startIndex..endIndex];
            var chunkContent = string.Join(" ", chunkWords);
            
            if (!string.IsNullOrWhiteSpace(chunkContent))
                chunks.Add(chunkContent);

            if (endIndex >= words.Length)
                break;
        }

        return chunks;
    }

    /// <summary>
    /// Extracts category from filename prefix (CDC-, AHA-, WHO-, etc.).
    /// </summary>
    private static string? ExtractCategory(string fileName)
    {
        var prefixes = new[] { "CDC", "AHA", "WHO", "NICE", "FDA" };
        
        foreach (var prefix in prefixes)
        {
            if (fileName.StartsWith($"{prefix}-", StringComparison.OrdinalIgnoreCase))
                return prefix.ToLowerInvariant();
        }

        return null;
    }
}
