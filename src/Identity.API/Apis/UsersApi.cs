using MediTrack.Identity.Dtos;
using MediTrack.Identity.Models;
using MediTrack.Shared.Common;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediTrack.Identity.Apis;

/// <summary>
/// Minimal API endpoints for user management (Admin-only).
/// Uses JWT Bearer auth (not cookie auth, which is for Razor Pages).
/// </summary>
public static class UsersApi
{
    public static void MapUsersApi(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users")
            .WithTags("Users")
            .RequireAuthorization(policy =>
            {
                policy.AuthenticationSchemes = [JwtBearerDefaults.AuthenticationScheme];
                policy.RequireRole(UserRoles.Admin);
            });

        group.MapGet("/", GetUsers)
            .WithName("GetUsers")
            .WithSummary("List users with filtering and pagination");

        group.MapGet("/{id}", GetUserById)
            .WithName("GetUserById")
            .WithSummary("Get user by ID");

        group.MapPost("/{id}/role", ChangeUserRole)
            .WithName("ChangeUserRole")
            .WithSummary("Change a user's role");

        group.MapPost("/{id}/deactivate", DeactivateUser)
            .WithName("DeactivateUser")
            .WithSummary("Lock out a user");

        group.MapPost("/{id}/activate", ActivateUser)
            .WithName("ActivateUser")
            .WithSummary("Remove lockout from a user");
    }

    private static async Task<IResult> GetUsers(
        [AsParameters] UserSearchQuery query,
        UserManager<ApplicationUser> userManager,
        CancellationToken cancellationToken)
    {
        var usersQuery = userManager.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            usersQuery = usersQuery.Where(user =>
                user.FirstName.Contains(query.Search)
                || user.LastName.Contains(query.Search)
                || (user.Email != null && user.Email.Contains(query.Search)));
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            if (query.Status.Equals("active", StringComparison.OrdinalIgnoreCase))
            {
                usersQuery = usersQuery.Where(user => !user.LockoutEnd.HasValue || user.LockoutEnd <= DateTimeOffset.UtcNow);
            }
            else if (query.Status.Equals("inactive", StringComparison.OrdinalIgnoreCase))
            {
                usersQuery = usersQuery.Where(user => user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow);
            }
        }

        var totalCount = await usersQuery.CountAsync(cancellationToken);

        var pageNumber = Math.Max(1, query.PageNumber);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var users = await usersQuery
            .OrderBy(user => user.LastName)
            .ThenBy(user => user.FirstName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = new List<UserListItemResponse>();
        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault() ?? "Unknown";

            // Apply role filter in-memory since roles are stored in a separate table
            if (!string.IsNullOrWhiteSpace(query.Role) && !role.Equals(query.Role, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var isActive = !user.LockoutEnd.HasValue || user.LockoutEnd <= DateTimeOffset.UtcNow;

            items.Add(new UserListItemResponse
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email ?? "",
                Role = role,
                IsActive = isActive,
                LastLoginAt = user.LastLoginAt,
                CreatedAt = user.LockoutEnd ?? DateTimeOffset.MinValue, // No CreatedAt field; placeholder
            });
        }

        var result = PagedResult<UserListItemResponse>.Create(items, totalCount, pageNumber, pageSize);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetUserById(
        string id,
        UserManager<ApplicationUser> userManager)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user is null)
        {
            return Results.NotFound(new { message = $"User with ID {id} not found." });
        }

        var roles = await userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "Unknown";
        var isActive = !user.LockoutEnd.HasValue || user.LockoutEnd <= DateTimeOffset.UtcNow;

        return Results.Ok(new UserListItemResponse
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email ?? "",
            Role = role,
            IsActive = isActive,
            LastLoginAt = user.LastLoginAt,
            CreatedAt = DateTimeOffset.MinValue,
        });
    }

    private static async Task<IResult> ChangeUserRole(
        string id,
        [FromBody] ChangeUserRoleRequest request,
        UserManager<ApplicationUser> userManager)
    {
        if (!UserRoles.All.Contains(request.NewRole))
        {
            return Results.BadRequest(new { message = $"Invalid role: {request.NewRole}" });
        }

        var user = await userManager.FindByIdAsync(id);
        if (user is null)
        {
            return Results.NotFound(new { message = $"User with ID {id} not found." });
        }

        var currentRoles = await userManager.GetRolesAsync(user);
        if (currentRoles.Count > 0)
        {
            var removeResult = await userManager.RemoveFromRolesAsync(user, currentRoles);
            if (!removeResult.Succeeded)
            {
                return Results.BadRequest(new { message = "Failed to remove current roles.", errors = removeResult.Errors });
            }
        }

        var addResult = await userManager.AddToRoleAsync(user, request.NewRole);
        if (!addResult.Succeeded)
        {
            // Roll back — re-add the original roles
            if (currentRoles.Count > 0)
            {
                await userManager.AddToRolesAsync(user, currentRoles);
            }
            return Results.BadRequest(new { message = "Failed to assign new role.", errors = addResult.Errors });
        }

        return Results.NoContent();
    }

    private static async Task<IResult> DeactivateUser(
        string id,
        UserManager<ApplicationUser> userManager)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user is null)
        {
            return Results.NotFound(new { message = $"User with ID {id} not found." });
        }

        var result = await userManager.SetLockoutEndDateAsync(user, DateTimeOffset.MaxValue);
        if (!result.Succeeded)
        {
            return Results.BadRequest(new { message = "Failed to deactivate user.", errors = result.Errors });
        }

        return Results.NoContent();
    }

    private static async Task<IResult> ActivateUser(
        string id,
        UserManager<ApplicationUser> userManager)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user is null)
        {
            return Results.NotFound(new { message = $"User with ID {id} not found." });
        }

        var result = await userManager.SetLockoutEndDateAsync(user, null);
        if (!result.Succeeded)
        {
            return Results.BadRequest(new { message = "Failed to activate user.", errors = result.Errors });
        }

        // Reset failed access count
        await userManager.ResetAccessFailedCountAsync(user);

        return Results.NoContent();
    }
}
