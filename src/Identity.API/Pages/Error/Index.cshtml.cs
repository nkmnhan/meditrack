using Duende.IdentityServer.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace MediTrack.Identity.Pages.Error;

[AllowAnonymous]
public class Index : PageModel
{
    private readonly IIdentityServerInteractionService _interaction;
    private readonly IWebHostEnvironment _environment;

    public ViewModel View { get; set; } = default!;

    public Index(IIdentityServerInteractionService interaction, IWebHostEnvironment environment)
    {
        _interaction = interaction;
        _environment = environment;
    }

    public async Task<IActionResult> OnGet(string? errorId)
    {
        View = new ViewModel();

        var message = await _interaction.GetErrorContextAsync(errorId);

        if (message is not null)
        {
            View.Error = message;

            if (!_environment.IsDevelopment())
            {
                message.ErrorDescription = null;
            }
        }

        return Page();
    }
}
