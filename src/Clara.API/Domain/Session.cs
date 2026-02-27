namespace Clara.API.Domain;

/// <summary>
/// Represents a clinical session between a doctor and patient.
/// Each session captures real-time audio transcription and AI-generated suggestions.
/// </summary>
public sealed class Session
{
    public Guid Id { get; set; }
    
    /// <summary>
    /// The doctor conducting the session (from Identity.API).
    /// </summary>
    public required string DoctorId { get; set; }
    
    /// <summary>
    /// Optional patient ID (from Patient.API). Can be null for anonymous sessions.
    /// </summary>
    public string? PatientId { get; set; }
    
    public DateTimeOffset StartedAt { get; set; }
    
    public DateTimeOffset? EndedAt { get; set; }
    
    /// <summary>
    /// Session status: Active, Paused, Completed, Cancelled.
    /// </summary>
    public required string Status { get; set; }
    
    /// <summary>
    /// Whether audio recording is enabled for this session.
    /// </summary>
    public bool AudioRecorded { get; set; }
    
    /// <summary>
    /// Maps speaker labels to roles: {"Speaker A": "Doctor", "Speaker B": "Patient"}.
    /// Stored as JSONB in PostgreSQL.
    /// </summary>
    public Dictionary<string, string>? SpeakerMap { get; set; }
    
    // Navigation properties
    public ICollection<TranscriptLine> TranscriptLines { get; set; } = [];
    public ICollection<Suggestion> Suggestions { get; set; } = [];
}
