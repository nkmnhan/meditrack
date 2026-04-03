namespace Clara.API.Domain;

/// <summary>Session lifecycle states.</summary>
public enum SessionStatusEnum { Active, Paused, Completed, Cancelled }

/// <summary>AI suggestion category types.</summary>
public enum SuggestionTypeEnum { Clinical, Medication, FollowUp, Differential }

/// <summary>Clinical urgency levels for suggestions.</summary>
public enum SuggestionUrgencyEnum { Low, Medium, High }

/// <summary>How a suggestion was triggered.</summary>
public enum SuggestionSourceEnum { Batch, OnDemand, DevForce }

/// <summary>
/// Bidirectional string converters for all domain enums.
/// Database stores lowercase/snake_case strings; these methods translate at the boundary.
/// </summary>
public static class EnumConversions
{
    // ─── SessionStatusEnum ───────────────────────────────────────────────────

    private static readonly Dictionary<SessionStatusEnum, string> SessionStatusValues = new()
    {
        [SessionStatusEnum.Active]    = "active",
        [SessionStatusEnum.Paused]    = "paused",
        [SessionStatusEnum.Completed] = "completed",
        [SessionStatusEnum.Cancelled] = "cancelled"
    };

    private static readonly Dictionary<string, SessionStatusEnum> SessionStatusByValue =
        BuildReverseMap(SessionStatusValues);

    /// <summary>Returns the canonical lowercase DB string for the given session status.</summary>
    public static string ToValue(this SessionStatusEnum status) => SessionStatusValues[status];

    /// <summary>
    /// Parses a DB string back to <see cref="SessionStatusEnum"/>.
    /// Returns <see cref="SessionStatusEnum.Active"/> for unrecognised values (safe default).
    /// </summary>
    public static SessionStatusEnum ParseSessionStatus(string value) =>
        SessionStatusByValue.TryGetValue(value, out var parsed) ? parsed : SessionStatusEnum.Active;

    // ─── SuggestionTypeEnum ──────────────────────────────────────────────────

    private static readonly Dictionary<SuggestionTypeEnum, string> SuggestionTypeValues = new()
    {
        [SuggestionTypeEnum.Clinical]     = "clinical",
        [SuggestionTypeEnum.Medication]   = "medication",
        [SuggestionTypeEnum.FollowUp]     = "follow_up",
        [SuggestionTypeEnum.Differential] = "differential"
    };

    private static readonly Dictionary<string, SuggestionTypeEnum> SuggestionTypeByValue =
        BuildReverseMap(SuggestionTypeValues);

    /// <summary>Returns the canonical snake_case DB string for the given suggestion type.</summary>
    public static string ToValue(this SuggestionTypeEnum type) => SuggestionTypeValues[type];

    /// <summary>
    /// Parses a DB string back to <see cref="SuggestionTypeEnum"/>.
    /// Returns <see cref="SuggestionTypeEnum.Clinical"/> for unrecognised values (safe default).
    /// </summary>
    public static SuggestionTypeEnum ParseSuggestionType(string value) =>
        SuggestionTypeByValue.TryGetValue(value, out var parsed) ? parsed : SuggestionTypeEnum.Clinical;

    // ─── SuggestionUrgencyEnum ───────────────────────────────────────────────

    private static readonly Dictionary<SuggestionUrgencyEnum, string> SuggestionUrgencyValues = new()
    {
        [SuggestionUrgencyEnum.Low]    = "low",
        [SuggestionUrgencyEnum.Medium] = "medium",
        [SuggestionUrgencyEnum.High]   = "high"
    };

    private static readonly Dictionary<string, SuggestionUrgencyEnum> SuggestionUrgencyByValue =
        BuildReverseMap(SuggestionUrgencyValues);

    /// <summary>Returns the canonical lowercase DB string for the given urgency level.</summary>
    public static string ToValue(this SuggestionUrgencyEnum urgency) => SuggestionUrgencyValues[urgency];

    /// <summary>
    /// Parses a DB string back to <see cref="SuggestionUrgencyEnum"/>.
    /// Returns <see cref="SuggestionUrgencyEnum.Medium"/> for unrecognised values (safe default).
    /// </summary>
    public static SuggestionUrgencyEnum ParseSuggestionUrgency(string value) =>
        SuggestionUrgencyByValue.TryGetValue(value, out var parsed) ? parsed : SuggestionUrgencyEnum.Medium;

    // ─── SuggestionSourceEnum ────────────────────────────────────────────────

    private static readonly Dictionary<SuggestionSourceEnum, string> SuggestionSourceValues = new()
    {
        [SuggestionSourceEnum.Batch]    = "batch",
        [SuggestionSourceEnum.OnDemand] = "on_demand",
        [SuggestionSourceEnum.DevForce] = "dev_force"
    };

    private static readonly Dictionary<string, SuggestionSourceEnum> SuggestionSourceByValue =
        BuildReverseMap(SuggestionSourceValues);

    /// <summary>Returns the canonical snake_case DB string for the given suggestion source.</summary>
    public static string ToValue(this SuggestionSourceEnum source) => SuggestionSourceValues[source];

    /// <summary>
    /// Parses a DB string back to <see cref="SuggestionSourceEnum"/>.
    /// Returns <see cref="SuggestionSourceEnum.Batch"/> for unrecognised values (safe default).
    /// </summary>
    public static SuggestionSourceEnum ParseSuggestionSource(string value) =>
        SuggestionSourceByValue.TryGetValue(value, out var parsed) ? parsed : SuggestionSourceEnum.Batch;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Builds a case-insensitive reverse lookup from value string → enum member.
    /// The forward map is the single source of truth for all string values.
    /// </summary>
    private static Dictionary<string, TEnum> BuildReverseMap<TEnum>(Dictionary<TEnum, string> forward)
        where TEnum : struct, Enum
    {
        var result = new Dictionary<string, TEnum>(forward.Count, StringComparer.OrdinalIgnoreCase);
        foreach (var entry in forward)
        {
            result[entry.Value] = entry.Key;
        }
        return result;
    }
}
