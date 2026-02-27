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
    /// </summary>
    public static IServiceCollection AddRateLimitingPolicies(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // On-demand suggestion: 1 request per 10 seconds per user
            // Prevents button-mashing and controls LLM API costs
            options.AddPolicy(Policies.Suggest, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context.User?.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 1,
                        Window = TimeSpan.FromSeconds(10),
                        QueueLimit = 0
                    }));

            // Session creation: 5 sessions per minute per user
            // Prevents session spam
            options.AddPolicy(Policies.SessionCreate, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context.User?.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 5,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0
                    }));
        });

        return services;
    }
}
