using Clara.API.Application.Models;
using Clara.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Clara.API.Services;

/// <summary>
/// Computes analytics aggregates from the Clara sessions database.
/// All queries use SQL-level GroupBy projections — never loads full entities into memory.
/// </summary>
public sealed class AnalyticsService
{
    private readonly ClaraDbContext _dbContext;

    public AnalyticsService(ClaraDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AnalyticsOverviewResponse> GetOverviewAsync(
        string period,
        CancellationToken cancellationToken)
    {
        int days = ParsePeriodDays(period);
        DateTimeOffset currentStart = DateTimeOffset.UtcNow.AddDays(-days);
        DateTimeOffset previousStart = currentStart.AddDays(-days);

        // Current period
        var currentSessions = await _dbContext.Sessions
            .Where(session => session.StartedAt >= currentStart)
            .CountAsync(cancellationToken);

        var previousSessions = await _dbContext.Sessions
            .Where(session => session.StartedAt >= previousStart && session.StartedAt < currentStart)
            .CountAsync(cancellationToken);

        // AI drafts saved = suggestions count
        var currentDrafts = await _dbContext.Suggestions
            .Where(suggestion => suggestion.TriggeredAt >= currentStart)
            .CountAsync(cancellationToken);

        var previousDrafts = await _dbContext.Suggestions
            .Where(suggestion => suggestion.TriggeredAt >= previousStart && suggestion.TriggeredAt < currentStart)
            .CountAsync(cancellationToken);

        // Active providers (distinct DoctorId)
        var currentProviders = await _dbContext.Sessions
            .Where(session => session.StartedAt >= currentStart)
            .Select(session => session.DoctorId)
            .Distinct()
            .CountAsync(cancellationToken);

        var previousProviders = await _dbContext.Sessions
            .Where(session => session.StartedAt >= previousStart && session.StartedAt < currentStart)
            .Select(session => session.DoctorId)
            .Distinct()
            .CountAsync(cancellationToken);

        // Average session length (minutes) — only completed sessions with EndedAt.
        // Npgsql translates (EndedAt - StartedAt).TotalSeconds via EXTRACT(EPOCH FROM ...).
        var currentAvgMinutes = await GetAverageSessionMinutesAsync(
            _dbContext.Sessions.Where(session => session.StartedAt >= currentStart && session.EndedAt != null),
            cancellationToken);

        var previousAvgMinutes = await GetAverageSessionMinutesAsync(
            _dbContext.Sessions.Where(session => session.StartedAt >= previousStart && session.StartedAt < currentStart && session.EndedAt != null),
            cancellationToken);

        return new AnalyticsOverviewResponse
        {
            TotalSessions = currentSessions,
            SessionsTrend = CalculateTrend(previousSessions, currentSessions),
            AiDraftsSaved = currentDrafts,
            AiDraftsTrend = CalculateTrend(previousDrafts, currentDrafts),
            ActiveProviders = currentProviders,
            ActiveProvidersTrend = CalculateTrend(previousProviders, currentProviders),
            AvgSessionMinutes = currentAvgMinutes,
            AvgSessionTrend = CalculateTrend(previousAvgMinutes, currentAvgMinutes),
        };
    }

    public async Task<List<SessionVolumeEntry>> GetSessionVolumeAsync(
        int days,
        CancellationToken cancellationToken)
    {
        DateTimeOffset startDate = DateTimeOffset.UtcNow.Date.AddDays(-days + 1);

        var grouped = await _dbContext.Sessions
            .Where(session => session.StartedAt >= startDate)
            .GroupBy(session => session.StartedAt.Date)
            .Select(group => new { Date = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        // Fill missing days with zero
        var result = new List<SessionVolumeEntry>();
        for (int dayOffset = 0; dayOffset < days; dayOffset++)
        {
            var date = startDate.AddDays(dayOffset).DateTime;
            var match = grouped.FirstOrDefault(entry => entry.Date == date);
            result.Add(new SessionVolumeEntry
            {
                Date = date.ToString("yyyy-MM-dd"),
                SessionCount = match?.Count ?? 0,
            });
        }

        return result;
    }

    public async Task<List<SuggestionBreakdownEntry>> GetSuggestionBreakdownAsync(
        string period,
        CancellationToken cancellationToken)
    {
        int days = ParsePeriodDays(period);
        DateTimeOffset startDate = DateTimeOffset.UtcNow.AddDays(-days);

        var grouped = await _dbContext.Suggestions
            .Where(suggestion => suggestion.TriggeredAt >= startDate)
            .GroupBy(suggestion => suggestion.Type)
            .Select(group => new { Type = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        int total = grouped.Sum(entry => entry.Count);

        return grouped
            .OrderByDescending(entry => entry.Count)
            .Select(entry => new SuggestionBreakdownEntry
            {
                Type = entry.Type,
                Count = entry.Count,
                Percentage = total > 0 ? Math.Round(entry.Count * 100.0 / total, 1) : 0,
            })
            .ToList();
    }

    public async Task<List<ProviderLeaderboardEntry>> GetProviderLeaderboardAsync(
        string period,
        int limit,
        CancellationToken cancellationToken)
    {
        int days = ParsePeriodDays(period);
        DateTimeOffset startDate = DateTimeOffset.UtcNow.AddDays(-days);

        var leaderboard = await _dbContext.Sessions
            .Where(session => session.StartedAt >= startDate)
            .GroupBy(session => session.DoctorId)
            .Select(group => new
            {
                DoctorId = group.Key,
                SessionCount = group.Count(),
                SuggestionsSaved = group.SelectMany(session => session.Suggestions).Count(),
            })
            .OrderByDescending(entry => entry.SessionCount)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return leaderboard.Select(entry => new ProviderLeaderboardEntry
        {
            DoctorId = entry.DoctorId,
            // DoctorId is the Identity user ID — name resolution requires cross-service call.
            // Return ID for now; frontend can resolve or display "Provider {n}".
            DoctorName = $"Provider {entry.DoctorId[..Math.Min(8, entry.DoctorId.Length)]}",
            SessionCount = entry.SessionCount,
            SuggestionsSaved = entry.SuggestionsSaved,
            SaveRate = entry.SessionCount > 0
                ? Math.Round(entry.SuggestionsSaved * 100.0 / entry.SessionCount, 1)
                : 0,
        }).ToList();
    }

    /// <summary>
    /// Computes average session duration in minutes at the database level.
    /// Uses in-memory fallback for the subtraction since Npgsql does not translate
    /// TimeSpan arithmetic on DateTimeOffset to SQL. The query is still bounded by
    /// the caller's WHERE clause, so the result set is small.
    /// </summary>
    private static async Task<double> GetAverageSessionMinutesAsync(
        IQueryable<Domain.Session> sessionsQuery,
        CancellationToken cancellationToken)
    {
        var durations = await sessionsQuery
            .Select(session => new { session.StartedAt, EndedAt = session.EndedAt!.Value })
            .ToListAsync(cancellationToken);

        if (durations.Count == 0)
        {
            return 0;
        }

        var averageMinutes = durations
            .Average(session => (session.EndedAt - session.StartedAt).TotalMinutes);

        return Math.Round(averageMinutes, 1);
    }

    private static int ParsePeriodDays(string period)
    {
        // Supports "7d", "30d", "90d" format
        if (period.EndsWith('d') && int.TryParse(period[..^1], out int days))
        {
            return Math.Clamp(days, 1, 365);
        }
        return 30; // Default
    }

    private static double CalculateTrend(double previous, double current)
    {
        if (previous == 0)
        {
            return current > 0 ? 100 : 0;
        }
        return Math.Round((current - previous) / previous * 100, 1);
    }
}
