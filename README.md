# MediTrack

A healthcare management system built for practicing full-stack development with modern technologies and understanding HIPAA/PHI compliance requirements.

> **⚠️ Educational Project**: This is a personal learning project to practice full-stack development and healthcare data standards. Not intended for production use with real patient data.

## 🎯 Project Goals

- Practice building a **HIPAA-compliant** healthcare application
- Learn secure handling of **Protected Health Information (PHI)**
- Develop full-stack skills with enterprise-grade technologies
- Understand medical data standards and regulations
- Implement enterprise-grade authentication with **OAuth 2.0 & OpenID Connect**
- Practice **microservices architecture** with event-driven communication

## 🛠️ Tech Stack

### Frontend

| Category | Technology | Details |
|---|---|---|
| **Framework** | React + Vite | UI framework with fast dev server |
| **Language** | TypeScript | Type safety |
| **Routing** | React Router v6 | `BrowserRouter`, `ProtectedRoute` (auth check), `RoleGuard` (role/permission check) |
| **State Management** | Redux Toolkit | Page/UI state |
| **Server State** | RTK Query | API data fetching, caching |
| **Forms** | Zod | Schema validation + TypeScript type inference |
| **Authentication** | OIDC + OAuth 2.0 | `oidc-client-ts` library, Identity Server 4 |
| **HTTP** | Axios | Auth token interceptors, global error handling |
| **Styling** | Tailwind CSS | Utility-first classes — **always prefer Tailwind over custom CSS** |
| **Class Utilities** | clsx + tailwind-merge | `clsxMerge` util for conditional + conflict-free class composition |
| **Components** | shadcn/ui | Pre-built accessible components |

**Code Patterns**
- Feature-based folder structure
- `Component` — view only (dumb, presentational JSX)
- `Custom Hook` — all logic (ViewModel pattern)
- `Service` — API calls only
- `Store` — state shape only
- Barrel exports (`index.ts`) — clean imports per feature

**Performance**
- `React.memo` — prevent unnecessary re-renders
- `useCallback` — stable function references
- `useMemo` — cache expensive calculations
- RTK Query — built-in caching for API data

### Backend

| Category | Technology | Details |
|---|---|---|
| **Framework** | ASP.NET Core (.NET 8) | One Web API per microservice |
| **ORM** | Entity Framework Core | Code-first migrations, per-service DB context |
| **Validation** | FluentValidation | Input validation per service |
| **Mapping** | AutoMapper | DTO ↔ Domain mapping |
| **Messaging** | RabbitMQ | Async integration events between services |
| **Outbox** | IntegrationEventLogEF | Reliable event publishing within EF transactions |
| **Shared defaults** | MediTrack.ServiceDefaults | Health checks, OpenTelemetry, Polly resilience — shared across all services |

**Code Patterns**
- `MediTrack.ServiceDefaults` — one project reference gives every service: health endpoints, distributed tracing, HTTP resilience
- `EventBus` (interfaces) + `EventBusRabbitMQ` (implementation) — swap RabbitMQ for Azure Service Bus without touching services
- DDD layering on `MedicalRecords` — `Domain` / `Infrastructure` separated (complex domain justifies it)
- Per-service database — each service owns its own SQL Server database schema

### Authentication & Security

- **Duende IdentityServer** — self-hosted OIDC/OAuth 2.0 identity provider
  - Authorization Code Flow with PKCE (browser clients)
  - Client Credentials Flow (service-to-service)
  - Refresh Token Flow
  - Role-based access control (RBAC) via claims
  - Per-service API scopes

### Database

- **SQL Server** — one logical database per microservice (separate schemas/databases)
- **Azure SQL Database** — cloud hosting

| Database | Owner service | Contains |
|---|---|---|
| `MediTrack.Identity` | Identity.API | Users, roles, tokens, grants |
| `MediTrack.Patients` | Patient.API | Patient profiles, contacts, insurance |
| `MediTrack.Appointments` | Appointment.API | Appointments, schedules, availability |
| `MediTrack.Records` | MedicalRecords.API | EHR, prescriptions, lab results |
| `MediTrack.Events` | IntegrationEventLogEF | Outbox event log (shared by all services) |

