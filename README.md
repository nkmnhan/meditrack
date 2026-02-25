# MediTrack

> **Last updated**: 2026-02-25

An **MCP-native EMR platform** with an AI clinical companion (**Emergen AI**) that listens to doctor-patient conversations in real time and provides live clinical suggestions to the doctor.

Built with microservices architecture, MCP (Model Context Protocol), HIPAA-compliant patterns, and modern full-stack technologies.

> **Educational Project**: Personal learning project for full-stack development, AI integration, and healthcare data standards. Not intended for production use with real patient data.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                      │
│    Doctor Dashboard · Emergen AI · Admin Panel · Patient UI  │
└─────────────────────────┬────────────────────────────────────┘
                          │ OIDC / JWT + SignalR
┌─────────────────────────▼────────────────────────────────────┐
│                    Identity.API (Duende IS)                   │
│            OAuth 2.0 + RBAC + Token Management               │
└─────────────────────────┬────────────────────────────────────┘
                          │ JWT Bearer
  ┌───────────┬───────────┼───────────┬──────────────┐
  ▼           ▼           ▼           ▼              ▼
Patient   Appointment  MedicalRec  EmergenAI.API  Notification
 .API       .API        .API       (MCP + Agent     .Worker
                                    + SignalR)    (Audit·Alerts)
  │           │           │           │              │
  └───────────┴───────────┴───────────┴──────┬───────┘
                                             ▼
                                    RabbitMQ (EventBus)
```

> Full architecture details: [docs/architecture.md](docs/architecture.md) · AI design: [docs/medical-ai-architecture-summary.md](docs/medical-ai-architecture-summary.md)

---

## Tech Stack & Licensing

### Backend

| Package | Purpose | License |
|---------|---------|---------|
| ASP.NET Core (.NET 10) | Web framework | MIT |
| Entity Framework Core | ORM | MIT |
| **Duende IdentityServer** | OIDC / OAuth 2.0 provider | **Commercial** (free < $1M revenue) |
| MediatR | CQRS / Mediator pattern | Apache 2.0 |
| FluentValidation | Input validation | Apache 2.0 |
| AutoMapper | DTO mapping | MIT |
| RabbitMQ.Client | Message bus | Apache 2.0 |
| OpenTelemetry | Observability / tracing | Apache 2.0 |
| IdentityModel | OIDC helpers | Apache 2.0 |
| Newtonsoft.Json | JSON serialization | MIT |
| Bogus | Test data generation | MIT |

### Frontend

| Package | Purpose | License |
|---------|---------|---------|
| React 19 + Vite | UI framework + build | MIT |
| TypeScript | Type safety | Apache 2.0 |
| Redux Toolkit + RTK Query | State + server cache | MIT |
| React Router v7 | Routing | MIT |
| React Hook Form + Zod | Forms + validation | MIT |
| Tailwind CSS + tailwind-merge | Styling | MIT |
| shadcn/ui + Lucide React | Components + icons | MIT |
| oidc-client-ts + react-oidc-context | Auth | Apache 2.0 / MIT |
| Axios | HTTP client | MIT |

### AI & Interoperability (Planned)

| Technology | Purpose | License |
|------------|---------|---------|
| MCP (Model Context Protocol) | LLM-agnostic AI tool protocol | MIT |
| FHIR R4 | Healthcare interoperability standard (planned) | HL7 (free) |
| SMART on FHIR | OAuth2 framework for EMR auth (planned) | HL7 (free) |
| pgvector | Vector embeddings for RAG knowledge base | PostgreSQL License (free) |

### Infrastructure

| Tool | Purpose | License |
|------|---------|---------|
| Docker + Docker Compose | Container orchestration | Apache 2.0 |
| PostgreSQL 17 + pgvector | Database + vector embeddings | PostgreSQL License (free) |
| RabbitMQ | Message broker | MPL 2.0 |

> **Licensing note**: Duende IdentityServer is the only non-free dependency (free for companies < $1M revenue).

---

## Current Focus: AI Clinical Companion (Emergen AI)

Real-time AI clinical assistant built on MCP — see [full design](docs/medical-ai-architecture-summary.md).

```
Doctor's phone (mic) ──► SignalR ──► Speech-to-Text (diarization)
                                          │
                                    Transcript + speaker labels
                                          │
                              ┌───────────▼────────────┐
                              │  Emergen AI Agent       │
                              │  (MCP Client)           │
                              │  LLM-agnostic via MCP   │
                              └───────────┬────────────┘
                                          │
                              ┌───────────▼────────────┐
                              │    EmergenAI.API        │
                              │  fhir_* · knowledge_*  │
                              │  session_* MCP tools   │
                              └───┬───────────────┬────┘
                                  │               │
                            MediTrack        PostgreSQL
                            Domain APIs      + pgvector
