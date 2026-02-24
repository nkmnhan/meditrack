using MediTrack.Shared.Common;
using Microsoft.EntityFrameworkCore;
using Notification.Worker.Data;
using Notification.Worker.Models;

namespace Notification.Worker.Services;

/// <summary>
/// Service for managing PHI audit logs and compliance tracking.
/// </summary>
public interface IAuditLogService
{
    Task<PHIAuditLog> CreateAuditLogAsync(PHIAuditLog auditLog, CancellationToken cancellationToken = default);
    Task<PHIBreachIncident> CreateBreachIncidentAsync(PHIBreachIncident incident, CancellationToken cancellationToken = default);
    Task<IEnumerable<PHIAuditLog>> GetAuditLogsByUserAsync(string userId, DateTimeOffset? startDate = null, DateTimeOffset? endDate = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<PHIAuditLog>> GetAuditLogsByPatientAsync(Guid patientId, DateTimeOffset? startDate = null, DateTimeOffset? endDate = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<PHIAuditLog>> GetUnauthorizedAccessAttemptsAsync(DateTimeOffset? startDate = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<PHIBreachIncident>> GetActiveBreachIncidentsAsync(CancellationToken cancellationToken = default);
    Task<PHIAuditStatistics> GetUserAuditStatisticsAsync(string userId, DateTimeOffset? startDate = null, DateTimeOffset? endDate = null, CancellationToken cancellationToken = default);
}

public class AuditLogService : IAuditLogService
{
    private readonly AuditDbContext _context;
    private readonly ILogger<AuditLogService> _logger;

    public AuditLogService(AuditDbContext context, ILogger<AuditLogService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PHIAuditLog> CreateAuditLogAsync(PHIAuditLog auditLog, CancellationToken cancellationToken = default)
    {
        try
        {
            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync(cancellationToken);
            
            _logger.LogInformation(
                "PHI audit log created: {EventType} by {UserId} on {ResourceType} {ResourceId}",
                auditLog.EventType,
                auditLog.UserId,
                auditLog.ResourceType,
                auditLog.ResourceId);

            return auditLog;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create PHI audit log for event {EventId}", auditLog.EventId);
            throw;
        }
    }

    public async Task<PHIBreachIncident> CreateBreachIncidentAsync(PHIBreachIncident incident, CancellationToken cancellationToken = default)
    {
        try
        {
            _context.BreachIncidents.Add(incident);
            await _context.SaveChangesAsync(cancellationToken);
            
            _logger.LogWarning(
                "PHI breach incident created: {Severity} - {Description} affecting {PatientsAffected} patients",
                incident.Severity,
                incident.Description,
                incident.PatientsAffected);

            // Alert if requires breach notification
            if (incident.RequiresBreachNotification)
            {
                _logger.LogCritical(
                    "HIPAA Breach Notification Required: Breach incident {IncidentId} affects {PatientsAffected} patients",
                    incident.Id,
                    incident.PatientsAffected);
            }

            return incident;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create PHI breach incident for event {EventId}", incident.EventId);
            throw;
        }
    }

    public async Task<IEnumerable<PHIAuditLog>> GetAuditLogsByUserAsync(
        string userId, 
        DateTimeOffset? startDate = null, 
        DateTimeOffset? endDate = null, 
        CancellationToken cancellationToken = default)
    {
        var query = _context.AuditLogs.Where(log => log.UserId == userId);
        
        if (startDate.HasValue)
        {
            query = query.Where(log => log.Timestamp >= startDate.Value);
        }
        
        if (endDate.HasValue)
        {
            query = query.Where(log => log.Timestamp <= endDate.Value);
        }

        return await query
            .OrderByDescending(log => log.Timestamp)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<PHIAuditLog>> GetAuditLogsByPatientAsync(
        Guid patientId, 
        DateTimeOffset? startDate = null, 
        DateTimeOffset? endDate = null, 
        CancellationToken cancellationToken = default)
    {
        var query = _context.AuditLogs.Where(log => log.PatientId == patientId);
        
        if (startDate.HasValue)
        {
            query = query.Where(log => log.Timestamp >= startDate.Value);
        }
        
        if (endDate.HasValue)
        {
            query = query.Where(log => log.Timestamp <= endDate.Value);
        }

        return await query
            .OrderByDescending(log => log.Timestamp)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<PHIAuditLog>> GetUnauthorizedAccessAttemptsAsync(
        DateTimeOffset? startDate = null, 
        CancellationToken cancellationToken = default)
    {
        var query = _context.AuditLogs.Where(log => 
            !log.Success && 
            log.EventType.Contains("Unauthorized"));
        
        if (startDate.HasValue)
        {
            query = query.Where(log => log.Timestamp >= startDate.Value);
        }

        return await query
            .OrderByDescending(log => log.Timestamp)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<PHIBreachIncident>> GetActiveBreachIncidentsAsync(CancellationToken cancellationToken = default)
    {
        return await _context.BreachIncidents
            .Where(incident => incident.Status != BreachStatus.Resolved && incident.Status != BreachStatus.FalsePositive)
            .OrderByDescending(incident => incident.DetectedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<PHIAuditStatistics> GetUserAuditStatisticsAsync(
        string userId, 
        DateTimeOffset? startDate = null, 
        DateTimeOffset? endDate = null, 
        CancellationToken cancellationToken = default)
    {
        var query = _context.AuditLogs.Where(log => log.UserId == userId);
        
        if (startDate.HasValue)
        {
            query = query.Where(log => log.Timestamp >= startDate.Value);
        }
        
        if (endDate.HasValue)
        {
            query = query.Where(log => log.Timestamp <= endDate.Value);
        }

        // Use SQL aggregates instead of loading all logs into memory
        var statistics = await query
            .GroupBy(log => new { log.UserId, log.Username, log.UserRole })
            .Select(g => new
            {
                g.Key.UserId,
                g.Key.Username,
                g.Key.UserRole,
                TotalAccesses = g.Count(),
                SuccessfulAccesses = g.Count(log => log.Success),
                FailedAccesses = g.Count(log => !log.Success),
                UnauthorizedAttempts = g.Count(log => !log.Success && log.EventType.Contains("Unauthorized")),
                FirstAccess = g.Min(log => log.Timestamp),
                LastAccess = g.Max(log => log.Timestamp)
            })
            .FirstOrDefaultAsync(cancellationToken);
        
        if (statistics == null)
        {
            return new PHIAuditStatistics
            {
                UserId = userId,
                Username = string.Empty,
                UserRole = string.Empty
            };
        }

        // Get distinct resource types accessed (small list, acceptable to load)
        var resourceTypes = await query
            .Select(log => log.ResourceType)
            .Distinct()
            .ToListAsync(cancellationToken);

        return new PHIAuditStatistics
        {
            UserId = statistics.UserId,
            Username = statistics.Username,
            UserRole = statistics.UserRole,
            TotalAccesses = statistics.TotalAccesses,
            SuccessfulAccesses = statistics.SuccessfulAccesses,
            FailedAccesses = statistics.FailedAccesses,
            UnauthorizedAttempts = statistics.UnauthorizedAttempts,
            FirstAccess = statistics.FirstAccess,
            LastAccess = statistics.LastAccess,
            ResourceTypesAccessed = resourceTypes
        };
    }
}
