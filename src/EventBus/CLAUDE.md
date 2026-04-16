# EventBus — Integration Event Abstractions

## Overview
Abstract contracts for the integration event bus. All services depend on this project — never on EventBusRabbitMQ directly.

## Domain Glossary
| Term | Meaning |
|------|---------|
| **IntegrationEvent** | Base record for all cross-service events: `Id` (Guid), `CreationDate` (UTC) |
| **IEventBus** | Publish/subscribe interface — `PublishAsync<T>`, `Subscribe<T, TH>`, `Unsubscribe<T, TH>` |
| **IIntegrationEventHandler\<T\>** | Implemented by each event consumer (e.g., `PatientRegisteredEventHandler`) |
| **IEventBusSubscriptionsManager** | Tracks active event→handler mappings. Used internally by implementations |
| **InMemoryEventBusSubscriptionsManager** | In-process subscription manager — used by tests and future InMemory bus |

## Key Files
| File | Purpose |
|------|---------|
| `Abstractions/IEventBus.cs` | Core publish/subscribe interface |
| `Abstractions/IIntegrationEventHandler.cs` | Consumer interface |
| `Abstractions/IntegrationEvent.cs` | Base record for all integration events |
| `Abstractions/IEventBusSubscriptionsManager.cs` | Subscription tracking interface |
| `InMemoryEventBusSubscriptionsManager.cs` | In-memory implementation of subscription manager |
| `SubscriptionInfo.cs` | Metadata about a registered subscription |

## Rule
**NEVER reference EventBusRabbitMQ** from service code — always inject `IEventBus`. The implementation is swapped at DI registration time.
