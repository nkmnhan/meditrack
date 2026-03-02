using MediTrack.ServiceDefaults.Extensions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.DependencyInjection;

namespace MediTrack.ServiceDefaults;

public static class ServiceDefaultsExtensions
{
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

        return app;
    }
}
