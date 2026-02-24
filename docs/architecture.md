# MediTrack — Architecture

## Overview

MediTrack follows a microservices architecture with event-driven communication via RabbitMQ and a React SPA frontend secured by Duende IdentityServer.

## Services

| Service | Port | Responsibility |
|---|---|---|
| Identity.API | 5001 | Authentication & Authorization (OAuth2 / OIDC) |
| Patient.API | 5002 | Patient CRUD, demographics |
| Appointment.API | 5003 | Appointment scheduling & calendar |
| MedicalRecords.API | 5004 | Medical history, diagnoses, prescriptions |
| Notification.Worker | — | Background worker for notifications |
| MediTrack.Web | 3000 | React SPA |

## Infrastructure

- **Database**: SQL Server 2022 — one database per service (database-per-service pattern)
- **Message Broker**: RabbitMQ 4 — async integration events
- **Observability**: OpenTelemetry → OTLP exporter (compatible with Jaeger, Grafana Tempo, etc.)

## Key Patterns

- **Outbox Pattern**: `IntegrationEventLogEF` ensures at-least-once delivery of integration events
- **DDD**: Applied only to `MedicalRecords` bounded context (Domain / Infrastructure separation)
- **CQRS**: Planned for query-heavy read paths
- **Saga**: Planned for appointment-booking workflows spanning multiple services

## Project Dependencies

```
MediTrack.Shared
  └── EventBus
        └── EventBusRabbitMQ
        └── IntegrationEventLogEF
              └── MedicalRecords.Infrastructure
                    └── MedicalRecords.Domain
MediTrack.ServiceDefaults
  └── Identity.API
  └── Patient.API
  └── Appointment.API
  └── MedicalRecords.API
  └── Notification.Worker
```
