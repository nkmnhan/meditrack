using System.Security.Claims;
using Duende.IdentityServer.Extensions;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Services;
using IdentityModel;
using MediTrack.Identity.Models;
using Microsoft.AspNetCore.Identity;

namespace MediTrack.Identity.Services;

public class ProfileService : IProfileService
{
    private readonly UserManager<ApplicationUser> _userManager;

    public ProfileService(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task GetProfileDataAsync(ProfileDataRequestContext context)
    {
        string subjectId = context.Subject.GetSubjectId();
        ApplicationUser? user = await _userManager.FindByIdAsync(subjectId);

        if (user is null)
        {
            return;
        }

        var claims = new List<Claim>
        {
            new(JwtClaimTypes.GivenName, user.FirstName),
            new(JwtClaimTypes.FamilyName, user.LastName),
            new(JwtClaimTypes.Name, $"{user.FirstName} {user.LastName}")
        };

        IList<string> roles = await _userManager.GetRolesAsync(user);

        foreach (string role in roles)
        {
            claims.Add(new Claim(JwtClaimTypes.Role, role));
        }

        context.IssuedClaims.AddRange(claims);
    }

    public async Task IsActiveAsync(IsActiveContext context)
    {
        string subjectId = context.Subject.GetSubjectId();
        ApplicationUser? user = await _userManager.FindByIdAsync(subjectId);

        context.IsActive = user is not null;
    }
}
