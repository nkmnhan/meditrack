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

### Planned Services

| Service | Bounded Context | Responsibility |
|---|---|---|
| Emergen AI Agent | AI Orchestration | MCP client — orchestrates clinical workflows via MCP tool calls |
| FHIR MCP Server | Interoperability | Maps domain models to FHIR R4, multi-EMR auth provider pattern |
| Knowledge MCP Server | Knowledge | RAG pipeline (pgvector), clinical skills library |
| Session MCP Server | Consultation | Real-time audio → STT → transcript, chat history |

## MCP Architecture Layer

Emergen AI is the MCP client that orchestrates multiple MCP servers. All AI features go through the MCP protocol — the architecture is LLM-agnostic.

```
┌───────────────────────────────────────────────────────────────┐
│                Doctor Dashboard / Mobile App                    │
│              Live transcript · Emergen AI button                │
│                    Suggestion cards                              │
└──────────────────────┬────────────────────────────────────────┘
                       │ SignalR (real-time)
┌──────────────────────▼────────────────────────────────────────┐
│              Emergen AI Agent (MCP Client)                      │
│   Orchestrates clinical workflows via MCP tool calls            │
│   On-demand trigger + batched (every 5 utterances / 30s)       │
└───────┬──────────────┬──────────────┬─────────────────────────┘
        │ MCP          │ MCP          │ MCP
        ▼              ▼              ▼
  ┌───────────┐  ┌──────────────┐  ┌──────────────┐
  │ FHIR MCP  │  │ Knowledge    │  │ Session MCP  │
  │ Server    │  │ MCP Server   │  │ Server       │
  └─────┬─────┘  └──────┬───────┘  └──────────────┘
        │               │
        ▼               ▼
  MediTrack          PostgreSQL
  Domain APIs        + pgvector
```

## Two-Layer Security Model

### Layer 1: User Authentication (User ↔ MCP Client)

User authenticates via Duende IdentityServer (OIDC). The Emergen AI agent receives user context and consent scope.

### Layer 2: EMR Backend Authentication (MCP Server ↔ EMR)

MCP servers hold service credentials registered with EMR backends. Authentication via SMART on FHIR:

| Provider | Auth Strategy |
|----------|--------------|
| **Epic** | JWT Bearer Grant (RS384-signed JWT → exchange for access token) |
| **Cerner** | OAuth2 Client Credentials Flow |
| **MediTrack internal** | Direct API calls (no external OAuth needed initially) |

**FHIR provider pattern**: Each EMR backend implements `IFhirProvider` with its own auth strategy. Token caching with thread-safe double-check locking.

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
