using MediTrack.ServiceDefaults.Middleware;

namespace Microsoft.AspNetCore.Builder;

/// <summary>
/// Extension methods for configuring security features in the application pipeline.
/// </summary>
public static class SecurityExtensions
{
    /// <summary>
    /// Adds security headers middleware to the application pipeline.
    /// Must be called early in the pipeline before response headers are written.
    /// </summary>
    /// <param name="app">The application builder.</param>
    /// <param name="contentSecurityPolicy">
    /// CSP directive string. Defaults to <see cref="SecurityHeadersMiddleware.ApiContentSecurityPolicy"/>
    /// (strict, JSON-only). Use <see cref="SecurityHeadersMiddleware.PagesContentSecurityPolicy"/>
    /// for services that serve HTML (e.g., Identity API with Razor Pages).
    /// </param>
    public static IApplicationBuilder UseSecurityHeaders(
        this IApplicationBuilder app,
        string contentSecurityPolicy = SecurityHeadersMiddleware.ApiContentSecurityPolicy)
    {
        return app.UseMiddleware<SecurityHeadersMiddleware>(contentSecurityPolicy);
    }

    /// <summary>
    /// Adds HSTS (HTTP Strict Transport Security) middleware for production environments.
    /// Should only be used when HTTPS is properly configured.
    /// </summary>
    public static IApplicationBuilder UseDefaultHsts(this IApplicationBuilder app)
    {
        return app.UseHsts();
    }
}
