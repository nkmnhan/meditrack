using Appointment.API.Services;
using MediTrack.Shared.Common;

namespace Appointment.API.Apis;

public static class AdminAnalyticsApi
{
    public static void MapAppointmentAnalyticsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/analytics")
            .WithTags("AdminAnalytics")
            .RequireAuthorization(policy => policy.RequireRole(UserRoles.Admin));

        group.MapGet("/volume", GetVolume)
            .WithName("GetAppointmentVolume")
            .WithSummary("Daily appointment counts by status (stacked bar chart)");

        group.MapGet("/status-distribution", GetStatusDistribution)
            .WithName("GetAppointmentStatusDistribution")
            .WithSummary("Appointment count per status (pie chart)");

        group.MapGet("/type-distribution", GetTypeDistribution)
            .WithName("GetAppointmentTypeDistribution")
            .WithSummary("Appointment count per type (pie chart)");

        group.MapGet("/busiest-hours", GetBusiestHours)
            .WithName("GetAppointmentBusiestHours")
            .WithSummary("Appointment count by hour 0-23 (heatmap)");
    }

    private static async Task<IResult> GetVolume(
        int? days,
        AppointmentAnalyticsService analyticsService,
        CancellationToken cancellationToken)
    {
        var volume = await analyticsService.GetVolumeAsync(days ?? 30, cancellationToken);
        return Results.Ok(volume);
    }

    private static async Task<IResult> GetStatusDistribution(
        int? days,
        AppointmentAnalyticsService analyticsService,
        CancellationToken cancellationToken)
    {
        var distribution = await analyticsService.GetStatusDistributionAsync(days ?? 30, cancellationToken);
        return Results.Ok(distribution);
    }

    private static async Task<IResult> GetTypeDistribution(
        int? days,
        AppointmentAnalyticsService analyticsService,
        CancellationToken cancellationToken)
    {
        var distribution = await analyticsService.GetTypeDistributionAsync(days ?? 30, cancellationToken);
        return Results.Ok(distribution);
    }

    private static async Task<IResult> GetBusiestHours(
        int? days,
        AppointmentAnalyticsService analyticsService,
        CancellationToken cancellationToken)
    {
        var busiestHours = await analyticsService.GetBusiestHoursAsync(days ?? 30, cancellationToken);
        return Results.Ok(busiestHours);
    }

    private static int ParseDays(string? period) => period switch
    {
        "7d" => 7,
        "30d" => 30,
        "90d" => 90,
        _ => 30
    };
}
