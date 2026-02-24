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
