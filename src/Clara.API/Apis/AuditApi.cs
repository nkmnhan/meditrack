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

        group.MapGet("/archived", GetArchivedAuditLogs)
            .WithName("GetArchivedAuditLogs")
            .WithSummary("Search and paginate archived PHI audit logs");

        group.MapGet("/stats", GetAuditStats)
            .WithName("GetAuditStats")
            .WithSummary("Get audit database statistics (hot vs archived counts)");
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

    private static async Task<IResult> GetArchivedAuditLogs(
        [AsParameters] AuditLogSearchParams searchParams,
        ClaimsPrincipal user,
        AuditReadContext auditContext,
        CancellationToken cancellationToken)
    {
        var query = auditContext.ArchivedAuditLogs.AsNoTracking();

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
            .Select(log => new ArchivedAuditLogDto
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
                ErrorMessage = log.ErrorMessage,
                ArchivedAt = log.ArchivedAt,
            })
            .ToListAsync(cancellationToken);

        var result = PagedResult<ArchivedAuditLogDto>.Create(items, totalCount, pageNumber, pageSize);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetAuditStats(
        ClaimsPrincipal user,
        AuditReadContext auditContext,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var hotCount = await auditContext.AuditLogs
            .AsNoTracking()
            .LongCountAsync(cancellationToken);

        var archivedCount = await auditContext.ArchivedAuditLogs
            .AsNoTracking()
            .LongCountAsync(cancellationToken);

        var oldestHotRecord = await auditContext.AuditLogs
            .AsNoTracking()
            .OrderBy(log => log.Timestamp)
            .Select(log => (DateTimeOffset?)log.Timestamp)
            .FirstOrDefaultAsync(cancellationToken);

        var lastArchivalRun = await auditContext.ArchivedAuditLogs
            .AsNoTracking()
            .OrderByDescending(log => log.ArchivedAt)
            .Select(log => (DateTimeOffset?)log.ArchivedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var retentionMonths = configuration.GetValue("Archival:RetentionMonths", 12);

        var stats = new AuditStatsResponse
        {
            HotRecordCount = hotCount,
            ArchivedRecordCount = archivedCount,
            OldestHotRecord = oldestHotRecord,
            LastArchivalRun = lastArchivalRun,
            RetentionMonths = retentionMonths,
        };

        return Results.Ok(stats);
    }
}
