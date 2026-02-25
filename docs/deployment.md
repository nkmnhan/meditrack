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
docker-compose up -d sqlserver rabbitmq

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
| RabbitMQ UI | http://localhost:15672 (guest/guest) |

## Environment Variables

See `.env.example` for a full list of required variables.

## CI/CD (Planned)

- GitHub Actions workflows for build, test, and Docker image push
- Images pushed to GitHub Container Registry (ghcr.io)
- Kubernetes manifests planned under `deploy/k8s/`

## Production Considerations

- Use managed SQL (Azure SQL / AWS RDS) instead of containerized SQL Server
- Use managed RabbitMQ (CloudAMQP / Azure Service Bus adapter) for reliability
- Enable TLS termination at the load balancer / ingress
- Set `ASPNETCORE_ENVIRONMENT=Production` on all services

## Planned Infrastructure Changes

The following changes are planned for upcoming phases:

| Change | Phase | Notes |
|--------|-------|-------|
| **PostgreSQL migration** | 6–7 | Replace SQL Server with PostgreSQL across all services. See [replace-mssql-with-postgres.md](../plans/replace-mssql-with-postgres.md). |
| **pgvector extension** | 6 | Enable pgvector on PostgreSQL for knowledge base embeddings (RAG). |
| **MCP servers** | 6 | FHIR MCP Server, Knowledge MCP Server, Session MCP Server — all .NET containers. |
| **FHIR R4 API** | 8 | FHIR facade endpoints on existing services. No new containers. |
| **SMART on FHIR OAuth2** | 8 | Layer 2 auth configuration for external EMR integration (Epic, Cerner). Requires service credential management. |
