namespace Clara.API.Domain;

/// <summary>
/// An AI-generated suggestion triggered during a session.
/// </summary>
public sealed class Suggestion
{
    public Guid Id { get; set; }
    
    public Guid SessionId { get; set; }
    
    /// <summary>
    /// The suggestion content (markdown-formatted bullet points).
    /// </summary>
    public required string Content { get; set; }
    
    /// <summary>
    /// When the suggestion was generated.
    /// </summary>
    public DateTimeOffset TriggeredAt { get; set; }
    
    /// <summary>
    /// Type of suggestion: 'clinical', 'medication', 'follow_up', 'differential'.
    /// </summary>
    public required string Type { get; set; }
    
    /// <summary>
    /// How the suggestion was triggered: 'batch' (auto) or 'on_demand' (user-requested).
    /// </summary>
    public required string Source { get; set; }
    
    /// <summary>
    /// Urgency level: 'low', 'medium', 'high'.
    /// </summary>
    public string? Urgency { get; set; }
    
    /// <summary>
    /// Confidence score (0.0 to 1.0) from the LLM.
    /// </summary>
    public float? Confidence { get; set; }
    
    // Navigation property
    public Session? Session { get; set; }
}
