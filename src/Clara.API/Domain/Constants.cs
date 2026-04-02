namespace Clara.API.Domain;

/// <summary>
/// Speaker role constants — used across SessionHub, SpeakerDetection, BatchTrigger.
/// </summary>
public static class SpeakerRole
{
    public const string Doctor = "Doctor";
    public const string Patient = "Patient";
}

/// <summary>
/// Suggestion source constants — internal routing labels, not shown to users.
/// </summary>
public static class SuggestionSources
{
    public const string Batch = "batch";
    public const string OnDemand = "on_demand";
    public const string DevForce = "dev_force";
}

/// <summary>
/// Suggestion type constants — whitelisted values from LLM output.
/// </summary>
public static class SuggestionType
{
    public const string Clinical = "clinical";
    public const string Medication = "medication";
    public const string FollowUp = "follow_up";
    public const string Differential = "differential";

    public static readonly string[] All = [Clinical, Medication, FollowUp, Differential];
}

/// <summary>
/// Suggestion urgency constants — whitelisted values from LLM output.
/// </summary>
public static class SuggestionUrgency
{
    public const string Low = "low";
    public const string Medium = "medium";
    public const string High = "high";

    public static readonly string[] All = [Low, Medium, High];
}

/// <summary>
/// Session status constants.
/// </summary>
public static class SessionStatus
{
    public const string Active = "active";
    public const string Paused = "paused";
    public const string Completed = "completed";
    public const string Cancelled = "cancelled";
}

