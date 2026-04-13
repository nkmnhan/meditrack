---
paths:
  - "**/*"
---

# Shorthand Aliases

When the user says these terms, go directly to the right location:

| Term | Means | Path |
|------|-------|------|
| **nexus** | Aspire.Nexus orchestrator | `src/Aspire.Nexus/` |
| **design** | Lovable design system (git submodule) | `design/` |
| **clara** | Clara AI clinical companion | `src/Clara.API/` |
| **web** | React frontend | `src/MediTrack.Web/` |
| **identity** | Duende IdentityServer | `src/Identity.API/` |
| **patient** | Patient management | `src/Patient.API/` |
| **appointment** | Appointment scheduling | `src/Appointment.API/` |
| **records** | Medical records (DDD) | `src/MedicalRecords.Domain/` + `.Infrastructure/` + `.API/` |
| **defaults** | Shared service infrastructure | `src/MediTrack.ServiceDefaults/` |
| **eventbus** | RabbitMQ event bus | `src/EventBus/` + `src/EventBusRabbitMQ/` |
| **outbox** | Integration event log | `src/IntegrationEventLogEF/` |
| **notification** | Background worker | `src/Notification.Worker/` |
| **simulator** | Test data seeder | `src/MediTrack.Simulator/` |
