using MediTrack.Shared.Events;
using Microsoft.EntityFrameworkCore.Storage;

namespace MediTrack.IntegrationEventLogEF;

public interface IIntegrationEventLogService
{
    Task<IEnumerable<IntegrationEventLogEntry>> RetrieveEventLogsPendingToPublishAsync(
        Guid transactionId,
        CancellationToken cancellationToken = default);

    Task SaveEventAsync(
        IntegrationEvent integrationEvent,
        IDbContextTransaction dbContextTransaction,
        CancellationToken cancellationToken = default);

    Task MarkEventAsInProgressAsync(Guid eventId, CancellationToken cancellationToken = default);
    Task MarkEventAsPublishedAsync(Guid eventId, CancellationToken cancellationToken = default);
    Task MarkEventAsFailedAsync(Guid eventId, CancellationToken cancellationToken = default);
}
