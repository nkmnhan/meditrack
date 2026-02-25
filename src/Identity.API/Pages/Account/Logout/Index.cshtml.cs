using Duende.IdentityServer.Events;
using Duende.IdentityServer.Extensions;
using Duende.IdentityServer.Services;
using MediTrack.Identity.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace MediTrack.Identity.Pages.Account.Logout;

[AllowAnonymous]
public class Index : PageModel
{
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IIdentityServerInteractionService _interaction;
    private readonly IEventService _events;

    public LogoutViewModel View { get; set; } = default!;

    [BindProperty]
    public string? LogoutId { get; set; }

    public Index(
        SignInManager<ApplicationUser> signInManager,
        IIdentityServerInteractionService interaction,
        IEventService events)
    {
        _signInManager = signInManager;
        _interaction = interaction;
        _events = events;
    }

    public async Task<IActionResult> OnGet(string? logoutId)
    {
        LogoutId = logoutId;

        if (User.Identity?.IsAuthenticated != true)
        {
            // Already signed out — skip prompt, go straight to LoggedOut page
            return await OnPost();
        }

        // Always show the logout confirmation so the user sees a clear sign-out page
        // (even when id_token_hint is provided and Duende would skip the prompt)
        View = new LogoutViewModel { LogoutId = logoutId, ShowLogoutPrompt = true };
        return Page();
    }

    public async Task<IActionResult> OnPost()
    {
        var logoutContext = await _interaction.GetLogoutContextAsync(LogoutId);

        if (User.Identity?.IsAuthenticated == true)
        {
            await _signInManager.SignOutAsync();

            string? subjectId = HttpContext.User.GetSubjectId();
            string? displayName = HttpContext.User.GetDisplayName();

            await _events.RaiseAsync(new UserLogoutSuccessEvent(subjectId, displayName));
        }

        var viewModel = new LoggedOutViewModel
        {
            AutomaticRedirectAfterSignOut = true,
            PostLogoutRedirectUri = logoutContext.PostLogoutRedirectUri,
            ClientName = string.IsNullOrEmpty(logoutContext.ClientName)
                ? logoutContext.ClientId
                : logoutContext.ClientName,
            SignOutIframeUrl = logoutContext.SignOutIFrameUrl
        };

        return RedirectToPage("/Account/Logout/LoggedOut", viewModel);
    }
}
