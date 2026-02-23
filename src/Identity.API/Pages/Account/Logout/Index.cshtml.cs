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

        bool showLogoutPrompt = true;

        if (User.Identity?.IsAuthenticated != true)
        {
            showLogoutPrompt = false;
        }
        else
        {
            var logoutContext = await _interaction.GetLogoutContextAsync(logoutId);
            if (logoutContext.ShowSignoutPrompt == false)
            {
                showLogoutPrompt = false;
            }
        }

        if (!showLogoutPrompt)
        {
            return await OnPost();
        }

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