```

**Key components:**
- **EmergenAI.API** — Single service hosting: MCP tools (FHIR, Knowledge, Session), agent orchestration, SignalR hub. Rationale: ~30 concurrent sessions at 3K users — no performance justification for separate containers.
- **Clinical skills** — YAML files in `skills/core/` loaded into memory (no DB/admin UI for MVP)
- **IFhirProvider** — MediTrack internal implementation only (Epic/Cerner deferred to Phase 8)

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Foundation | Done | Docker, ServiceDefaults, EventBus, CPM |
| 2. Identity & Auth | Done | Duende IS, OIDC, RBAC, React integration |
| 3. Domain Services | Done | Patient, Appointment, MedicalRecords, Notification |
| 4. Security & Compliance | Done | PHI audit, TDE, MFA design, HIPAA checklist |
| 5. Patient Management UI | Done | React feature, business rules, dev seeding |
| **6. Emergen AI MVP** | **Next** | 8-10 weeks to functional AI clinical companion. See [MVP plan](plans/emergen-ai-mvp-plan.md) |
| 6a. PostgreSQL + pgvector | Done | Migrated from SQL Server, pgvector ready for embeddings |
| 6b. EmergenAI.API | Planned | Core service: MCP tools + agent + SignalR + Deepgram (4-5 weeks, 8 milestones) |
| 6c. Doctor Dashboard UI | Planned | Live transcript, suggestion cards, audio recording (2-3 weeks) |
| 7. Remaining Frontend | Planned | Appointment UI, Records viewer, SignalR notifications |
| 8. External EMR Integration | Planned | Epic/Cerner providers, SMART on FHIR, USCDI v3 compliance |
| 9. Advanced Features | Planned | Skills admin UI, adaptive batching, self-hosted Whisper |
| 10. Cloud Deployment + HA | Planned | Azure HA (2× instances + Redis backplane), CI/CD, Key Vault |

---

## Quick Start

```bash
# Clone and configure
git clone https://github.com/nkmnhan/meditrack.git && cd meditrack
cp .env.example .env  # edit with your POSTGRES_PASSWORD

# Start all services
docker-compose up -d --build

# Seed test data (optional)
curl -k -X POST "https://localhost:5002/api/dev/seed/patients?count=100"
```

| Service | URL |
|---------|-----|
| Frontend | https://localhost:3000 |
| Identity Server | https://localhost:5001 |
| Patient API | https://localhost:5002 |
| Appointment API | https://localhost:5003 |
| Records API | https://localhost:5004 |
| RabbitMQ UI | http://localhost:15672 (guest/guest) |

> See [docs/SEEDING.md](docs/SEEDING.md) for data generation options.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Medical AI Architecture](docs/medical-ai-architecture-summary.md) | Emergen AI — MCP-native clinical companion design |
| [Business Logic & Rules](docs/business-logic.md) | Domain rules, workflows, and use cases |
| [Architecture](docs/architecture.md) | System overview, MCP layer, and service boundaries |
| [EMR Compliance Status](docs/emr-compliance-status.md) | ONC/USCDI v3 scorecard and gap tracking |
| [HIPAA Compliance](docs/hipaa-compliance-checklist.md) | PHI handling requirements and checklist |
| [Observability](docs/observability.md) | OpenTelemetry, tracing, and monitoring |
| [TDE Configuration (Archived)](docs/tde-configuration.md) | SQL Server TDE — obsolete after PostgreSQL migration |
| [MFA Design](docs/mfa-design.md) | Multi-factor authentication architecture |
| [Token Refresh Design](docs/token-refresh-design.md) | Token lifecycle and silent renewal |
| [Test Data Seeding](docs/SEEDING.md) | Bogus library data generation |
| [Deployment](docs/deployment.md) | Deployment guide |

### Plans

| Plan | Description |
|------|-------------|
| [Emergen AI MVP](plans/emergen-ai-mvp-plan.md) | 8-10 week implementation plan for AI clinical companion. Defines minimal feature set, 8 milestones, acceptance criteria. |
| [OWASP Top 10 Hardening](plans/owasp-top-ten-hardening.md) | Systematic security hardening against OWASP Top 10 (2021) |
| [EMR Compliance Roadmap](plans/emr-compliance-roadmap.md) | FHIR R4, SMART on FHIR, USCDI v3 adoption plan |

---

## Commands

```bash
docker-compose up -d              # Start all services
docker-compose up -d --build      # Rebuild and start
docker-compose down               # Stop all services
docker-compose logs -f <service>  # Tail logs

# Frontend (src/MediTrack.Web/)
npm run dev                       # Dev server
npm run build                     # Production build
npm run lint                      # ESLint

# Backend
dotnet build                      # Build solution
dotnet test                       # Run tests
```

---

## License & Disclaimer

**MIT License** — Personal learning project.

**Duende IdentityServer**: Free for development/testing and companies < $1M revenue. [Pricing](https://duendesoftware.com/products/identityserver#pricing).

**Medical Disclaimer**: NOT intended for use with real patient data or actual healthcare settings. Consult legal and compliance experts before handling real PHI.
