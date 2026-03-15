namespace Clara.API.Application.Models;

/// <summary>
/// Overview statistics for the admin reports dashboard.
/// </summary>
public sealed record AnalyticsOverviewResponse
{
    public required int TotalSessions { get; init; }
    public required double SessionsTrend { get; init; }
    public required int AiDraftsSaved { get; init; }
    public required double AiDraftsTrend { get; init; }
    public required int ActiveProviders { get; init; }
    public required double ActiveProvidersTrend { get; init; }
    public required double AvgSessionMinutes { get; init; }
    public required double AvgSessionTrend { get; init; }
}

public sealed record AnalyticsOverviewQuery(string Period = "30d");

/// <summary>
/// Daily session volume for bar/line charts.
/// </summary>
public sealed record SessionVolumeEntry
{
    public required string Date { get; init; }
    public required int SessionCount { get; init; }
}

public sealed record SessionVolumeQuery(int Days = 7);

/// <summary>
/// AI suggestion counts grouped by type.
/// </summary>
public sealed record SuggestionBreakdownEntry
{
    public required string Type { get; init; }
    public required int Count { get; init; }
    public required double Percentage { get; init; }
}

public sealed record SuggestionBreakdownQuery(string Period = "30d");

/// <summary>
/// Top providers ranked by session count.
/// </summary>
public sealed record ProviderLeaderboardEntry
{
    public required string DoctorId { get; init; }
    public required string DoctorName { get; init; }
    public required int SessionCount { get; init; }
    public required int SuggestionsSaved { get; init; }
    public required double SaveRate { get; init; }
}

public sealed record ProviderLeaderboardQuery(string Period = "30d", int Limit = 5);
