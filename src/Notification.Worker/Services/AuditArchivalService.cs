using Microsoft.EntityFrameworkCore;
using Notification.Worker.Data;
using Notification.Worker.Models;

namespace Notification.Worker.Services;

/// <summary>
/// Background service that archives old PHI audit logs from the hot table
/// to the archive table based on a configurable retention period.
/// Runs once daily at a configurable time (default: 2:00 AM UTC).
/// </summary>
public sealed class AuditArchivalService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<AuditArchivalService> _logger;
    private readonly IConfiguration _configuration;

    public AuditArchivalService(
        IServiceProvider serviceProvider,
        ILogger<AuditArchivalService> logger,
        IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var isEnabled = _configuration.GetValue("Archival:Enabled", true);
        if (!isEnabled)
        {
            _logger.LogInformation("Audit archival service is disabled via configuration");
            return;
        }

        _logger.LogInformation("Audit archival service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = CalculateDelayUntilNextRun();
            _logger.LogInformation(
                "Next audit archival run scheduled in {Hours:F1} hours",
                delay.TotalHours);

            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            await RunArchivalCycleAsync(stoppingToken);
        }

        _logger.LogInformation("Audit archival service stopped");
    }

    private TimeSpan CalculateDelayUntilNextRun()
    {
        var runTimeString = _configuration.GetValue("Archival:RunTimeUtc", "02:00");
        if (!TimeOnly.TryParse(runTimeString, out var runTime))
        {
            runTime = new TimeOnly(2, 0);
        }

        var now = DateTimeOffset.UtcNow;
        var todayRun = new DateTimeOffset(
            now.Year, now.Month, now.Day,
            runTime.Hour, runTime.Minute, 0,
            TimeSpan.Zero);

        // If today's run time has passed, schedule for tomorrow
        var nextRun = todayRun <= now ? todayRun.AddDays(1) : todayRun;
        return nextRun - now;
    }

    private async Task RunArchivalCycleAsync(CancellationToken stoppingToken)
    {
        var retentionMonths = _configuration.GetValue("Archival:RetentionMonths", 12);
        var batchSize = _configuration.GetValue("Archival:BatchSize", 1000);
        var cutoffDate = DateTimeOffset.UtcNow.AddMonths(-retentionMonths);
        var archivedAt = DateTimeOffset.UtcNow;

        _logger.LogInformation(
            "Starting audit archival cycle. Retention: {RetentionMonths} months, cutoff: {CutoffDate}, batch size: {BatchSize}",
            retentionMonths, cutoffDate, batchSize);

        var totalArchived = 0;
        var batchNumber = 0;
        var hasMoreRecords = true;

        while (hasMoreRecords && !stoppingToken.IsCancellationRequested)
        {
            batchNumber++;
            try
            {
                var archivedInBatch = await ArchiveBatchAsync(cutoffDate, archivedAt, batchSize, stoppingToken);
                totalArchived += archivedInBatch;
                hasMoreRecords = archivedInBatch == batchSize;

                if (archivedInBatch > 0)
                {
                    _logger.LogInformation(
                        "Archived batch #{BatchNumber}: {Count} records (total: {Total})",
                        batchNumber, archivedInBatch, totalArchived);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                _logger.LogWarning(
                    "Archival cycle interrupted during batch #{BatchNumber}. Total archived before interruption: {Total}",
                    batchNumber, totalArchived);
                return;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception,
                    "Error archiving batch #{BatchNumber}. Continuing with next batch. Total archived so far: {Total}",
                    batchNumber, totalArchived);
                // Continue with next batch — partial failures don't stop the cycle
            }
        }

        _logger.LogInformation(
            "Audit archival cycle completed. Total archived: {TotalArchived} records in {BatchCount} batches",
            totalArchived, batchNumber);
    }

    /// <summary>
    /// Archives a single batch of audit logs within a transaction.
    /// Uses keyset pagination on Id for consistent performance.
    /// Returns the number of records archived.
    /// </summary>
    private async Task<int> ArchiveBatchAsync(
        DateTimeOffset cutoffDate,
        DateTimeOffset archivedAt,
        int batchSize,
        CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var auditContext = scope.ServiceProvider.GetRequiredService<AuditDbContext>();

        // Keyset pagination on Id — consistent performance regardless of offset
        var recordsToArchive = await auditContext.AuditLogs
            .Where(log => log.Timestamp < cutoffDate)
            .OrderBy(log => log.Id)
            .Take(batchSize)
            .ToListAsync(cancellationToken);

        if (recordsToArchive.Count == 0)
        {
            return 0;
        }

        var archivedRecords = recordsToArchive.Select(log => new ArchivedPHIAuditLog
        {
            Id = log.Id,
            EventId = log.EventId,
            Timestamp = log.Timestamp,
            UserId = log.UserId,
            Username = log.Username,
            UserRole = log.UserRole,
            Action = log.Action,
            ResourceType = log.ResourceType,
            ResourceId = log.ResourceId,
            PatientId = log.PatientId,
            IpAddress = log.IpAddress,
            UserAgent = log.UserAgent,
            Success = log.Success,
            ErrorMessage = log.ErrorMessage,
            EventType = log.EventType,
            AdditionalContext = log.AdditionalContext,
            Severity = log.Severity,
            AlertTriggered = log.AlertTriggered,
            Reviewed = log.Reviewed,
            ReviewedBy = log.ReviewedBy,
            ReviewedAt = log.ReviewedAt,
            ReviewNotes = log.ReviewNotes,
            ArchivedAt = archivedAt,
        }).ToList();

        // Transaction per batch — partial failures don't lose data
        await using var transaction = await auditContext.Database
            .BeginTransactionAsync(cancellationToken);

        auditContext.ArchivedAuditLogs.AddRange(archivedRecords);

        var recordIds = recordsToArchive.Select(log => log.Id).ToList();
        await auditContext.AuditLogs
            .Where(log => recordIds.Contains(log.Id))
            .ExecuteDeleteAsync(cancellationToken);

        await auditContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return recordsToArchive.Count;
    }
}
