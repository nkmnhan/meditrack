using Pgvector;

namespace Clara.API.Domain;

/// <summary>
/// An observation stored by an AI agent for cross-session continuity of care.
/// Memories are embedded as vectors for semantic similarity search (pgvector).
/// </summary>
public sealed class AgentMemory
{
    public Guid Id { get; set; }

    /// <summary>
    /// The agent that created this memory — e.g., "clara-doctor" or "patient-companion".
    /// Scopes recall so agents never read each other's memories accidentally.
    /// </summary>
    public required string AgentId { get; set; }

    /// <summary>
    /// The session that triggered this memory.
    /// </summary>
    public Guid SessionId { get; set; }

    /// <summary>
    /// The patient this memory relates to.
    /// Null for agent-level observations not tied to a specific patient.
    /// </summary>
    public string? PatientId { get; set; }

    /// <summary>
    /// Natural language observation recorded by the agent.
    /// </summary>
    public required string Content { get; set; }

    /// <summary>
    /// Categorises the memory: "episodic" (session event) or "semantic" (distilled fact).
    /// </summary>
    public required string MemoryType { get; set; }

    /// <summary>
    /// 1536-dimension vector embedding of <see cref="Content"/> for cosine similarity search.
    /// Null when embedding generation failed — records are stored regardless.
    /// </summary>
    public Vector? Embedding { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Updated each time this memory is recalled.
    /// Used to sort by recency and as an importance signal for eviction (future).
    /// </summary>
    public DateTimeOffset LastAccessedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Incremented on every recall. Higher count = more relevant memory.
    /// </summary>
    public int AccessCount { get; set; }
}
