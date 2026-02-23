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

        // Priority: client origin from the logout request
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
    /// <paramref name="postLogoutRedirectUri"/> and guards against circular
    /// redirects back to the identity server itself.
    /// Returns null when the origin is undetermined or unsafe to use.
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

        return clientOrigin;
    }
}
