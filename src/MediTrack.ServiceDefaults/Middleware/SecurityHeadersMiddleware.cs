using Microsoft.AspNetCore.Http;

namespace MediTrack.ServiceDefaults.Middleware;

/// <summary>
/// Middleware that adds security headers to all HTTP responses.
/// Protects against common web vulnerabilities (OWASP A05).
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string _contentSecurityPolicy;

    /// <summary>
    /// Default CSP for pure API services (JSON-only, no HTML).
    /// </summary>
    public const string ApiContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'";

    /// <summary>
    /// CSP for services that serve HTML pages (e.g., Identity API with Razor Pages).
    /// Allows same-origin styles, scripts, images, fonts, and form submissions.
    /// </summary>
    public const string PagesContentSecurityPolicy =
        "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'";

    public SecurityHeadersMiddleware(RequestDelegate next, string contentSecurityPolicy)
    {
        _next = next;
        _contentSecurityPolicy = contentSecurityPolicy;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // X-Content-Type-Options: Prevents MIME-sniffing attacks
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";

        // X-Frame-Options: Prevents clickjacking attacks
        context.Response.Headers["X-Frame-Options"] = "DENY";

        // Referrer-Policy: Controls referrer information sent in requests
        context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

        // Content-Security-Policy: per-service policy
        context.Response.Headers["Content-Security-Policy"] = _contentSecurityPolicy;

        // Strict-Transport-Security: Enforces HTTPS for all future requests
        context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";

        await _next(context);
    }
}
