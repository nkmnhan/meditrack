using Duende.IdentityServer.EntityFramework.DbContexts;
using Duende.IdentityServer.EntityFramework.Mappers;
using MediTrack.Identity;
using MediTrack.Identity.Data;
using MediTrack.Identity.Models;
using MediTrack.Shared.Common;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace MediTrack.Simulator.Seeders;

/// <summary>
/// Seeds Identity users, roles, and IdentityServer configuration (clients, scopes, resources).
/// All operations are upsert-style: safe to run multiple times without duplicating data.
/// </summary>
public sealed class IdentitySeeder
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ApplicationDbContext _dbContext;
    private readonly ConfigurationDbContext _configurationDbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<IdentitySeeder> _logger;

    public IdentitySeeder(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ApplicationDbContext dbContext,
        ConfigurationDbContext configurationDbContext,
        IConfiguration configuration,
        ILogger<IdentitySeeder> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _dbContext = dbContext;
        _configurationDbContext = configurationDbContext;
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

        // Phase 2: Upsert test users
        if (await UpsertUserAsync(
                email: "admin@meditrack.local",
                password: _configuration["SeedUsers:AdminPassword"] ?? "Admin123!",
                firstName: "System",
                lastName: "Administrator",
                role: UserRoles.Admin))
        {
            createdCount++;
        }

        if (await UpsertUserAsync(
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

        await _dbContext.Users
            .Where(user => user.Email == "admin@meditrack.local")
            .ExecuteUpdateAsync(
                setter => setter.SetProperty(user => user.LastLoginAt, now.AddHours(-2)),
                cancellationToken);

        await _dbContext.Users
            .Where(user => user.Email == "doctor@meditrack.local")
            .ExecuteUpdateAsync(
                setter => setter.SetProperty(user => user.LastLoginAt, now.AddMinutes(-30)),
                cancellationToken);

        // Phase 4: Upsert IdentityServer configuration
        await UpsertIdentityResourcesAsync(cancellationToken);
        await UpsertApiScopesAsync(cancellationToken);
        await UpsertClientsAsync(cancellationToken);

        _logger.LogInformation(
            "Identity seeding complete: {CreatedCount} users upserted", createdCount);

        return (createdCount, failedCount);
    }

    private async Task<bool> UpsertUserAsync(
        string email,
        string password,
        string firstName,
        string lastName,
        string role)
    {
        ApplicationUser? existingUser = await _userManager.FindByEmailAsync(email);

        if (existingUser is not null)
        {
            // Update properties in case they changed
            existingUser.FirstName = firstName;
            existingUser.LastName = lastName;
            existingUser.EmailConfirmed = true;
            await _userManager.UpdateAsync(existingUser);

            // Sync role: add if missing
            if (!await _userManager.IsInRoleAsync(existingUser, role))
            {
                await _userManager.AddToRoleAsync(existingUser, role);
                _logger.LogInformation("Added role {Role} to existing user {Email}", role, email);
            }

            _logger.LogDebug("User {Email} already exists, updated", email);
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

        IdentityResult createResult = await _userManager.CreateAsync(user, password);
        if (!createResult.Succeeded)
        {
            string errors = string.Join(", ", createResult.Errors.Select(error => error.Description));
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
        _logger.LogError(
            "Failed to assign role {Role} to {Email}, user rolled back: {Errors}",
            role, email, roleErrors);
        return false;
    }

    private async Task UpsertIdentityResourcesAsync(CancellationToken cancellationToken)
    {
        foreach (var resource in IdentityServerConfig.GetIdentityResources())
        {
            bool exists = await _configurationDbContext.IdentityResources
                .AnyAsync(identityResource => identityResource.Name == resource.Name, cancellationToken);

            if (exists)
            {
                _logger.LogDebug("IdentityResource {Name} already exists, skipping", resource.Name);
                continue;
            }

            _configurationDbContext.IdentityResources.Add(resource.ToEntity());
            _logger.LogInformation("Created IdentityResource {Name}", resource.Name);
        }

        await _configurationDbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task UpsertApiScopesAsync(CancellationToken cancellationToken)
    {
        foreach (var scope in IdentityServerConfig.GetApiScopes())
        {
            bool exists = await _configurationDbContext.ApiScopes
                .AnyAsync(apiScope => apiScope.Name == scope.Name, cancellationToken);

            if (exists)
            {
                _logger.LogDebug("ApiScope {Name} already exists, skipping", scope.Name);
                continue;
            }

            _configurationDbContext.ApiScopes.Add(scope.ToEntity());
            _logger.LogInformation("Created ApiScope {Name}", scope.Name);
        }

        await _configurationDbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task UpsertClientsAsync(CancellationToken cancellationToken)
    {
        foreach (var client in IdentityServerConfig.GetClients(_configuration))
        {
            bool exists = await _configurationDbContext.Clients
                .AnyAsync(dbClient => dbClient.ClientId == client.ClientId, cancellationToken);

            if (exists)
            {
                _logger.LogDebug("Client {ClientId} already exists, skipping", client.ClientId);
                continue;
            }

            _configurationDbContext.Clients.Add(client.ToEntity());
            _logger.LogInformation("Created Client {ClientId}", client.ClientId);
        }

        await _configurationDbContext.SaveChangesAsync(cancellationToken);
    }
}
