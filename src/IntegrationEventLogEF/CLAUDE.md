# IntegrationEventLogEF — Outbox Pattern

## Overview
Implements the **transactional outbox pattern**: integration events are saved to the same DB transaction as the business data, then published to the event bus in a separate step. Prevents message loss on service crash between save and publish.

## Domain Glossary
| Term | Meaning |
|------|---------|
| **IntegrationEventLogEntry** | DB row tracking one event: `EventId`, `State`, `Content` (JSON), `TransactionId`, `TimesSent` |
| **IntegrationEventState** | `NotPublished` → `InProgress` → `Published` (or `PublishedFailed`) |
| **IIntegrationEventLogService** | Service interface: `SaveEventAsync`, `MarkEventAsPublishedAsync`, `RetrieveEventLogsPendingToPublishAsync` |

## Key Files
| File | Purpose |
|------|---------|
| `IIntegrationEventLogService.cs` | Contract for saving and querying pending events |
| `IntegrationEventLogService.cs` | EF Core implementation — uses same `DbTransaction` as the business `DbContext` |
| `IntegrationEventLogContext.cs` | Separate `DbContext` wrapping the `integration_event_log` table |
| `IntegrationEventLogEntry.cs` | Entity: serialises `IntegrationEvent` to JSON `Content` column |
| `IntegrationEventState.cs` | Enum: `NotPublished=0`, `InProgress=1`, `Published=2`, `PublishedFailed=3` |

## Usage Pattern
```csharp
// 1. Save business data + event in same transaction
await _logService.SaveEventAsync(integrationEvent, transaction);
await _dbContext.SaveChangesAsync();

// 2. Publish (after commit)
await _eventBus.PublishAsync(integrationEvent);
await _logService.MarkEventAsPublishedAsync(integrationEvent.Id);
```
