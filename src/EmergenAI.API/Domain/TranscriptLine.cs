namespace EmergenAI.API.Domain;

/// <summary>
/// A single line of transcribed speech from the session.
/// </summary>
public sealed class TranscriptLine
{
    public Guid Id { get; set; }
    
    public Guid SessionId { get; set; }
    
    /// <summary>
    /// Speaker role: 'Doctor' or 'Patient'.
    /// </summary>
    public required string Speaker { get; set; }
    
    /// <summary>
    /// The transcribed text content.
    /// </summary>
    public required string Text { get; set; }
    
    public DateTimeOffset Timestamp { get; set; }
    
    /// <summary>
    /// STT confidence score (0.0 to 1.0). Null if not provided by STT service.
    /// </summary>
    public float? Confidence { get; set; }
    
    // Navigation property
    public Session? Session { get; set; }
}
