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

    /// <summary>
    /// IDs of transcript lines that triggered this suggestion (evidence linking).
    /// Enables doctors to see which conversation triggered each suggestion.
    /// </summary>
    public List<Guid> SourceTranscriptLineIds { get; set; } = [];

    /// <summary>
    /// When the suggestion was accepted by the doctor. Null if not yet acted upon.
    /// </summary>
    public DateTimeOffset? AcceptedAt { get; set; }

    /// <summary>
    /// When the suggestion was dismissed by the doctor. Null if not dismissed.
    /// </summary>
    public DateTimeOffset? DismissedAt { get; set; }

    /// <summary>
    /// Whether this suggestion has already been acted upon (accepted or dismissed).
    /// </summary>
    public bool IsActedUpon => AcceptedAt.HasValue || DismissedAt.HasValue;

    /// <summary>
    /// Accepts this suggestion. Throws if already acted upon.
    /// </summary>
    public void Accept()
    {
        if (IsActedUpon)
            throw new InvalidOperationException("Suggestion has already been acted upon");

        AcceptedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// Dismisses this suggestion. Throws if already acted upon.
    /// </summary>
    public void Dismiss()
    {
        if (IsActedUpon)
            throw new InvalidOperationException("Suggestion has already been acted upon");

        DismissedAt = DateTimeOffset.UtcNow;
    }

    // Navigation property
    public Session? Session { get; set; }
}