### Infrastructure & DevOps

| Category | Technology | Details |
|---|---|---|
| **Containers** | Docker + Docker Compose | All services run as containers locally |
| **Cloud** | Azure App Service / ACI | Service hosting |
| **Secrets** | Azure Key Vault | Secrets management |
| **Storage** | Azure Blob Storage | Medical document storage |
| **Monitoring** | Application Insights | Telemetry, tracing |
| **CI/CD** | GitHub Actions | Build, test, deploy pipeline |

---

## 🏥 Domain: Healthcare Management

### Core Features (Planned)

#### Patient Management
- Patient registration and profiles
- Medical history tracking
- Contact information and emergency contacts
- Insurance information

#### Appointment System
- Schedule and manage appointments
- Doctor availability management
- Appointment reminders
- Waitlist management

#### Medical Records
- Electronic Health Records (EHR)
- Visit notes and diagnosis
- Prescription management
- Lab results tracking
- Medical document storage

#### Security & Compliance
- **OAuth 2.0 / OpenID Connect** authentication
- **Role-based access control (RBAC)**
  - Admin: Full system access
  - Doctor: Patient records, appointments, prescriptions
  - Nurse: Patient vitals, appointments
  - Patient: Own records only
  - Receptionist: Appointments, basic patient info
- Audit logging for PHI access
- Data encryption at rest and in transit
- HIPAA compliance considerations
- Multi-factor authentication (MFA) support

---

## 📋 HIPAA/PHI Learning Objectives

- Implement proper **data encryption**
- Create comprehensive **audit trails** (via EventBus + Notification.Worker)
- Practice **least privilege access** control
- Secure **data transmission** (HTTPS, TLS)
- Handle **breach notification** scenarios
- Implement **data retention** policies
- Practice **de-identification** techniques
- **Token-based authentication** with proper expiration
- **Secure token storage** practices

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Docker Compose Network                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                 MediTrack.Web  (Port 3000)                   │   │
│  │                 React + Vite → nginx                         │   │
│  └───────────────────────┬──────────────────────────────────────┘   │
│                          │ OIDC / JWT Bearer                        │
│  ┌───────────────────────▼──────────────────────────────────────┐   │
│  │               Identity.API  (Port 5001)                      │   │
│  │               Duende IdentityServer                          │   │
│  │      Token Generation · RBAC · OpenID Connect Provider       │   │
│  │               MediTrack.Identity  (SQL Server)               │   │
│  └───────────────────────┬──────────────────────────────────────┘   │
│                          │ JWT Bearer (validated per service)       │
│  ┌───────────────────────┼──────────────────────────────────────┐   │
│  │           Domain Microservices                               │   │
│  │                                                              │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │   │
│  │  │ Patient.API │  │Appointment   │  │ MedicalRecords.API │  │   │
│  │  │  Port 5002  │  │.API Port 5003│  │     Port 5004      │  │   │
│  │  │             │  │              │  │ ┌────────────────┐  │  │   │
│  │  │  Patients   │  │ Appointments │  │ │  .Domain (DDD) │  │  │   │
│  │  │  (SQL Srv)  │  │  (SQL Srv)   │  │ │ .Infrastructure│  │  │   │
│  │  └──────┬──────┘  └──────┬───────┘  │ └────────────────┘  │  │   │
│  │         │                │          │    Records (SQL Srv) │  │   │
│  └─────────┼────────────────┼──────────┴──────────┬───────────┘   │
│            └────────────────┼───────────────────────┘              │
│                             │  Integration Events (Outbox)          │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │                     RabbitMQ  (Port 5672)                    │   │
│  │             EventBus abstraction + RabbitMQ impl             │   │
│  │          IntegrationEventLogEF  (Outbox pattern)             │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                        │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │               Notification.Worker  (Background)              │   │
│  │        Appointment reminders · PHI audit log events          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ─────────────── MediTrack.ServiceDefaults (shared) ─────────────  │
│       Health checks · OpenTelemetry tracing · Polly resilience     │
└─────────────────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
1. User visits React app
2. React (oidc-client-ts) → redirects to Identity.API login page
3. User enters credentials → Identity.API issues tokens
4. React stores tokens → attaches access token to all API requests
5. Patient/Appointment/Records API → validates JWT locally (no roundtrip to Identity)
6. Service publishes integration event → RabbitMQ → Notification.Worker logs PHI audit trail
```

### Event Flow (Outbox Pattern)

```
1. Service saves domain change + integration event in same DB transaction
   (IntegrationEventLogEF — event is NOT lost if service crashes after step 1)
