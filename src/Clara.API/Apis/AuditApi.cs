using Clara.API.Application.Models;
using Clara.API.Data;
using MediTrack.Shared.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Clara.API.Apis;

/// <summary>
/// Minimal API endpoints for querying PHI audit logs.
/// Read-only access to the audit database for admin compliance review.
/// </summary>
public static class AuditApi
{
    public static void MapAuditEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/audit")
            .WithTags("Audit")
            .RequireAuthorization(policy => policy.RequireRole(UserRoles.Admin));

        group.MapGet("/logs", GetAuditLogs)
            .WithName("GetAuditLogs")
            .WithSummary("Search and paginate PHI audit logs");
    }

    private static async Task<IResult> GetAuditLogs(
        [AsParameters] AuditLogSearchParams searchParams,
        ClaimsPrincipal user,
        AuditReadContext auditContext,
        CancellationToken cancellationToken)
    {
        var query = auditContext.AuditLogs.AsNoTracking();

        // Server-side filtering
        if (!string.IsNullOrWhiteSpace(searchParams.Action))
        {
            query = query.Where(log => log.Action == searchParams.Action);
        }

        if (!string.IsNullOrWhiteSpace(searchParams.User))
        {
            query = query.Where(log => log.Username.Contains(searchParams.User));
        }

        if (!string.IsNullOrWhiteSpace(searchParams.Severity))
        {
            query = query.Where(log => log.Severity == searchParams.Severity);
        }

        if (!string.IsNullOrWhiteSpace(searchParams.Search))
        {
            query = query.Where(log =>
                log.ResourceType.Contains(searchParams.Search)
                || log.ResourceId.Contains(searchParams.Search)
                || log.Username.Contains(searchParams.Search)
                || (log.ErrorMessage != null && log.ErrorMessage.Contains(searchParams.Search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var pageNumber = Math.Max(1, searchParams.PageNumber);
        var pageSize = Math.Clamp(searchParams.PageSize, 1, 100);

        var items = await query
            .OrderByDescending(log => log.Timestamp)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(log => new AuditLogDto
            {
                Id = log.Id,
                Timestamp = log.Timestamp,
                Username = log.Username,
                UserRole = log.UserRole,
                Action = log.Action,
                ResourceType = log.ResourceType,
                ResourceId = log.ResourceId,
                Severity = log.Severity,
                Success = log.Success,
                ErrorMessage = log.ErrorMessage
            })
            .ToListAsync(cancellationToken);

        var result = PagedResult<AuditLogDto>.Create(items, totalCount, pageNumber, pageSize);
        return Results.Ok(result);
    }
}
