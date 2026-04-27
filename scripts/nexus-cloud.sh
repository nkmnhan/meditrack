#!/usr/bin/env bash
# ============================================================
#  MediTrack — Aspire Nexus + CLOUD AI
#  STT  : Deepgram  (cloud, real-time)
#  LLM  : Claude    (Anthropic)
#  Embed: OpenAI    (text-embedding-3-small)
#
#  Nexus dashboard : http://localhost:15178
#  Requires: CLAUDE_TOKEN + DEEP_GRAM_TOKEN in root .env
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
    cp .env.example .env
    echo "  [!] .env created from template. Fill in your API keys and re-run."
    exit 1
fi

set -a; source .env; set +a

if [ -z "${CLAUDE_TOKEN:-}" ]; then
    echo "  [!] CLAUDE_TOKEN not set in .env"; exit 1
fi
if [ -z "${DEEP_GRAM_TOKEN:-}" ]; then
    echo "  [!] DEEP_GRAM_TOKEN not set in .env"; exit 1
fi

export AI__Anthropic__ApiKey="$CLAUDE_TOKEN"
export AI__OpenAI__ApiKey="${OPENAI_API_KEY:-sk-placeholder-for-dev}"
export AI__Deepgram__ApiKey="$DEEP_GRAM_TOKEN"
export AI__Stt__DefaultProvider="Deepgram"

echo ""
echo "  ============================================================"
echo "   MediTrack  |  Nexus  |  Deepgram STT + Claude AI"
echo "  ============================================================"
echo ""
echo "  Starting infrastructure (Postgres, RabbitMQ, Jaeger, Prometheus)..."
docker compose up -d postgres rabbitmq jaeger prometheus otel-collector

echo ""
echo "  Starting Aspire Nexus — dashboard: http://localhost:15178"
echo ""
dotnet run --project src/Aspire.Nexus --launch-profile http
