# MediTrack — Deployment

## Local Development

### Prerequisites

- Docker Desktop
- Node.js 22+
- (Optional) .NET 10 SDK for running services without Docker

### Quick Start

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start infrastructure
docker-compose up -d postgres rabbitmq

# 3. Start all services
docker-compose up -d --build

# 4. (Frontend only — hot reload)
cd src/MediTrack.Web
npm install
npm run dev
```

### Endpoints

| Service | URL |
|---|---|
| Frontend | https://localhost:3000 |
| Identity | https://localhost:5001 |
| Patient API | https://localhost:5002/health |
| Appointment API | https://localhost:5003/health |
| MedicalRecords API | https://localhost:5004/health |
| Clara API (AI + SignalR) | https://localhost:5005/health |
| RabbitMQ UI | http://localhost:15672 (guest/guest) |

### Clara API — Additional Setup

Clara.API requires PostgreSQL with the pgvector extension:

```sql
-- Run once against the Clara database
CREATE EXTENSION IF NOT EXISTS vector;
```

EF Core migrations run automatically on startup (`MigrateAsync()`). Environment variables required:

| Variable | Description |
|----------|-------------|
| `ConnectionStrings__ClaraDb` | PostgreSQL connection string for the Clara database |
| `AI__OpenAI__ApiKey` | OpenAI API key (for GPT-4o-mini suggestions + embeddings) |
| `Deepgram__ApiKey` | Deepgram API key for speech-to-text |
| `Clara__PatientApiBaseUrl` | Base URL of Patient.API for patient context |

## Running Integration Tests

Integration tests in `tests/Clara.IntegrationTests/` require a real PostgreSQL instance with the pgvector extension. They do **not** use an in-memory database.

```bash
# Set the test database connection string
export CLARA_TEST_DB="Host=localhost;Database=meditrack_clara_test;Username=meditrack;Password=meditrack;Include Error Detail=true"

# Run integration tests only
dotnet test tests/Clara.IntegrationTests

# Run all tests
dotnet test
```

> **Note**: Create the test database and run `CREATE EXTENSION IF NOT EXISTS vector;` before the first test run. EF Core migrations run automatically via `MigrateAsync()` during `WebApplicationFactory` startup.

## Environment Variables

See `.env.example` for a full list of required variables.

## CI/CD (Planned)

- GitHub Actions workflows for build, test, and Docker image push
- Images pushed to GitHub Container Registry (ghcr.io)
- Kubernetes manifests planned under `deploy/k8s/`
- Integration tests run against a PostgreSQL service container with pgvector

## Production Considerations

- Use managed PostgreSQL (Azure Database for PostgreSQL / AWS RDS) instead of containerized PostgreSQL — ensure the `vector` extension is enabled
- Use managed RabbitMQ (CloudAMQP / Azure Service Bus adapter) for reliability
- Enable TLS termination at the load balancer / ingress
- Set `ASPNETCORE_ENVIRONMENT=Production` on all services
- Clara.API SignalR hub: scale horizontally with Redis backplane when sustained concurrent sessions exceed ~50 (see [medical-ai-architecture-summary.md](medical-ai-architecture-summary.md) for scaling decisions)

## Infrastructure

| Service | Status | Notes |
|---------|--------|-------|
| **Clara.API** | Implemented | Single .NET service: REST API, SignalR hub, RAG search, LLM suggestions. Port 5005. |
| **SMART on FHIR OAuth2** | Phase 8 | Layer 2 auth for Epic/Cerner integration. Requires service credential management. |
| **Redis backplane** | Phase 9 | For SignalR scale-out when >50 concurrent sessions. |
