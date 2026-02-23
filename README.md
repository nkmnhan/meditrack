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
| **Framework** | ASP.NET Core (.NET 10) | One Web API per microservice |
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

## � UX/UI Design System

> Inspired by [Mayo Clinic](https://www.mayoclinic.org/), [One Medical](https://www.onemedical.com/), [Mass General Brigham](https://www.massgeneralbrigham.org/) and other leading healthcare websites.

### Design Philosophy

- **Clean & Minimal** — Lots of white space for readability (healthcare data is dense)
- **Calming Colors** — Blues and teals evoke trust, professionalism, and healing
- **Accessible** — High contrast ratios, clear typography, WCAG 2.1 AA compliant
- **Professional** — Medical applications require a serious, trustworthy aesthetic
- **Action-Oriented** — Clear CTAs with visual hierarchy

### Color Design System

Located in `tailwind.config.ts` — all colors are available as Tailwind utilities.

#### 1. Primary Colors (Brand Identity)

**Medical Blue** — trust, professionalism, calm

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-50` | `#eff6ff` | Subtle backgrounds, hover states |
| `primary-100` | `#dbeafe` | Alert backgrounds, badges |
| `primary-500` | `#3b82f6` | Default primary |
| `primary-700` | `#1d4ed8` | **Buttons, headers, links** |
| `primary-900` | `#1e3a8a` | Dark mode, footer |

```tsx
<button className="bg-primary-700 hover:bg-primary-800 text-white">
  Schedule Appointment
</button>
```

#### 2. Secondary Colors (Supporting Elements)

**Healthcare Teal** — healing, clarity, freshness

| Token | Hex | Usage |
|-------|-----|-------|
| `secondary-50` | `#f0fdfa` | Card backgrounds |
| `secondary-500` | `#14b8a6` | Default secondary |
| `secondary-700` | `#0f766e` | **Secondary buttons, accents** |
| `secondary-900` | `#134e4a` | Dark accents |

```tsx
<span className="text-secondary-700">View medical history</span>
```

#### 3. Accent Colors (Visual Interest)

**Violet** — CTAs, innovation, calm authority (preferred over orange in healthcare — less alarming)

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-400` | `#c084fc` | Notifications |
| `accent-500` | `#a855f7` | **Primary CTAs, highlights** |
| `accent-600` | `#9333ea` | Hover state |
| `accent-700` | `#7c3aed` | Strong emphasis |

```tsx
<button className="bg-accent-500 hover:bg-accent-600 text-white">
  Book Now — Limited Slots
</button>
```

#### 4. Neutral Colors (Foundation)

**Slate Grays** — text, backgrounds, borders

| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-50` | `#f8fafc` | **Page background** |
| `neutral-100` | `#f1f5f9` | Card backgrounds |
| `neutral-200` | `#e2e8f0` | Borders, dividers |
| `neutral-400` | `#94a3b8` | Placeholder text |
| `neutral-500` | `#64748b` | Secondary text |
| `neutral-700` | `#334155` | **Body text** |
| `neutral-900` | `#0f172a` | **Headings** |

```tsx
<p className="text-neutral-700">Patient information</p>
<h1 className="text-neutral-900 font-bold">Dashboard</h1>
```

#### 5. Semantic Colors (Feedback & Status)

| Category | Token | Hex | Usage |
|----------|-------|-----|-------|
| **Success** | `success-500` | `#22c55e` | Confirmations, completed |
| **Warning** | `warning-500` | `#f59e0b` | Alerts, pending actions |
| **Error** | `error-500` | `#ef4444` | Errors, destructive actions |
| **Info** | `info-500` | `#0ea5e9` | Informational messages (sky blue — distinct from primary) |

```tsx
<div className="bg-success-50 border border-success-200 text-success-700 p-4 rounded-lg">
  ✓ Appointment confirmed for March 15, 2026 at 10:00 AM
</div>

<div className="bg-error-50 border border-error-200 text-error-700 p-4 rounded-lg">
  ✗ Failed to save patient record. Please try again.
</div>
```

#### 6. Medical Status Colors (Domain-Specific)

Appointment states and triage levels — use with Tailwind's opacity modifier for subtle backgrounds (e.g., `bg-[#3b82f6]/10`).

**Appointment Status**

| Token | Hex | Usage |
|-------|-----|-------|
| `status-scheduled` | `#3b82f6` | Upcoming appointments |
| `status-inProgress` | `#f59e0b` | Currently active |
| `status-completed` | `#22c55e` | Finished |
| `status-cancelled` | `#94a3b8` | Inactive/cancelled |
| `status-noShow` | `#ef4444` | Missed appointments |

**Triage Levels**

| Token | Hex | Usage |
|-------|-----|-------|
| `triage-critical` | `#dc2626` | Immediate attention required |
| `triage-urgent` | `#ea580c` | Needs priority handling |
| `triage-routine` | `#3b82f6` | Standard scheduling |

```tsx
<span className="inline-flex items-center rounded-full bg-[#3b82f6]/10 px-2.5 py-0.5 text-xs font-medium text-status-scheduled">
  Scheduled
</span>
<span className="inline-flex items-center rounded-full bg-[#22c55e]/10 px-2.5 py-0.5 text-xs font-medium text-status-completed">
  Completed
</span>
```

### Color Usage Rules

| Guideline | Do | Don't |
|-----------|-----|--------|
| **Primary for key actions** | `bg-primary-700` on "Save", "Submit" | Multiple primary buttons competing |
| **Accent for urgency only** | `bg-accent-500` on "Book Now - 2 slots left" | Accent on regular navigation |
| **Neutral for text** | `text-neutral-700` for body | Pure black (`#000`) for text |
| **Semantic for feedback** | `text-error-600` on validation errors | Red for non-error elements |
| **Sufficient contrast** | `text-white` on `bg-primary-700` | Light text on light backgrounds |
| **-500 and lighter = backgrounds only** | `bg-primary-50`, `border-primary-200` | `text-primary-500` on white (fails AA ~3:1) |
| **-600 or darker for text** | `text-primary-700` for links | `text-secondary-500` for body text |
| **Consistent backgrounds** | `bg-neutral-50` page, `bg-white` cards | Random background colors |

### Typography

**`font-sans`** (Inter) — default for all UI. **`font-serif`** (Georgia/Merriweather) — for medical documents and printable reports.

| Element | Class | Weight | Size |
|---------|-------|--------|------|
| H1 | `text-3xl font-bold text-neutral-900` | 700 | 30px |
| H2 | `text-2xl font-semibold text-neutral-900` | 600 | 24px |
| H3 | `text-xl font-semibold text-neutral-800` | 600 | 20px |
| Body | `text-base text-neutral-700` | 400 | 16px |
| Small | `text-sm text-neutral-500` | 400 | 14px |
| Label | `text-sm font-medium text-neutral-700` | 500 | 14px |
| Document | `font-serif text-base text-neutral-800` | 400 | 16px |

### Elevation (Box Shadows)

Keep shadows subtle — heavy shadows feel dated in healthcare UI.

| Level | Class | Usage |
|-------|-------|-------|
| **Low** | `shadow-sm` | Cards, subtle lift |
| **Medium** | `shadow-md` | Dropdowns, popovers |
| **High** | `shadow-lg` | Modals, dialogs |

### Spacing & Layout

| Token | Value | Usage |
|-------|-------|-------|
| **Page max-width** | `max-w-7xl` (80rem) | Main content container |
| **Page padding** | `px-4 sm:px-6 lg:px-8` | Responsive horizontal padding |
| **Section spacing** | `space-y-8` | Between major page sections |
| **Card padding** | `p-6` | Standard card interior |
| **Card gap** | `gap-6` | Between cards in a grid |
| **Form gap** | `space-y-4` | Between form fields |
| **Inline spacing** | `gap-2` / `gap-3` | Between icons and text, badges |

**Breakpoints** (Tailwind defaults):

| Prefix | Width | Typical usage |
|--------|-------|---------------|
| `sm` | 640px | Single → two columns |
| `md` | 768px | Sidebar appears |
| `lg` | 1024px | Full desktop layout |
| `xl` | 1280px | Wide dashboard grids |

```tsx
// Page layout
<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <div className="space-y-8">
    {/* sections */}
  </div>
</main>

// Responsive card grid
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {/* cards */}
</div>
```

### Icons

Use [Lucide React](https://lucide.dev/) — the icon library used by shadcn/ui. Tree-shakeable, consistent 24px grid, includes medical icons.

```bash
npm install lucide-react
```

```tsx
import { Stethoscope, CalendarDays, FileText, AlertTriangle } from "lucide-react";

// Standard icon size in UI
<Stethoscope className="h-5 w-5 text-primary-700" />

// Icon + text pattern
<div className="flex items-center gap-2">
  <CalendarDays className="h-4 w-4 text-neutral-500" />
  <span className="text-sm text-neutral-700">March 15, 2026</span>
</div>
```

### Component Patterns

```tsx
// Card
<div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
  <h3 className="text-lg font-semibold text-neutral-900">Patient Details</h3>
  <p className="mt-2 text-neutral-600">John Doe • DOB: 1985-03-15</p>
</div>

// Metric card (dashboard KPI)
<div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
  <p className="text-sm font-medium text-neutral-500">Appointments Today</p>
  <p className="mt-1 text-3xl font-bold text-neutral-900">12</p>
  <p className="mt-1 text-sm text-success-600">+3 from yesterday</p>
</div>

// Status badge
<span className="inline-flex items-center rounded-full bg-[#3b82f6]/10 px-2.5 py-0.5 text-xs font-medium text-status-scheduled">
  Scheduled
</span>
<span className="inline-flex items-center rounded-full bg-[#22c55e]/10 px-2.5 py-0.5 text-xs font-medium text-status-completed">
  Completed
</span>
<span className="inline-flex items-center rounded-full bg-[#ef4444]/10 px-2.5 py-0.5 text-xs font-medium text-status-noShow">
  No Show
</span>

// Alert banner
<div className="flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-4">
  <AlertTriangle className="h-5 w-5 shrink-0 text-warning-600" />
  <div>
    <p className="text-sm font-medium text-warning-800">Allergy Alert</p>
    <p className="text-sm text-warning-700">Patient is allergic to Penicillin.</p>
  </div>
</div>

// Button variants
<button className="bg-primary-700 hover:bg-primary-800 text-white px-4 py-2 rounded-lg">
  Primary
</button>
<button className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 px-4 py-2 rounded-lg">
  Secondary
</button>
<button className="text-primary-700 hover:text-primary-800 underline">
  Link
</button>

// Input
<input
  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
  placeholder="Enter patient name"
/>

// Data table row (alternating)
<table className="w-full text-left text-sm">
  <thead>
    <tr className="border-b border-neutral-200 text-neutral-500">
      <th className="px-4 py-3 font-medium">Patient</th>
      <th className="px-4 py-3 font-medium">Date</th>
      <th className="px-4 py-3 font-medium">Status</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-neutral-100">
    <tr className="hover:bg-neutral-50">
      <td className="px-4 py-3 text-neutral-900">Jane Smith</td>
      <td className="px-4 py-3 text-neutral-600">2026-03-15</td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center rounded-full bg-[#22c55e]/10 px-2.5 py-0.5 text-xs font-medium text-status-completed">
          Completed
        </span>
      </td>
    </tr>
  </tbody>
</table>
```

### Design Inspiration

| Website | What to Reference |
|---------|-------------------|
| [Mayo Clinic](https://www.mayoclinic.org/) | Content cards with subtle shadows, blue-700 nav, generous whitespace between sections |
| [One Medical](https://www.onemedical.com/) | Sticky CTA bar on mobile, rounded card corners, teal accent links |
| [Mass General Brigham](https://www.massgeneralbrigham.org/) | Blue-700 navbar with white text, teal secondary highlights, mega-menu navigation |
| [Maven Clinic](https://www.mavenclinic.com/) | Soft violet accents, floating header with blur backdrop, calming gradient hero |
| [Crossroads Integrative](https://crossroadsintegrative.com/) | Calming green palette, lazy-load scroll animations, nature imagery |

---

## �🏥 Domain: Healthcare Management

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
- .NET 10 SDK — only needed for running/debugging services outside Docker
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
