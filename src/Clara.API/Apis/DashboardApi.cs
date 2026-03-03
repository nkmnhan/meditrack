using Clara.API.Services;
using MediTrack.Shared.Common;

namespace Clara.API.Apis;

/// <summary>
/// Dashboard aggregator endpoint — single call returning overview from all services.
/// </summary>
public static class DashboardApi
{
    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/dashboard")
            .WithTags("Dashboard")
            .RequireAuthorization(policy => policy.RequireRole(UserRoles.Admin));

        group.MapGet("/overview", GetOverview)
            .WithName("GetDashboardOverview")
            .WithSummary("Aggregated dashboard overview — patients, appointments, Clara sessions, users, system status");
    }

    private static async Task<IResult> GetOverview(
        DashboardAggregatorService aggregatorService,
        CancellationToken cancellationToken)
    {
        var overview = await aggregatorService.GetOverviewAsync(cancellationToken);
        return Results.Ok(overview);
    }
}
