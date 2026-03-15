using MediTrack.Shared.Common;
using Patient.API.Services;

namespace Patient.API.Apis;

public static class AdminAnalyticsApi
{
    public static void MapPatientAnalyticsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/analytics")
            .WithTags("AdminAnalytics")
            .RequireAuthorization(policy => policy.RequireRole(UserRoles.Admin));

        group.MapGet("/registration-trends", GetRegistrationTrends)
            .WithName("GetPatientRegistrationTrends")
            .WithSummary("Daily patient registration counts over a period");

        group.MapGet("/demographics", GetDemographics)
            .WithName("GetPatientDemographics")
            .WithSummary("Patient demographics breakdown — gender, age, active/inactive");
    }

    private static async Task<IResult> GetRegistrationTrends(
        int? days,
        PatientAnalyticsService analyticsService,
        CancellationToken cancellationToken)
    {
        var trends = await analyticsService.GetRegistrationTrendsAsync(
            days ?? 30, cancellationToken);
        return Results.Ok(trends);
    }

    private static async Task<IResult> GetDemographics(
        PatientAnalyticsService analyticsService,
        CancellationToken cancellationToken)
    {
        var demographics = await analyticsService.GetDemographicsAsync(cancellationToken);
        return Results.Ok(demographics);
    }
}
