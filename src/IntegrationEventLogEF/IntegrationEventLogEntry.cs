using MediTrack.Shared.Events;
using Newtonsoft.Json;

namespace MediTrack.IntegrationEventLogEF;

public sealed class IntegrationEventLogEntry
{
    private IntegrationEventLogEntry() { }

    public IntegrationEventLogEntry(IntegrationEvent integrationEvent, Guid transactionId)
    {
        EventId = integrationEvent.Id;
        CreationTime = integrationEvent.CreationDate;
        EventTypeName = integrationEvent.GetType().FullName!;
        Content = JsonConvert.SerializeObject(integrationEvent);
        State = IntegrationEventState.NotPublished;
        TimesSent = 0;
        TransactionId = transactionId;
    }

    public Guid EventId { get; private set; }
    public string EventTypeName { get; private set; } = string.Empty;
    public string EventTypeShortName => EventTypeName.Split('.').Last();
    public IntegrationEvent? IntegrationEvent { get; private set; }
    public IntegrationEventState State { get; set; }
    public int TimesSent { get; set; }
    public DateTimeOffset CreationTime { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public Guid TransactionId { get; private set; }

    public IntegrationEventLogEntry DeserializeJsonContent(Type integrationEventType)
    {
        IntegrationEvent = (IntegrationEvent?)JsonConvert.DeserializeObject(Content, integrationEventType);
        return this;
    }
}
