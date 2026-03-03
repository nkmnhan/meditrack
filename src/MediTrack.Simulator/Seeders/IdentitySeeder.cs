using MediTrack.Identity.Data;
using MediTrack.Identity.Models;
using MediTrack.Shared.Common;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace MediTrack.Simulator.Seeders;

/// <summary>
/// Seeds Identity users, roles, and simulated login activity.
/// Merges logic from Identity.API/Data/UsersSeed.cs and Identity.API/Apis/DevSeederApi.cs.
/// </summary>
public sealed class IdentitySeeder
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ApplicationDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<IdentitySeeder> _logger;

    public IdentitySeeder(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ApplicationDbContext dbContext,
        IConfiguration configuration,
        ILogger<IdentitySeeder> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<(int CreatedCount, int FailedCount)> SeedAsync(CancellationToken cancellationToken)
    {
        var createdCount = 0;
        var failedCount = 0;

        // Phase 1: Ensure roles exist
        foreach (string role in UserRoles.All)
        {
            if (!await _roleManager.RoleExistsAsync(role))
            {
                await _roleManager.CreateAsync(new IdentityRole(role));
                _logger.LogInformation("Created role {Role}", role);
            }
        }

        // Phase 2: Seed test users
        if (await EnsureUserAsync(
                email: "admin@meditrack.local",
                password: _configuration["SeedUsers:AdminPassword"] ?? "Admin123!",
                firstName: "System",
                lastName: "Administrator",
                role: UserRoles.Admin))
        {
            createdCount++;
        }

        if (await EnsureUserAsync(
                email: "doctor@meditrack.local",
                password: _configuration["SeedUsers:DoctorPassword"] ?? "Doctor123!",
                firstName: "Jane",
                lastName: "Smith",
                role: UserRoles.Doctor))
        {
            createdCount++;
        }

        // Phase 3: Simulate login activity
        var now = DateTimeOffset.UtcNow;

        var adminUpdated = await _dbContext.Users
            .Where(user => user.Email == "admin@meditrack.local")
            .ExecuteUpdateAsync(
                setter => setter.SetProperty(
                    user => user.LastLoginAt, now.AddHours(-2)),
                cancellationToken);

        var doctorUpdated = await _dbContext.Users
            .Where(user => user.Email == "doctor@meditrack.local")
            .ExecuteUpdateAsync(
                setter => setter.SetProperty(
                    user => user.LastLoginAt, now.AddMinutes(-30)),
                cancellationToken);

        _logger.LogInformation(
            "Identity seeding complete: {CreatedCount} users created, {LoginActivityCount} login activities updated",
            createdCount, adminUpdated + doctorUpdated);

        return (createdCount, failedCount);
    }

    private async Task<bool> EnsureUserAsync(
        string email,
        string password,
        string firstName,
        string lastName,
        string role)
    {
        ApplicationUser? existingUser = await _userManager.FindByEmailAsync(email);
        if (existingUser is not null)
        {
            _logger.LogDebug("User {Email} already exists, skipping", email);
            return false;
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FirstName = firstName,
            LastName = lastName
        };

        IdentityResult result = await _userManager.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            string errors = string.Join(", ", result.Errors.Select(error => error.Description));
            _logger.LogError("Failed to create user {Email}: {Errors}", email, errors);
            return false;
        }

        IdentityResult roleResult = await _userManager.AddToRoleAsync(user, role);
        if (roleResult.Succeeded)
        {
            _logger.LogInformation("Created user {Email} with role {Role}", email, role);
            return true;
        }

        // Roll back user on partial failure
        await _userManager.DeleteAsync(user);
        string roleErrors = string.Join(", ", roleResult.Errors.Select(error => error.Description));
        _logger.LogError("Failed to assign role {Role} to {Email}, user rolled back: {Errors}", role, email, roleErrors);
        return false;
    }
}
