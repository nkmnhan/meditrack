namespace MediTrack.Identity.Pages.Account.Logout;

public class LoggedOutViewModel
{
    public string? PostLogoutRedirectUri { get; set; }
    public string? ClientName { get; set; }
    public string? SignOutIframeUrl { get; set; }
    public bool AutomaticRedirectAfterSignOut { get; set; } = true;

    /// <summary>
    /// The client application's origin (scheme + host + port) derived from
    /// PostLogoutRedirectUri. Used as the auto-redirect target so the user
    /// lands on the app's home page rather than a sign-out callback route.
    /// Null when the origin cannot be determined or would point back at the
    /// identity server itself (circular redirect guard).
    /// </summary>
    public string? ClientOrigin { get; set; }

    /// <summary>
    /// The resolved auto-redirect destination for the countdown timer.
    /// Priority: ClientOrigin → WebClientUrl config → "/Account/Login".
    /// </summary>
    public string AutoRedirectTarget { get; set; } = "/Account/Login";
}