2. Background relay reads unpublished events → publishes to RabbitMQ
3. Notification.Worker consumes event → writes audit log / sends reminder
```

---

## 📁 Project Structure

```
meditrack/
├── src/
│   │
│   ├── MediTrack.ServiceDefaults/          # Shared: health checks, OpenTelemetry, Polly
│   ├── MediTrack.Shared/                   # Shared DTOs, contracts, base classes
│   │
│   ├── Identity.API/                       # Duende IdentityServer (OIDC provider)
│   │   ├── Config.cs                       # Clients, resources, scopes
│   │   ├── Models/
│   │   ├── Data/
│   │   ├── Dockerfile
│   │   └── Program.cs
│   │
│   ├── Patient.API/                        # Patient management microservice
│   │   ├── Controllers/
│   │   ├── Models/
│   │   ├── Services/
│   │   ├── Data/
│   │   ├── Dockerfile
│   │   └── Program.cs
│   │
│   ├── Appointment.API/                    # Appointment scheduling microservice
│   │   ├── Controllers/
│   │   ├── Models/
│   │   ├── Services/
│   │   ├── Data/
│   │   ├── Dockerfile
│   │   └── Program.cs
│   │
│   ├── MedicalRecords.API/                 # EHR REST API layer
│   │   ├── Controllers/
│   │   ├── Dockerfile
│   │   └── Program.cs
│   │
│   ├── MedicalRecords.Domain/              # DDD: aggregates, domain events, value objects
│   │   ├── Aggregates/
│   │   ├── Events/
│   │   └── Repositories/                  # interfaces only
│   │
│   ├── MedicalRecords.Infrastructure/      # EF Core + SQL Server implementations
│   │   ├── Data/
│   │   ├── Repositories/
│   │   └── Migrations/
│   │
│   ├── Notification.Worker/                # Background: reminders, audit log consumer
│   │   ├── Workers/
│   │   ├── Dockerfile
│   │   └── Program.cs
│   │
│   ├── EventBus/                           # Abstraction: IEventBus, IntegrationEvent base
│   ├── EventBusRabbitMQ/                   # RabbitMQ implementation (swap for ServiceBus in prod)
│   ├── IntegrationEventLogEF/              # Outbox: saves events in EF transaction
│   │
│   └── MediTrack.Web/                      # React + Vite frontend
│       ├── src/
│       │   ├── features/
│       │   │   ├── patients/               # patient feature (component + hook + service + store)
│       │   │   ├── appointments/
│       │   │   ├── records/
│       │   │   └── auth/
│       │   ├── shared/
│       │   └── App.tsx
│       ├── Dockerfile
│       └── package.json
│
├── tests/
│   ├── Patient.API.Tests/
│   ├── Appointment.API.Tests/
│   ├── MedicalRecords.Domain.Tests/
│   └── Integration.Tests/
│
├── docs/
│   ├── architecture.md
│   ├── security.md
│   └── deployment.md
│
├── docker-compose.yml                      # All services + infrastructure
├── docker-compose.override.yml             # Dev overrides (ports, volumes, env vars)
├── Directory.Build.props                   # Global MSBuild settings (nullable, TFM, etc.)
├── Directory.Packages.props                # Central NuGet version management
├── .gitignore
├── README.md
└── MediTrack.sln
```

---

## 🚀 Getting Started

### Prerequisites

- **Docker Desktop** — all services run in containers
- Node.js 18+ — only needed for local frontend development outside Docker
- .NET 8 SDK — only needed for running/debugging services outside Docker
- Visual Studio 2022 / VS Code / Rider

### Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/meditrack.git
cd meditrack

# 2. Copy environment file and configure secrets
cp .env.example .env
# Edit .env with your SA password and other values

# 3. Start all services
docker-compose up -d

# 4. Apply database migrations (first run only)
docker-compose exec patient-api dotnet ef database update
docker-compose exec appointment-api dotnet ef database update
docker-compose exec medicalrecords-api dotnet ef database update
docker-compose exec identity-api dotnet ef database update

# 5. Open the app
# Frontend:          http://localhost:3000
# Identity Server:   http://localhost:5001
# Patient API:       http://localhost:5002
# Appointment API:   http://localhost:5003
# Records API:       http://localhost:5004
# RabbitMQ UI:       http://localhost:15672  (guest/guest)
```

