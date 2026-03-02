using Clara.API.Application.Models;
using Clara.API.Services;
using MediTrack.Shared.Common;
using Microsoft.AspNetCore.Mvc;

namespace Clara.API.Apis;

/// <summary>
/// Minimal API endpoints for admin analytics/reports.
/// All endpoints are Admin-only and read from the Clara sessions database.
/// </summary>
public static class AnalyticsApi
{
    public static void MapAnalyticsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/analytics")
            .WithTags("Analytics")
            .RequireAuthorization(policy => policy.RequireRole(UserRoles.Admin));

        group.MapGet("/overview", GetOverview)
            .WithName("GetAnalyticsOverview")
            .WithSummary("Overview stats with trend percentages vs previous period");

        group.MapGet("/session-volume", GetSessionVolume)
            .WithName("GetSessionVolume")
            .WithSummary("Sessions grouped by day for chart display");

        group.MapGet("/suggestion-breakdown", GetSuggestionBreakdown)
            .WithName("GetSuggestionBreakdown")
            .WithSummary("AI suggestions grouped by type with counts and percentages");

        group.MapGet("/provider-leaderboard", GetProviderLeaderboard)
            .WithName("GetProviderLeaderboard")
            .WithSummary("Top providers ranked by session count");
    }

    private static async Task<IResult> GetOverview(
        [AsParameters] AnalyticsOverviewQuery query,
        AnalyticsService analyticsService,
        CancellationToken cancellationToken)
    {
        var result = await analyticsService.GetOverviewAsync(query.Period, cancellationToken);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetSessionVolume(
        [AsParameters] SessionVolumeQuery query,
        AnalyticsService analyticsService,
        CancellationToken cancellationToken)
    {
        var result = await analyticsService.GetSessionVolumeAsync(query.Days, cancellationToken);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetSuggestionBreakdown(
        [AsParameters] SuggestionBreakdownQuery query,
        AnalyticsService analyticsService,
        CancellationToken cancellationToken)
    {
        var result = await analyticsService.GetSuggestionBreakdownAsync(query.Period, cancellationToken);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetProviderLeaderboard(
        [AsParameters] ProviderLeaderboardQuery query,
        AnalyticsService analyticsService,
        CancellationToken cancellationToken)
    {
        var result = await analyticsService.GetProviderLeaderboardAsync(
            query.Period, query.Limit, cancellationToken);
        return Results.Ok(result);
    }
}
