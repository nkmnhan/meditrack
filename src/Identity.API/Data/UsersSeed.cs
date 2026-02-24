using MediTrack.Identity.Constants;
using MediTrack.Identity.Models;
using Microsoft.AspNetCore.Identity;

namespace MediTrack.Identity.Data;

public static class UsersSeed
{
    public static async Task SeedAsync(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ILogger logger)
    {
        foreach (string role in UserRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
                logger.LogInformation("Created role {Role}", role);
            }
        }

        await EnsureUserAsync(
            userManager, logger,
            email: "admin@meditrack.local",
            password: "Admin123!",
            firstName: "System",
            lastName: "Administrator",
            role: UserRoles.Admin);

        await EnsureUserAsync(
            userManager, logger,
            email: "doctor@meditrack.local",
            password: "Doctor123!",
            firstName: "Jane",
            lastName: "Smith",
            role: UserRoles.Doctor);
    }

    private static async Task EnsureUserAsync(
        UserManager<ApplicationUser> userManager,
        ILogger logger,
        string email,
        string password,
        string firstName,
        string lastName,
        string role)
    {
        ApplicationUser? existingUser = await userManager.FindByEmailAsync(email);

        if (existingUser is not null)
        {
            return;
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FirstName = firstName,
            LastName = lastName
        };

        IdentityResult result = await userManager.CreateAsync(user, password);

        if (result.Succeeded)
        {
            await userManager.AddToRoleAsync(user, role);
            logger.LogInformation("Created user {Email} with role {Role}", email, role);
        }
        else
        {
            string errors = string.Join(", ", result.Errors.Select(e => e.Description));
            logger.LogError("Failed to create user {Email}: {Errors}", email, errors);
        }
    }
}
