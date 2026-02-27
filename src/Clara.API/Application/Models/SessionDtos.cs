namespace Clara.API.Application.Models;

/// <summary>
/// Request to start a new clinical session.
/// </summary>
public sealed record StartSessionRequest
{
    /// <summary>
    /// Optional patient ID from Patient.API. Sessions can be started without a patient.
    /// </summary>
    public string? PatientId { get; init; }
    
    /// <summary>
    /// Whether to enable audio recording for this session.
    /// </summary>
    public bool AudioRecorded { get; init; } = true;
}

/// <summary>
/// Response containing session details.
/// </summary>
public sealed record SessionResponse
{
    public required Guid Id { get; init; }
    public required string DoctorId { get; init; }
    public string? PatientId { get; init; }
    public required DateTimeOffset StartedAt { get; init; }
    public DateTimeOffset? EndedAt { get; init; }
    public required string Status { get; init; }
    public bool AudioRecorded { get; init; }
    public IReadOnlyList<TranscriptLineResponse> TranscriptLines { get; init; } = [];
    public IReadOnlyList<SuggestionResponse> Suggestions { get; init; } = [];
}

/// <summary>
/// Transcript line response for API output.
/// </summary>
public sealed record TranscriptLineResponse
{
    public required Guid Id { get; init; }
    public required string Speaker { get; init; }
    public required string Text { get; init; }
    public required DateTimeOffset Timestamp { get; init; }
    public float? Confidence { get; init; }
}

/// <summary>
/// Suggestion response for API output.
/// </summary>
public sealed record SuggestionResponse
{
    public required Guid Id { get; init; }
    public required string Content { get; init; }
    public required DateTimeOffset TriggeredAt { get; init; }
    public required string Type { get; init; }
    public required string Source { get; init; }
    public string? Urgency { get; init; }
}
