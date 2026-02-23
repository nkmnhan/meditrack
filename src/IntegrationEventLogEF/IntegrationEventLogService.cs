using System.Reflection;
using MediTrack.Shared.Events;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace MediTrack.IntegrationEventLogEF;

public sealed class IntegrationEventLogService : IIntegrationEventLogService
{
    private readonly IntegrationEventLogContext _integrationEventLogContext;
    private readonly List<Type> _integrationEventTypes;

    public IntegrationEventLogService(
        IntegrationEventLogContext integrationEventLogContext,
        Assembly integrationEventAssembly)
    {
        _integrationEventLogContext = integrationEventLogContext;
        _integrationEventTypes = integrationEventAssembly
            .GetTypes()
            .Where(type => type.IsAssignableTo(typeof(IntegrationEvent)))
            .ToList();
    }

    public async Task<IEnumerable<IntegrationEventLogEntry>> RetrieveEventLogsPendingToPublishAsync(
        Guid transactionId,
        CancellationToken cancellationToken = default)
    {
        List<IntegrationEventLogEntry> pendingEntries = await _integrationEventLogContext.IntegrationEventLogs
            .Where(entry => entry.TransactionId == transactionId && entry.State == IntegrationEventState.NotPublished)
            .OrderBy(entry => entry.CreationTime)
            .ToListAsync(cancellationToken);

        if (pendingEntries.Count == 0)
        {
            return [];
        }

        return pendingEntries
            .Join(
                _integrationEventTypes,
                entry => entry.EventTypeName,
                integrationEventType => integrationEventType.FullName,
                (entry, integrationEventType) => entry.DeserializeJsonContent(integrationEventType));
    }

    public async Task SaveEventAsync(
        IntegrationEvent integrationEvent,
        IDbContextTransaction dbContextTransaction,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContextTransaction);

        IntegrationEventLogEntry entry = new(integrationEvent, dbContextTransaction.TransactionId);
        _integrationEventLogContext.Database.UseTransaction(dbContextTransaction.GetDbTransaction());
        await _integrationEventLogContext.IntegrationEventLogs.AddAsync(entry, cancellationToken);
        await _integrationEventLogContext.SaveChangesAsync(cancellationToken);
    }

    public Task MarkEventAsInProgressAsync(Guid eventId, CancellationToken cancellationToken = default) =>
        UpdateEventStateAsync(eventId, IntegrationEventState.InProgress, cancellationToken);

    public Task MarkEventAsPublishedAsync(Guid eventId, CancellationToken cancellationToken = default) =>
        UpdateEventStateAsync(eventId, IntegrationEventState.Published, cancellationToken);

    public Task MarkEventAsFailedAsync(Guid eventId, CancellationToken cancellationToken = default) =>
        UpdateEventStateAsync(eventId, IntegrationEventState.PublishedFailed, cancellationToken);

    private async Task UpdateEventStateAsync(
        Guid eventId,
        IntegrationEventState targetState,
        CancellationToken cancellationToken)
    {
        IntegrationEventLogEntry? entry = await _integrationEventLogContext.IntegrationEventLogs
            .SingleOrDefaultAsync(logEntry => logEntry.EventId == eventId, cancellationToken);

        if (entry is null)
        {
            return;
        }

        entry.State = targetState;

        if (targetState == IntegrationEventState.InProgress)
        {
            entry.TimesSent++;
        }

        _integrationEventLogContext.IntegrationEventLogs.Update(entry);
        await _integrationEventLogContext.SaveChangesAsync(cancellationToken);
    }
}
