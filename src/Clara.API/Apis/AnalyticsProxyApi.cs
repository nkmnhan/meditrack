using System.Text.Json;
using MediTrack.Shared.Common;

namespace Clara.API.Apis;

/// <summary>
/// Proxies analytics requests from the frontend to downstream microservices.
/// Clara.API acts as the admin gateway — frontend only calls one base URL.
/// </summary>
public static class AnalyticsProxyApi
{
    public static void MapAnalyticsProxyEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin")
            .WithTags("AnalyticsProxy")
            .RequireAuthorization(policy => policy.RequireRole(UserRoles.Admin));

        // Patient analytics
        group.MapGet("/patient/registration-trends", (int? days, HttpContext httpContext, IHttpClientFactory factory, IConfiguration config, CancellationToken ct) =>
            ProxyGet(httpContext, factory, config, "PatientApi", "https://patient-api:8443",
                $"/api/admin/analytics/registration-trends?days={days ?? 30}", ct));

        group.MapGet("/patient/demographics", (HttpContext httpContext, IHttpClientFactory factory, IConfiguration config, CancellationToken ct) =>
            ProxyGet(httpContext, factory, config, "PatientApi", "https://patient-api:8443",
                "/api/admin/analytics/demographics", ct));

        // Appointment analytics
        group.MapGet("/appointment/volume", (int? days, HttpContext httpContext, IHttpClientFactory factory, IConfiguration config, CancellationToken ct) =>
            ProxyGet(httpContext, factory, config, "AppointmentApi", "https://appointment-api:8443",
                $"/api/admin/analytics/volume?days={days ?? 30}", ct));

        group.MapGet("/appointment/status-distribution", (int? days, HttpContext httpContext, IHttpClientFactory factory, IConfiguration config, CancellationToken ct) =>
            ProxyGet(httpContext, factory, config, "AppointmentApi", "https://appointment-api:8443",
                $"/api/admin/analytics/status-distribution?days={days ?? 30}", ct));

        group.MapGet("/appointment/type-distribution", (int? days, HttpContext httpContext, IHttpClientFactory factory, IConfiguration config, CancellationToken ct) =>
            ProxyGet(httpContext, factory, config, "AppointmentApi", "https://appointment-api:8443",
                $"/api/admin/analytics/type-distribution?days={days ?? 30}", ct));

        group.MapGet("/appointment/busiest-hours", (int? days, HttpContext httpContext, IHttpClientFactory factory, IConfiguration config, CancellationToken ct) =>
            ProxyGet(httpContext, factory, config, "AppointmentApi", "https://appointment-api:8443",
                $"/api/admin/analytics/busiest-hours?days={days ?? 30}", ct));

        // Identity analytics
        group.MapGet("/identity/login-activity", (int? days, HttpContext httpContext, IHttpClientFactory factory, IConfiguration config, CancellationToken ct) =>
            ProxyGet(httpContext, factory, config, "IdentityApi", "https://identity-api:8443",
                $"/api/admin/analytics/login-activity?days={days ?? 30}", ct));

        group.MapGet("/identity/user-stats", (HttpContext httpContext, IHttpClientFactory factory, IConfiguration config, CancellationToken ct) =>
            ProxyGet(httpContext, factory, config, "IdentityApi", "https://identity-api:8443",
                "/api/admin/analytics/user-stats", ct));
    }

    private static async Task<IResult> ProxyGet(
        HttpContext httpContext,
        IHttpClientFactory factory,
        IConfiguration config,
        string configKey,
        string defaultUrl,
        string path,
        CancellationToken cancellationToken)
    {
        try
        {
            var httpClient = factory.CreateClient("HealthCheck");
            var baseUrl = config[$"Services:{configKey}"] ?? defaultUrl;
            var url = $"{baseUrl.TrimEnd('/')}{path}";

            // Forward the caller's Bearer token to the downstream service
            var authHeader = httpContext.Request.Headers.Authorization.ToString();
            if (!string.IsNullOrEmpty(authHeader))
            {
                httpClient.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", authHeader);
            }

            var response = await httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return Results.StatusCode((int)response.StatusCode);
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
            return Results.Ok(json);
        }
        catch (Exception)
        {
            return Results.StatusCode(502);
        }
    }
}
