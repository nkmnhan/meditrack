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
| RabbitMQ UI | http://localhost:15672 (guest/guest) |

## Environment Variables

See `.env.example` for a full list of required variables.

## CI/CD (Planned)

- GitHub Actions workflows for build, test, and Docker image push
- Images pushed to GitHub Container Registry (ghcr.io)
- Kubernetes manifests planned under `deploy/k8s/`

## Production Considerations

- Use managed PostgreSQL (Azure Database for PostgreSQL / AWS RDS) instead of containerized PostgreSQL
- Use managed RabbitMQ (CloudAMQP / Azure Service Bus adapter) for reliability
- Enable TLS termination at the load balancer / ingress
- Set `ASPNETCORE_ENVIRONMENT=Production` on all services

## Planned Infrastructure Changes

| Change | Phase | Notes |
|--------|-------|-------|
| **Clara.API service** | 6b | Single .NET service hosting all MCP tools + agent + SignalR. Total containers: 7 (vs. 10+ in original plan). |
| **SMART on FHIR OAuth2** | 8 | Layer 2 auth configuration for external EMR integration (Epic, Cerner). Requires service credential management. |
