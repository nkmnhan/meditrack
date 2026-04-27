#!/usr/bin/env bash
# ============================================================
#  MediTrack — Docker + CLOUD AI
#  STT  : Deepgram  (cloud, real-time)
#  LLM  : Claude    (Anthropic)
#  Embed: OpenAI    (text-embedding-3-small)
#
#  Requires: CLAUDE_TOKEN + DEEP_GRAM_TOKEN in root .env
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
    echo ""
    echo "  [!] No .env found. Creating from template — fill in your API keys."
    cp .env.example .env
    echo "      Edit .env then re-run this script."
    echo ""
    exit 1
fi

set -a; source .env; set +a

if [ -z "${CLAUDE_TOKEN:-}" ]; then
    echo "  [!] CLAUDE_TOKEN not set in .env"; exit 1
fi
if [ -z "${DEEP_GRAM_TOKEN:-}" ]; then
    echo "  [!] DEEP_GRAM_TOKEN not set in .env"; exit 1
fi

echo ""
echo "  ============================================================"
echo "   MediTrack  |  Docker  |  Deepgram STT + Claude AI"
echo "  ============================================================"
echo ""
docker compose up -d

echo ""
echo "  ── Service URLs ─────────────────────────────────────────────"
echo "   Web UI       https://localhost:3000"
echo "   Clara API    https://localhost:5005"
echo "   Identity     https://localhost:5001"
echo "   Patient      https://localhost:5002"
echo "   Appointment  https://localhost:5003"
echo "   Records      https://localhost:5004"
echo "   RabbitMQ     http://localhost:15672   (guest / guest)"
echo "   Jaeger       http://localhost:16686"
echo "   Prometheus   http://localhost:9090"
echo "  ─────────────────────────────────────────────────────────────"
echo ""
echo "  Logs:  docker compose logs -f clara-api"
echo "  Stop:  ./scripts/stop.sh"
echo ""