### docker-compose.yml (overview)

```yaml
services:
  web:
    build: src/MediTrack.Web
    ports: ["3000:80"]

  identity-api:
    build: src/Identity.API
    ports: ["5001:8080"]
    depends_on: [sqlserver]

  patient-api:
    build: src/Patient.API
    ports: ["5002:8080"]
    depends_on: [sqlserver, rabbitmq]

  appointment-api:
    build: src/Appointment.API
    ports: ["5003:8080"]
    depends_on: [sqlserver, rabbitmq]

  medicalrecords-api:
    build: src/MedicalRecords.API
    ports: ["5004:8080"]
    depends_on: [sqlserver, rabbitmq]

  notification-worker:
    build: src/Notification.Worker
    depends_on: [rabbitmq]

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    ports: ["1433:1433"]
    environment:
      ACCEPT_EULA: "Y"
      SA_PASSWORD: "${SA_PASSWORD}"

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
```

### Environment Variables (.env)

```env
SA_PASSWORD=YourStrong@Password

# Identity Server
IDENTITY_URL=http://identity-api:8080

# API URLs (used by frontend)
VITE_IDENTITY_URL=http://localhost:5001
VITE_PATIENT_API_URL=http://localhost:5002
VITE_APPOINTMENT_API_URL=http://localhost:5003
VITE_RECORDS_API_URL=http://localhost:5004
VITE_CLIENT_ID=meditrack-web
VITE_REDIRECT_URI=http://localhost:3000/callback

# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
```

---

## 🔐 Authentication Setup

### Duende IdentityServer Configuration

**Supported Flows:**
- Authorization Code Flow with PKCE (React frontend)
- Client Credentials Flow (service-to-service)
- Refresh Token Flow

**Roles:**
- `Admin` - Full system access
- `Doctor` - Medical records, prescriptions
- `Nurse` - Patient care, vitals
- `Receptionist` - Appointments, scheduling
- `Patient` - Personal records only

**API Scopes (per service):**
- `openid` - OpenID Connect
- `profile` - User profile
- `patient-api` - Patient service access
- `appointment-api` - Appointment service access
- `records-api` - Medical records access
- `offline_access` - Refresh tokens

---

## 📚 Learning Resources

