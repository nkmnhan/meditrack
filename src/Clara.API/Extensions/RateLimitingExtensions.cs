using System.Threading.RateLimiting;

namespace Clara.API.Extensions;

/// <summary>
/// Rate limiting extension methods to prevent abuse and cost overruns on AI endpoints.
/// </summary>
public static class RateLimitingExtensions
{
    /// <summary>
    /// Rate limiter policy names.
    /// </summary>
    public static class Policies
    {
        /// <summary>
        /// Limits on-demand suggestion requests to prevent API cost abuse.
        /// </summary>
        public const string Suggest = "suggest";

        /// <summary>
        /// Limits session creation to prevent resource exhaustion.
        /// </summary>
        public const string SessionCreate = "session_create";
    }

    /// <summary>
    /// Adds rate limiting policies for AI endpoints.
    /// Limits are relaxed in Development to allow E2E and integration tests to run
    /// multiple session creation calls without hitting the production rate limit.
    /// </summary>
    public static IServiceCollection AddRateLimitingPolicies(
        this IServiceCollection services,
        IHostEnvironment environment)
    {
        var isDevelopment = environment.IsDevelopment();

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // On-demand suggestion: 1 request per 10 seconds per user in production.
            // Relaxed in development to 60 per minute to unblock E2E tests.
            options.AddPolicy(Policies.Suggest, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context.User?.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = isDevelopment ? 60 : 1,
                        Window = isDevelopment ? TimeSpan.FromMinutes(1) : TimeSpan.FromSeconds(10),
                        QueueLimit = 0
                    }));

            // Session creation: 5 per minute per user in production.
            // Relaxed in development to 60 per minute to unblock E2E tests that
            // create multiple sessions across test runs within the same rate-limit window.
            options.AddPolicy(Policies.SessionCreate, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context.User?.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = isDevelopment ? 60 : 5,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0
                    }));
        });

        return services;
    }
}
