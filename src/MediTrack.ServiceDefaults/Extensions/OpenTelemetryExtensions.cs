using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace MediTrack.ServiceDefaults.Extensions;

public static class OpenTelemetryExtensions
{
    public static IServiceCollection AddDefaultOpenTelemetry(
        this IServiceCollection services,
        string serviceName)
    {
        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(serviceName))
            .WithTracing(tracing =>
            {
                tracing
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation();
            })
            .WithMetrics(metrics =>
            {
                metrics
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation();
            })
            .UseOtlpExporter();

        services.AddLogging(logging =>
        {
            logging.AddOpenTelemetry(openTelemetryLogOptions =>
            {
                openTelemetryLogOptions.IncludeFormattedMessage = true;
                openTelemetryLogOptions.IncludeScopes = true;
            });
        });

        return services;
    }
}
