using Pgvector;

namespace Clara.API.Domain;

/// <summary>
/// A chunk of knowledge base content with vector embedding for semantic search.
/// </summary>
public sealed class KnowledgeChunk
{
    public Guid Id { get; set; }
    
    /// <summary>
    /// Source document name (e.g., "CDC-ChestPain.txt").
    /// </summary>
    public required string DocumentName { get; set; }
    
    /// <summary>
    /// The text content of this chunk.
    /// </summary>
    public required string Content { get; set; }
    
    /// <summary>
    /// Vector embedding for semantic search (1536 dimensions for text-embedding-3-small).
    /// </summary>
    public Vector? Embedding { get; set; }
    
    /// <summary>
    /// Category for filtering: 'cardiology', 'medications', 'general', etc.
    /// </summary>
    public string? Category { get; set; }
    
    /// <summary>
    /// Position of this chunk within the source document.
    /// </summary>
    public int ChunkIndex { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; }
    
    /// <summary>
    /// Reference to the parent document.
    /// </summary>
    public Guid? DocumentId { get; set; }
    
    // Navigation property
    public Document? Document { get; set; }
}
