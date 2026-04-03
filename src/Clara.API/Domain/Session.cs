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
    /// Stored as lowercase string in the database via EF value converter.
    /// </summary>
    public required SessionStatusEnum Status { get; set; }

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
    private static readonly Dictionary<SessionStatusEnum, HashSet<SessionStatusEnum>> ValidTransitions = new()
    {
        [SessionStatusEnum.Active]    = [SessionStatusEnum.Paused, SessionStatusEnum.Completed, SessionStatusEnum.Cancelled],
        [SessionStatusEnum.Paused]    = [SessionStatusEnum.Active, SessionStatusEnum.Completed, SessionStatusEnum.Cancelled],
        [SessionStatusEnum.Completed] = [],
        [SessionStatusEnum.Cancelled] = []
    };

    public void Pause()
    {
        ValidateTransition(SessionStatusEnum.Paused);
        Status = SessionStatusEnum.Paused;
    }

    public void Resume()
    {
        ValidateTransition(SessionStatusEnum.Active);
        Status = SessionStatusEnum.Active;
    }

    public void Complete()
    {
        ValidateTransition(SessionStatusEnum.Completed);
        Status = SessionStatusEnum.Completed;
        EndedAt = DateTimeOffset.UtcNow;
    }

    public void Cancel()
    {
        ValidateTransition(SessionStatusEnum.Cancelled);
        Status = SessionStatusEnum.Cancelled;
        EndedAt = DateTimeOffset.UtcNow;
    }

    public TimeSpan? Duration => EndedAt.HasValue ? EndedAt.Value - StartedAt : null;

    private void ValidateTransition(SessionStatusEnum targetStatus)
    {
        if (!ValidTransitions.TryGetValue(Status, out var allowed) || !allowed.Contains(targetStatus))
        {
            throw new InvalidOperationException(
                $"Cannot transition session from '{Status.ToValue()}' to '{targetStatus.ToValue()}'");
        }
    }
}
