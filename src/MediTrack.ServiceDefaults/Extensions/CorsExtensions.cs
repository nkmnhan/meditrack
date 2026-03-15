using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace MediTrack.ServiceDefaults.Extensions;

public static class CorsExtensions
{
    public const string PolicyName = "AllowFrontend";

    /// <summary>
    /// Adds CORS policy that allows the frontend origin.
    /// Reads "WebClientUrl" from configuration, falls back to https://localhost:3000 in development.
    /// </summary>
    public static IServiceCollection AddDefaultCors(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var webClientUrl = configuration["WebClientUrl"];

        if (string.IsNullOrEmpty(webClientUrl) && environment.IsDevelopment())
        {
            webClientUrl = "https://localhost:3000";
        }

        services.AddCors(options =>
        {
            options.AddPolicy(PolicyName, policy =>
            {
                if (!string.IsNullOrEmpty(webClientUrl))
                {
                    policy.WithOrigins(webClientUrl.TrimEnd('/'));
                }

                policy
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials();
            });
        });

        return services;
    }
}
