using MediTrack.Identity.Data;
using MediTrack.Shared.Common;
using Microsoft.EntityFrameworkCore;

namespace MediTrack.Identity.Apis;

public static class AdminAnalyticsApi
{
    public static void MapIdentityAnalyticsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/analytics")
            .WithTags("AdminAnalytics")
            .RequireAuthorization(policy => policy.RequireRole(UserRoles.Admin));

        group.MapGet("/login-activity", GetLoginActivity)
            .WithName("GetLoginActivity")
            .WithSummary("Daily login and unique user counts");

        group.MapGet("/user-stats", GetUserStats)
            .WithName("GetUserStats")
            .WithSummary("Total users, active in 30d, by role");
    }

    private static async Task<IResult> GetLoginActivity(
        int? days,
        ApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var periodDays = days ?? 30;
        var startDate = DateTimeOffset.UtcNow.AddDays(-periodDays);

        // Project login dates at SQL level, then group in memory.
        // Npgsql cannot translate .Date inside GroupBy on DateTimeOffset.
        var loginDates = await dbContext.Users
            .Where(user => user.LastLoginAt != null && user.LastLoginAt >= startDate)
            .Select(user => user.LastLoginAt!.Value)
            .ToListAsync(cancellationToken);

        var loginsByDate = loginDates
            .GroupBy(loginAt => loginAt.Date)
            .ToDictionary(
                group => group.Key,
                group => group.Count());

        // Fill in missing dates
        var result = Enumerable.Range(0, periodDays)
            .Select(offset => startDate.AddDays(offset).Date)
            .Select(date => new
            {
                date = date.ToString("yyyy-MM-dd"),
                uniqueUsers = loginsByDate.GetValueOrDefault(date, 0)
            });

        return Results.Ok(result);
    }

    private static async Task<IResult> GetUserStats(
        ApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var thirtyDaysAgo = DateTimeOffset.UtcNow.AddDays(-30);

        var totalUsers = await dbContext.Users.CountAsync(cancellationToken);

        var activeUsersLast30Days = await dbContext.Users
            .CountAsync(user => user.LastLoginAt != null && user.LastLoginAt >= thirtyDaysAgo,
                cancellationToken);

        // Users by role
        var usersByRole = await dbContext.UserRoles
            .Join(dbContext.Roles,
                userRole => userRole.RoleId,
                role => role.Id,
                (userRole, role) => new { role.Name })
            .GroupBy(entry => entry.Name!)
            .Select(group => new
            {
                role = group.Key,
                count = group.Count()
            })
            .OrderByDescending(entry => entry.count)
            .ToListAsync(cancellationToken);

        return Results.Ok(new
        {
            totalUsers,
            activeUsersLast30Days,
            usersByRole
        });
    }
}
