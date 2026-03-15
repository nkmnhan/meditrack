using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace MediTrack.Identity.Pages.Account.Logout;

[AllowAnonymous]
public class LoggedOut : PageModel
{
    private readonly IConfiguration _configuration;

    public LoggedOut(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public LoggedOutViewModel View { get; set; } = default!;

    public IActionResult OnGet(
        string? postLogoutRedirectUri,
        string? clientName,
        string? signOutIframeUrl)
    {
        var clientOrigin = ResolveClientOrigin(postLogoutRedirectUri);

        // Priority: client origin from the logout request (if valid)
        //         → WebClientUrl from configuration (the SPA home page)
        //         → identity server's own login page as absolute last resort
        var webClientUrl = _configuration["WebClientUrl"];
        var autoRedirectTarget = clientOrigin ?? webClientUrl ?? "/Account/Login";

        View = new LoggedOutViewModel
        {
            PostLogoutRedirectUri = postLogoutRedirectUri,
            ClientName = clientName,
            SignOutIframeUrl = signOutIframeUrl,
            AutomaticRedirectAfterSignOut = true,
            ClientOrigin = clientOrigin,
            AutoRedirectTarget = autoRedirectTarget
        };

        return Page();
    }

    /// <summary>
    /// Extracts the client application's origin (scheme + host + port) from
    /// <paramref name="postLogoutRedirectUri"/> and guards against open redirect attacks.
    /// Returns null when the URI is invalid, not on the allowlist, or would redirect back
    /// to the identity server itself.
    /// (OWASP A01 - Broken Access Control: Open Redirect Prevention)
    /// </summary>
    private string? ResolveClientOrigin(string? postLogoutRedirectUri)
    {
        if (string.IsNullOrEmpty(postLogoutRedirectUri))
        {
            return null;
        }

        if (!Uri.TryCreate(postLogoutRedirectUri, UriKind.Absolute, out var parsedUri))
        {
            return null;
        }

        // e.g. "https://localhost:5001" — the identity server's own origin
        var identityServerOrigin = $"{Request.Scheme}://{Request.Host}";

        // e.g. "https://localhost:3000/signout-callback-oidc" → "https://localhost:3000"
        var clientOrigin = $"{parsedUri.Scheme}://{parsedUri.Authority}";

        // Reject if the client origin is the identity server itself — redirecting
        // there would send the user back to a page that may trigger another logout.
        if (clientOrigin.Equals(identityServerOrigin, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        // OWASP A01: Validate against allowlist of known client origins
        // Only allow redirects to the configured WebClientUrl origin
        var allowedOrigin = _configuration["WebClientUrl"];
        if (!string.IsNullOrEmpty(allowedOrigin) &&
            Uri.TryCreate(allowedOrigin, UriKind.Absolute, out var allowedUri))
        {
            var allowedOriginNormalized = $"{allowedUri.Scheme}://{allowedUri.Authority}";
            if (!clientOrigin.Equals(allowedOriginNormalized, StringComparison.OrdinalIgnoreCase))
            {
                // Attempted redirect to non-allowlisted origin — reject
                return null;
            }
        }
        else
        {
            // No valid allowlist configured — reject all external redirects for safety
            return null;
        }

        return clientOrigin;
    }
}
