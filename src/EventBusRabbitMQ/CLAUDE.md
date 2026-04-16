# EventBusRabbitMQ — RabbitMQ Event Bus Implementation

## Overview
Production `IEventBus` implementation over RabbitMQ/AMQP. Handles persistent connections, channel management, retry on failure, and JSON serialisation of `IntegrationEvent` payloads.

## Key Files
| File | Purpose |
|------|---------|
| `EventBusRabbitMQ.cs` | `IEventBus` implementation — publish (exchange) + subscribe (queue binding + consumer) |
| `RabbitMQPersistentConnection.cs` | Connection wrapper with auto-reconnect policy (Polly) |
| `ServiceCollectionExtensions.cs` | `AddRabbitMQEventBus(config)` DI registration helper |

## DI Registration
Called in each service's `Program.cs`:
```csharp
builder.Services.AddRabbitMQEventBus(builder.Configuration);
```
Config key: `RabbitMQ:Host`, `RabbitMQ:Username`, `RabbitMQ:Password` (set in `appsettings.json` / Docker env).

## Topology
- **Exchange type**: Direct
- **Queue naming**: `{EventTypeName}.{ServiceName}` (auto-declared on subscribe)
- **Durability**: Queues and messages are durable (survive broker restart)
