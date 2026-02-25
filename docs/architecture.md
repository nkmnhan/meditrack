# MediTrack — Architecture

## Overview

MediTrack is an MCP-native EMR platform with an AI clinical companion (**Emergen AI**). It follows a microservices architecture with event-driven communication via RabbitMQ, a React SPA frontend secured by Duende IdentityServer, and an MCP layer for LLM-agnostic AI features.

## Users

| Role | Description |
|------|-------------|
| **Doctor** | Primary user. Sees live transcript, triggers Emergen AI, reviews suggestions, manages patients and appointments. |
| **Patient** | Views own records, books appointments, receives notifications. Cannot access other patients' data. |
| **Admin** | Manages knowledge base, agent configuration, clinical skills, user accounts, and system settings. |

## Services

| Service | Port | Bounded Context | Responsibility |
|---|---|---|---|
| Identity.API | 5001 | Identity | Authentication & Authorization (OAuth2 / OIDC) |
| Patient.API | 5002 | Patient | Patient CRUD, demographics, search |
| Appointment.API | 5003 | Scheduling | Appointment scheduling & calendar |
| MedicalRecords.API | 5004 | Clinical | Medical history, diagnoses, prescriptions (DDD) |
| Notification.Worker | — | Cross-cutting | Background worker for notifications & PHI audit |
| MediTrack.Web | 3000 | — | React SPA (doctor, admin, patient UIs) |

**Total: 7 containers** (6 services + frontend)

### Planned Services

| Service | Bounded Context | Responsibility |
|---|---|---|
| EmergenAI.API | AI + Consultation | Single service hosting: MCP tools (FHIR, Knowledge, Session), agent orchestration, SignalR hub, real-time audio → STT. Rationale: At 3K users (~30 concurrent sessions), no performance justification for separate containers. |

**Simplified from original plan**: Originally 3 separate MCP servers (FHIR, Knowledge, Session) + agent service = 4 containers. Now 1 container. Savings: ~$210-420/mo infra, simpler deployment, faster development.

## MCP Architecture Layer

Emergen AI is the MCP client orchestrating MCP tools. All AI features go through the MCP protocol — the architecture is LLM-agnostic. At 3,000 users, all MCP tools are hosted in a single service (EmergenAI.API) for simplicity.

```
┌───────────────────────────────────────────────────────────────┐
│                Doctor Dashboard / Mobile App                    │
│              Live transcript · Emergen AI button                │
│                    Suggestion cards                              │
└──────────────────────┬────────────────────────────────────────┘
                       │ SignalR (real-time)
┌──────────────────────▼────────────────────────────────────────┐
│                    EmergenAI.API                                │
│  • MCP Server (fhir_*, knowledge_*, session_* tools)           │
│  • Agent orchestration (MCP client)                             │
│  • SignalR hub (real-time transcript)                          │
│  • IFhirProvider (internal only for MVP)                        │
│  • Skills loaded from YAML (skills/core/)                       │
└───────┬──────────────┬──────────────────────────────────────────┘
        │              │
        ▼              ▼
  MediTrack          PostgreSQL
  Domain APIs        + pgvector
  (Patient, Appt,    (knowledge base)
   Records)
```

## Two-Layer Security Model

### Layer 1: User Authentication (User ↔ MCP Client)

User authenticates via Duende IdentityServer (OIDC). The Emergen AI agent receives user context and consent scope.

### Layer 2: EMR Backend Authentication (MCP Server ↔ EMR)

MCP servers hold service credentials registered with EMR backends. Authentication via SMART on FHIR:

| Provider | Auth Strategy |
|----------|--------------|
| **MediTrack internal** | Direct API calls using existing JWT (Phase 6) |
| **Epic** | JWT Bearer Grant (RS384) — deferred to Phase 8 |
| **Cerner** | OAuth2 Client Credentials — deferred to Phase 8 |

**FHIR provider pattern**: Each EMR backend implements `IFhirProvider` with its own auth strategy. Token caching with thread-safe `SemaphoreSlim` double-check locking. Proactive refresh 60s before expiry; retry once on 401 with force-refresh.

## Infrastructure

- **Database**: SQL Server 2022 (current) — one database per service (database-per-service pattern). PostgreSQL migration planned.
- **Vector Database**: PostgreSQL + pgvector (planned) — knowledge base embeddings for RAG.
- **Message Broker**: RabbitMQ 4 — async integration events.
- **Observability**: OpenTelemetry → OTLP exporter (compatible with Jaeger, Grafana Tempo, etc.).

## Key Patterns

- **Outbox Pattern**: `IntegrationEventLogEF` ensures at-least-once delivery of integration events.
- **DDD**: Applied to `MedicalRecords` bounded context (Domain / Infrastructure separation).
- **CQRS**: MediatR commands (writes) and queries (reads) in Application layer.
- **MCP Protocol**: AI agent communicates with backend tools via MCP — decouples AI from specific LLM vendors.
- **Provider Pattern**: `IFhirProvider` abstracts EMR-specific auth and API differences.
- **Fire-and-Forget Audit**: PHI access audit events published asynchronously — audit never crashes business operations.

## Auth Flow Summary

1. User logs in via React SPA → redirected to Duende IdentityServer (OIDC Authorization Code + PKCE)
2. IdentityServer issues JWT with claims (sub, roles, scopes)
3. React stores tokens via `oidc-client-ts`, attaches Bearer token to API requests
4. Each API validates JWT against IdentityServer discovery document
5. Emergen AI agent receives user context from Layer 1 auth, authenticates to EMR backends via Layer 2

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
