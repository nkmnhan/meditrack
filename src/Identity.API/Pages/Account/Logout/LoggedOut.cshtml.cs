using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace MediTrack.Identity.Pages.Account.Logout;

[AllowAnonymous]
public class LoggedOut : PageModel
{
    public LoggedOutViewModel View { get; set; } = default!;

    public IActionResult OnGet(
        string? postLogoutRedirectUri,
        string? clientName,
        string? signOutIframeUrl)
    {
        View = new LoggedOutViewModel
        {
            PostLogoutRedirectUri = postLogoutRedirectUri,
            ClientName = clientName,
            SignOutIframeUrl = signOutIframeUrl,
            AutomaticRedirectAfterSignOut = true
        };

        return Page();
    }
}
