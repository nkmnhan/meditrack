using System.Text.Json;
using MediTrack.ServiceDefaults.Extensions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace MediTrack.ServiceDefaults;

public static class ServiceDefaultsExtensions
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public static WebApplicationBuilder AddServiceDefaults(
        this WebApplicationBuilder builder,
        string serviceName)
    {
        builder.Services.AddDefaultHealthChecks();
        builder.Services.AddDefaultOpenTelemetry(serviceName);
        builder.Services.AddDefaultResponseCompression();

        return builder;
    }

    public static WebApplication MapDefaultEndpoints(this WebApplication app)
    {
        app.UseResponseCompression();

        app.MapHealthChecks("/health", new HealthCheckOptions
        {
            Predicate = _ => true
        });

        app.MapHealthChecks("/health/live", new HealthCheckOptions
        {
            Predicate = healthCheck => healthCheck.Tags.Contains("live")
        });

        // Detailed JSON health check endpoint for monitoring dashboard
        app.MapHealthChecks("/health/details", new HealthCheckOptions
        {
            Predicate = _ => true,
            ResponseWriter = WriteDetailedHealthResponse
        });

        return app;
    }

    private static async Task WriteDetailedHealthResponse(HttpContext httpContext, HealthReport report)
    {
        httpContext.Response.ContentType = "application/json";

        var response = new
        {
            status = report.Status.ToString(),
            totalDurationMs = (int)report.TotalDuration.TotalMilliseconds,
            checks = report.Entries.Select(entry => new
            {
                name = entry.Key,
                status = entry.Value.Status.ToString(),
                durationMs = (int)entry.Value.Duration.TotalMilliseconds,
                description = entry.Value.Description,
                tags = entry.Value.Tags.ToArray(),
                exception = entry.Value.Exception?.Message
            })
        };

        await httpContext.Response.WriteAsJsonAsync(response, JsonOptions);
    }
}
