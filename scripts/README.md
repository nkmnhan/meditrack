# MediTrack — Quick Start Scripts

One-click startup for every combination of runtime and AI tier.

---

## Prerequisites

| Tool | Version | Required for |
|------|---------|-------------|
| Docker Desktop | 4.x+ | All modes |
| .NET SDK | 10.x | Nexus modes |
| Git Bash / WSL | any | `.sh` scripts |

---

## 1. Setup (first time only)

Copy the env template to the **project root**:

```bash
# Linux / macOS / Git Bash
cp .env.example .env

# Windows CMD
copy .env.example .env
```

Then open `.env` and fill in your API keys for the tier you want.

---

## 2. Choose your mode

| Script | Runtime | STT | LLM | API Keys |
|--------|---------|-----|-----|---------|
| `docker-cloud` | Docker | Deepgram (cloud, ~200ms) | Claude + OpenAI | Required |
| `docker-local` | Docker | Whisper (local, ~5s) | None* | None |
| `nexus-cloud` | Aspire Nexus | Deepgram (cloud, ~200ms) | Claude + OpenAI | Required |
| `nexus-local` | Aspire Nexus | Whisper (local, ~5s) | None* | None |

\* Add `CLAUDE_TOKEN` to `.env` to re-enable LLM suggestions in local mode.

---

## 3. Run

### Windows (double-click or CMD)

```cmd
scripts\docker-cloud.cmd
scripts\docker-local.cmd
```

### Windows (PowerShell — Nexus modes)

```powershell
.\scripts\nexus-cloud.ps1
.\scripts\nexus-local.ps1
```

> **First run:** PowerShell may block unsigned scripts.
> Fix: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Linux / macOS / Git Bash

```bash
chmod +x scripts/*.sh   # once
./scripts/docker-cloud.sh
./scripts/docker-local.sh
./scripts/nexus-cloud.sh
./scripts/nexus-local.sh
```

---

## 4. Stop

```cmd
scripts\stop.cmd          # Windows CMD
./scripts/stop.sh         # Git Bash / Linux
```

To also wipe all database volumes (fresh start):

```bash
docker compose --profile whisper down -v
```

---

## Mode Details

### Docker Cloud (`docker-cloud`)

Full production-equivalent stack. Every service runs in a container.

```
postgres  rabbitmq  otel-collector  jaeger  prometheus
identity  patient  appointment  records  clara  web
```

AI pipeline:
- **STT**: Deepgram WebSocket → real-time transcript (~200ms latency)
- **LLM**: Claude Sonnet 4 (on-demand) + GPT-4o-mini (batch suggestions)
- **Embeddings**: `text-embedding-3-small` via OpenAI

Required `.env` keys:
```
CLAUDE_TOKEN=sk-ant-...
DEEP_GRAM_TOKEN=...
OPENAI_API_KEY=sk-...   # optional — enables RAG knowledge search
```

---

### Docker Local (`docker-local`)

Zero API cost. Self-hosted STT via [faster-whisper-server](https://github.com/fedirz/faster-whisper-server).

```
postgres  rabbitmq  otel-collector  jaeger  prometheus
identity  patient  appointment  records  clara  web
whisper-api   ← extra container, auto-started
```

First run downloads the `base.en` Whisper model (~150 MB).

AI pipeline:
- **STT**: faster-whisper `base.en` → batch transcript (~5s per flush)
- **LLM**: disabled (add `CLAUDE_TOKEN` to `.env` to enable)
- **Embeddings**: disabled

No required `.env` keys.

---

### Nexus Cloud (`nexus-cloud`)

.NET Aspire orchestrator manages all services. Hot-reload friendly.
Infra (Postgres, RabbitMQ, monitoring) runs in Docker; .NET services run natively.

```
Docker:  postgres  rabbitmq  otel-collector  jaeger  prometheus
Aspire:  identity  patient  appointment  records  clara  web
```

Dashboard: **http://localhost:15178** — live logs, traces, metrics per service.

Required `.env` keys: same as Docker Cloud.

---

### Nexus Local (`nexus-local`)

Aspire + self-hosted Whisper. Whisper runs in Docker; .NET services run natively.

```
Docker:  postgres  rabbitmq  otel-collector  jaeger  prometheus  whisper-api
Aspire:  identity  patient  appointment  records  clara  web
```

No required `.env` keys. STT latency ~5s per utterance.

---

## Service URLs

| Service | URL |
|---------|-----|
| Web UI | https://localhost:3000 |
| Clara API | https://localhost:5005 |
| Identity | https://localhost:5001 |
| Patient | https://localhost:5002 |
| Appointment | https://localhost:5003 |
| Records | https://localhost:5004 |
| Whisper API | http://localhost:8000 (local mode only) |
| RabbitMQ | http://localhost:15672 (guest / guest) |
| Jaeger | http://localhost:16686 |
| Prometheus | http://localhost:9090 |
| Nexus dashboard | http://localhost:15178 (Nexus modes only) |

---

## Seeding test data

After starting, run the simulator to populate patients, appointments, and records:

```bash
docker compose --profile seed run --rm simulator
```

---

## Switching STT providers at runtime

Change `STT_PROVIDER` in `.env` and restart `clara-api`:

```bash
# Switch to local Whisper
STT_PROVIDER=Whisper docker compose --profile whisper up -d clara-api whisper-api

# Switch back to cloud Deepgram
STT_PROVIDER=Deepgram docker compose up -d clara-api
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `postgres` auth error | Run `docker compose down -v` then restart (stale volume) |
| Whisper first chunk slow | Normal — model loads on first request (~10s) |
| No STT results | Check `docker compose logs clara-api` for Deepgram API key errors |
| LLM suggestions missing | Add `CLAUDE_TOKEN` to `.env` and restart |
| Dev certs untrusted | Run `dotnet dev-certs https --trust` once |
| PowerShell blocked | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
