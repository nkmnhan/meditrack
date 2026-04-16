# Notification.Worker — Background Notification Worker

## Overview
.NET Background Service consuming integration events from RabbitMQ and dispatching notifications through configured channels. **All notification channels are currently log-only stubs** — no real provider (SendGrid, Twilio, Firebase) is wired up yet.

## Notification Channels (Stub Status)
| Channel | Status | Provider Needed |
|---------|--------|----------------|
| Email | ⏳ Stub — logs only | SendGrid or Amazon SES |
| SMS | ⏳ Stub — logs only | Twilio |
| Push | ⏳ Stub — logs only | Firebase / APNS |
| InApp | ⏳ Stub — logs only | Persistent DB table (not created yet) |

## Key Files
| File | Purpose |
|------|---------|
| `NotificationWorker.cs` | `BackgroundService` — polls for appointment reminders (stub), wraps event loop |
| `Services/NotificationService.cs` | `INotificationService` + implementation — routes by channel, all channels are stubs |
| `EventHandlers/` | One handler per integration event type (e.g., `PatientRegisteredEventHandler`) |
| `Models/NotificationModels.cs` | `NotificationMessage`: `Channel`, `Type`, `Recipient`, `Subject`, `Body`, `Status`, `SentAt` |
| `Data/` | EF Core context (future: InApp notification feed persistence) |
| `Migrations/` | EF migrations for notification tables |

## Known Gaps
- **Appointment reminders** (`NotificationWorker.cs:30,55`) — background reminder check is a stub; no query to Appointment.API yet
- **InApp feed** — `SaveInAppNotificationAsync` logs only; no DB persistence
- **All channel integrations** — only log output, no external provider calls

## Inter-Service Links
- Subscribes to: `PatientRegisteredEvent`, `AppointmentCreatedEvent`, `AppointmentStatusChangedEvent`, `PHIAuditEvent`, `MedicalRecordCreatedEvent`
- No outbound HTTP calls (event-driven only)
