using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace MediTrack.Identity.Pages.Redirect;

[AllowAnonymous]
public class Index : PageModel
{
    public string RedirectUri { get; set; } = default!;

    public IActionResult OnGet(string redirectUri)
    {
        if (!Url.IsLocalUrl(redirectUri))
        {
            return RedirectToPage("/Error/Index");
        }

        RedirectUri = redirectUri;
        return Page();
    }
}
