using MediTrack.Shared.Common;
using MediTrack.Identity.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;

namespace MediTrack.Identity.Data;

public static class UsersSeed
{
    public static async Task SeedAsync(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IConfiguration configuration,
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

        // Passwords are read from configuration (env vars / secrets in production).
        // Fallback values are for local development only.
        await EnsureUserAsync(
            userManager, logger,
            email: "admin@meditrack.local",
            password: configuration["SeedUsers:AdminPassword"] ?? "Admin123!",
            firstName: "System",
            lastName: "Administrator",
            role: UserRoles.Admin);

        await EnsureUserAsync(
            userManager, logger,
            email: "doctor@meditrack.local",
            password: configuration["SeedUsers:DoctorPassword"] ?? "Doctor123!",
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

        if (!result.Succeeded)
        {
            string errors = string.Join(", ", result.Errors.Select(error => error.Description));
            logger.LogError("Failed to create user {Email}: {Errors}", email, errors);
            return;
        }

        // Handle partial failure: if role assignment fails, roll back the user creation
        IdentityResult roleResult = await userManager.AddToRoleAsync(user, role);

        if (roleResult.Succeeded)
        {
            logger.LogInformation("Created user {Email} with role {Role}", email, role);
        }
        else
        {
            await userManager.DeleteAsync(user);
            string errors = string.Join(", ", roleResult.Errors.Select(error => error.Description));
            logger.LogError("Failed to assign role {Role} to {Email}, user rolled back: {Errors}", role, email, errors);
        }
    }
}
