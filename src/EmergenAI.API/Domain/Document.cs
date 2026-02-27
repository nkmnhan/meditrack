namespace EmergenAI.API.Domain;

/// <summary>
/// A knowledge base document uploaded for RAG retrieval.
/// </summary>
public sealed class Document
{
    public Guid Id { get; set; }
    
    /// <summary>
    /// Original file name.
    /// </summary>
    public required string FileName { get; set; }
    
    public DateTimeOffset UploadedAt { get; set; }
    
    /// <summary>
    /// User who uploaded the document.
    /// </summary>
    public required string UploadedBy { get; set; }
    
    /// <summary>
    /// Number of chunks created from this document.
    /// </summary>
    public int ChunkCount { get; set; }
    
    /// <summary>
    /// Document category for filtering.
    /// </summary>
    public string? Category { get; set; }
    
    // Navigation property
    public ICollection<KnowledgeChunk> Chunks { get; set; } = [];
}
