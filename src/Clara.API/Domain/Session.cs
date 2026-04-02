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
    /// Session type: Consultation, Follow-up, Review.
    /// </summary>
    public string SessionType { get; set; } = "Consultation";
    
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

    /// <summary>
    /// Valid state transitions for the session lifecycle.
    /// Active -> Paused, Completed, Cancelled
    /// Paused -> Active, Completed, Cancelled
    /// </summary>
    private static readonly Dictionary<string, HashSet<string>> ValidTransitions = new()
    {
        [SessionStatus.Active] = [SessionStatus.Paused, SessionStatus.Completed, SessionStatus.Cancelled],
        [SessionStatus.Paused] = [SessionStatus.Active, SessionStatus.Completed, SessionStatus.Cancelled],
        [SessionStatus.Completed] = [],
        [SessionStatus.Cancelled] = []
    };

    public void Pause()
    {
        ValidateTransition(SessionStatus.Paused);
        Status = SessionStatus.Paused;
    }

    public void Resume()
    {
        ValidateTransition(SessionStatus.Active);
        Status = SessionStatus.Active;
    }

    public void Complete()
    {
        ValidateTransition(SessionStatus.Completed);
        Status = SessionStatus.Completed;
        EndedAt = DateTimeOffset.UtcNow;
    }

    public void Cancel()
    {
        ValidateTransition(SessionStatus.Cancelled);
        Status = SessionStatus.Cancelled;
        EndedAt = DateTimeOffset.UtcNow;
    }

    public TimeSpan? Duration => EndedAt.HasValue ? EndedAt.Value - StartedAt : null;

    private void ValidateTransition(string targetStatus)
    {
        if (!ValidTransitions.TryGetValue(Status, out var allowed) || !allowed.Contains(targetStatus))
        {
            throw new InvalidOperationException(
                $"Cannot transition session from '{Status}' to '{targetStatus}'");
        }
    }
}