### OAuth 2.0 & OpenID Connect
- [Duende IdentityServer Documentation](https://docs.duendesoftware.com/identityserver/v7)
- [OAuth 2.0 Simplified](https://aaronparecki.com/oauth-2-simplified/)
- [OpenID Connect Explained](https://openid.net/connect/)

### Microservices & Event-Driven Architecture
- [dotnet/eShop reference app](https://github.com/dotnet/eShop) — architecture inspiration
- [Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [RabbitMQ .NET Client Docs](https://www.rabbitmq.com/dotnet.html)

### HIPAA Compliance
- [HIPAA Privacy Rule](https://www.hhs.gov/hipaa/for-professionals/privacy/index.html)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [Azure HIPAA Compliance](https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-hipaa-us)

### Healthcare Standards
- HL7 FHIR (Fast Healthcare Interoperability Resources)
- ICD-10 (Diagnosis codes)
- CPT (Procedure codes)

---

## 🗺️ Roadmap

### Phase 1: Foundation
- [x] Project setup & README
- [x] Docker Compose with SQL Server + RabbitMQ
- [x] `MediTrack.ServiceDefaults` — shared health checks, OpenTelemetry, Polly
- [x] `EventBus` + `EventBusRabbitMQ` + `IntegrationEventLogEF` infrastructure
- [x] `Directory.Build.props` + `Directory.Packages.props` central config

### Phase 2: Identity & Auth
- [ ] Duende IdentityServer configuration (clients, scopes, roles)
- [ ] Database schema for identity
- [ ] User registration and login
- [ ] RBAC — role claims in tokens
- [ ] React OIDC integration (`oidc-client-ts`, `ProtectedRoute`, `RoleGuard`)

### Phase 3: Domain Services
- [ ] Patient.API — CRUD, EF Core, FluentValidation
- [ ] Appointment.API — scheduling, availability
- [ ] MedicalRecords.API + Domain + Infrastructure — EHR with DDD
- [ ] Notification.Worker — consume events, appointment reminders
- [ ] Integration events between services via RabbitMQ

### Phase 4: Security & Compliance
- [ ] Comprehensive PHI audit logging (via outbox + Notification.Worker)
- [ ] Data encryption at rest (SQL Server TDE)
- [ ] Multi-factor authentication (MFA)
- [ ] Token refresh + silent renew in React
- [ ] HIPAA compliance checklist

### Phase 5: Frontend Features
- [ ] Patient management UI (feature-based: component + hook + service + store)
- [ ] Appointment scheduling UI
- [ ] Medical records viewer
- [ ] Role-based UI rendering (hide/show by role)
- [ ] Real-time notifications (SignalR)

### Phase 6: Cloud Deployment
- [ ] Push images to Azure Container Registry
- [ ] Deploy services to Azure App Service / ACI
- [ ] Azure SQL Database per service
- [ ] Azure Service Bus (swap for RabbitMQ in prod via `EventBusServiceBus`)
- [ ] Azure Key Vault for secrets
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Application Insights telemetry

---

## 🔧 Development Commands

```bash
# Start all services (detached)
docker-compose up -d

# Start with rebuild
docker-compose up -d --build

# Start a specific service only
docker-compose up -d patient-api

# View logs
docker-compose logs -f patient-api
docker-compose logs -f rabbitmq

# Stop all services
docker-compose down

# Stop and remove volumes (reset databases)
docker-compose down -v

# Run database migrations inside container
docker-compose exec patient-api dotnet ef database update
docker-compose exec appointment-api dotnet ef database update

# Add a new migration
docker-compose exec patient-api dotnet ef migrations add <MigrationName>

# Run all tests
dotnet test

# Build for production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## 📝 Notes

### What I'm Learning
- OAuth 2.0 and OpenID Connect protocols
- Microservices architecture (domain-based service decomposition)
- Event-driven communication with RabbitMQ
- Outbox pattern for reliable PHI audit trails
- DDD (Domain-Driven Design) for complex healthcare domains
- Docker Compose multi-service orchestration
- Handling sensitive medical data securely
- Claims-based authorization across services
- Cloud deployment with Azure

### Challenges & Solutions
_Document challenges and solutions here as you encounter them_

---

## ⚖️ License & Disclaimer

### License
MIT License - This is a personal learning project.

### Duende IdentityServer License
This project uses **Duende IdentityServer** which is:
- ✅ **FREE** for development, testing, and personal projects
- ✅ **FREE** for companies/individuals making less than $1M USD annually
- ⚠️ Requires a **commercial license** for production use in larger organizations

See [Duende Software Licensing](https://duendesoftware.com/products/identityserver#pricing) for details.

### Medical Disclaimer
This project is created solely for educational and skill development purposes. It is **NOT** intended for use with real patient data or in actual healthcare settings. Always consult with legal and compliance experts before handling real Protected Health Information (PHI).

## 🤝 Contributing

This is a personal practice project, but feedback and suggestions are welcome!

## 📞 Contact

This is a personal practice project. Feel free to reach out for collaboration or questions!

---

**Practice Project** | Built with ❤️ for learning | Microservices · OAuth 2.0 · HIPAA | 2025
