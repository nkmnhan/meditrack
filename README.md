# MediTrack

> **Last updated**: 2026-02-25

A healthcare management platform with an **AI-powered medical secretary** that listens to doctor-patient conversations in real time and provides live clinical suggestions to the doctor.

Built with microservices architecture, HIPAA-compliant patterns, and modern full-stack technologies.

> **Educational Project**: Personal learning project for full-stack development, AI integration, and healthcare data standards. Not intended for production use with real patient data.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                      │
│         Doctor Dashboard  ·  Admin Panel  ·  Patient UI      │
└─────────────────────────┬────────────────────────────────────┘
                          │ OIDC / JWT
┌─────────────────────────▼────────────────────────────────────┐
│                    Identity.API (Duende IS)                   │
│            OAuth 2.0 + RBAC + Token Management               │
└─────────────────────────┬────────────────────────────────────┘
                          │ JWT Bearer
  ┌───────────┬───────────┼───────────┬──────────────┐
  ▼           ▼           ▼           ▼              ▼
Patient   Appointment  MedicalRec  Session       AI Agent
 .API       .API        .API       Service       Service
                                  (SignalR)    (RAG + LLM)
  │           │           │           │              │
  └───────────┴───────────┴───────────┴──────┬───────┘
                                             ▼
                                    RabbitMQ (EventBus)
                                             │
                                    Notification.Worker
                                   (Audit · Reminders)
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

### Infrastructure

| Tool | Purpose | License |
|------|---------|---------|
| Docker + Docker Compose | Container orchestration | Apache 2.0 |
| SQL Server 2022 | Database (current) | **Commercial** (free Developer/Express) |
| RabbitMQ | Message broker | MPL 2.0 |
| PostgreSQL | Database (planned migration) | PostgreSQL License (free) |

> **Licensing note**: Duende IdentityServer and SQL Server are the only non-free dependencies. PostgreSQL migration is planned to eliminate the SQL Server dependency. See [plans/replace-mssql-with-postgres.md](plans/replace-mssql-with-postgres.md).

---

## Current Focus: Medical AI Secretary

Real-time AI clinical assistant — see [full design](docs/medical-ai-architecture-summary.md).

```
Doctor's phone (mic) ──► SignalR ──► Speech-to-Text (diarization)
                                          │
                                    Transcript + speaker labels
                                          │
                              ┌───────────▼────────────┐
                              │  RAG: pgvector search   │
                              │  + LLM (Claude / GPT)   │
                              └───────────┬────────────┘
                                          │
                           Live suggestions on Doctor's dashboard
```

**Key components:**
- **Session Service** — SignalR hub, audio streaming, transcript storage
- **AI Agent Service** — RAG pipeline with pgvector, LLM suggestions
- **Admin Service** — Knowledge base CRUD, agent config, suggestion review

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Foundation | Done | Docker, ServiceDefaults, EventBus, CPM |
| 2. Identity & Auth | Done | Duende IS, OIDC, RBAC, React integration |
| 3. Domain Services | Done | Patient, Appointment, MedicalRecords, Notification |
| 4. Security & Compliance | Done | PHI audit, TDE, MFA design, HIPAA checklist |
| 5. Patient Management UI | Done | React feature, business rules, dev seeding |
| **6. Medical AI Secretary** | **Next** | Real-time AI clinical assistant |
| 7. Remaining Frontend | Planned | Appointment UI, Records viewer, SignalR notifications |
| 8. Cloud Deployment | Planned | Azure, CI/CD, Key Vault, App Insights |

---

## Quick Start

```bash
# Clone and configure
git clone https://github.com/nkmnhan/meditrack.git && cd meditrack
cp .env.example .env  # edit with your SA_PASSWORD

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
| [Medical AI Architecture](docs/medical-ai-architecture-summary.md) | AI Secretary full design — services, RAG, STT, schema |
| [Business Logic & Rules](docs/business-logic.md) | Domain rules, workflows, and use cases |
| [Architecture](docs/architecture.md) | System overview and service boundaries |
| [HIPAA Compliance](docs/hipaa-compliance-checklist.md) | PHI handling requirements and checklist |
| [Observability](docs/observability.md) | OpenTelemetry, tracing, and monitoring |
| [TDE Configuration](docs/tde-configuration.md) | SQL Server Transparent Data Encryption |
| [MFA Design](docs/mfa-design.md) | Multi-factor authentication architecture |
| [Token Refresh Design](docs/token-refresh-design.md) | Token lifecycle and silent renewal |
| [Test Data Seeding](docs/SEEDING.md) | Bogus library data generation |
| [Security](docs/security.md) | Security policies and practices |
| [Deployment](docs/deployment.md) | Deployment guide |

### Plans

| Plan | Description |
|------|-------------|
| [Replace MSSQL with PostgreSQL](plans/replace-mssql-with-postgres.md) | Migrate all services from SQL Server to PostgreSQL |
| [Fix RTK Query Auth](plans/fix-rtk-query-auth.md) | Resolve token handling gap between Axios and RTK Query |

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
