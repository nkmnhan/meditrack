using Duende.IdentityServer.Events;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Services;
using Duende.IdentityServer.Stores;
using MediTrack.Identity.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.RateLimiting;

namespace MediTrack.Identity.Pages.Account.Login;

[AllowAnonymous]
[EnableRateLimiting("login")]
public class Index : PageModel
{
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IIdentityServerInteractionService _interaction;
    private readonly IEventService _events;
    private readonly IAuthenticationSchemeProvider _schemeProvider;
    private readonly IIdentityProviderStore _identityProviderStore;

    public LoginViewModel View { get; set; } = default!;

    [BindProperty]
    public InputModel Input { get; set; } = default!;

    public Index(
        IIdentityServerInteractionService interaction,
        IAuthenticationSchemeProvider schemeProvider,
        IIdentityProviderStore identityProviderStore,
        IEventService events,
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager)
    {
        _interaction = interaction;
        _schemeProvider = schemeProvider;
        _identityProviderStore = identityProviderStore;
        _events = events;
        _userManager = userManager;
        _signInManager = signInManager;
    }

    public async Task<IActionResult> OnGet(string? returnUrl)
    {
        await BuildModelAsync(returnUrl);

        if (View.IsExternalLoginOnly)
        {
            return RedirectToPage("/Account/ExternalLogin", new { scheme = View.ExternalLoginScheme, returnUrl });
        }

        return Page();
    }

    public async Task<IActionResult> OnPost()
    {
        AuthorizationRequest? context = await _interaction.GetAuthorizationContextAsync(Input.ReturnUrl);

        if (Input.Button != "login")
        {
            if (context is not null)
            {
                await _interaction.DenyAuthorizationAsync(context, AuthorizationError.AccessDenied);

                if (context.IsNativeClient())
                {
                    return this.LoadingPage(Input.ReturnUrl!);
                }

                return Redirect(Input.ReturnUrl!);
            }

            return Redirect("~/");
        }

        if (ModelState.IsValid)
        {
            var result = await _signInManager.PasswordSignInAsync(
                Input.Username!, Input.Password!, Input.RememberLogin, lockoutOnFailure: true);

            if (result.Succeeded)
            {
                ApplicationUser? user = await _userManager.FindByNameAsync(Input.Username!);

                await _events.RaiseAsync(new UserLoginSuccessEvent(
                    user!.UserName, user.Id, user.UserName, clientId: context?.Client.ClientId));

                if (context is not null)
                {
                    if (context.IsNativeClient())
                    {
                        return this.LoadingPage(Input.ReturnUrl!);
                    }

                    return Redirect(Input.ReturnUrl!);
                }

                if (Url.IsLocalUrl(Input.ReturnUrl))
                {
                    return Redirect(Input.ReturnUrl);
                }

                if (string.IsNullOrEmpty(Input.ReturnUrl))
                {
                    return Redirect("~/");
                }

                throw new ArgumentException("Invalid return URL");
            }

            await _events.RaiseAsync(new UserLoginFailureEvent(
                Input.Username, "Invalid credentials", clientId: context?.Client.ClientId));

            ModelState.AddModelError(string.Empty, "Invalid username or password.");
        }

        await BuildModelAsync(Input.ReturnUrl);
        return Page();
    }

    private async Task BuildModelAsync(string? returnUrl)
    {
        AuthorizationRequest? context = await _interaction.GetAuthorizationContextAsync(returnUrl);

        if (context?.IdP is not null && await _schemeProvider.GetSchemeAsync(context.IdP) is not null)
        {
            bool isLocalLogin = context.IdP == Duende.IdentityServer.IdentityServerConstants.LocalIdentityProvider;

            View = new LoginViewModel
            {
                EnableLocalLogin = isLocalLogin,
                ExternalProviders = isLocalLogin
                    ? []
                    : [new ExternalProvider { AuthenticationScheme = context.IdP }]
            };

            Input = new InputModel { ReturnUrl = returnUrl };
            return;
        }

        IEnumerable<AuthenticationScheme> schemes = await _schemeProvider.GetAllSchemesAsync();

        var providers = schemes
            .Where(scheme => scheme.DisplayName is not null)
            .Select(scheme => new ExternalProvider
            {
                DisplayName = scheme.DisplayName ?? scheme.Name,
                AuthenticationScheme = scheme.Name
            })
            .ToList();

        IEnumerable<IdentityProviderName> dynamicSchemes = await _identityProviderStore.GetAllSchemeNamesAsync();

        providers.AddRange(dynamicSchemes.Select(scheme => new ExternalProvider
        {
            AuthenticationScheme = scheme.Scheme,
            DisplayName = scheme.DisplayName
        }));

        bool allowLocal = true;

        if (context?.Client.ClientId is not null)
        {
            IClientStore? clientStore = HttpContext.RequestServices.GetRequiredService<IClientStore>();
            Client? client = await clientStore.FindEnabledClientByIdAsync(context.Client.ClientId);

            if (client is not null)
            {
                allowLocal = client.EnableLocalLogin;

                if (client.IdentityProviderRestrictions.Any())
                {
                    providers = providers
                        .Where(provider => provider.AuthenticationScheme is not null
                            && client.IdentityProviderRestrictions.Contains(provider.AuthenticationScheme))
                        .ToList();
                }
            }
        }

        View = new LoginViewModel
        {
            AllowRememberLogin = true,
            EnableLocalLogin = allowLocal,
            ExternalProviders = providers
        };

        Input = new InputModel { ReturnUrl = returnUrl };
    }
}
