#!/usr/bin/env bash
# ============================================================
#  MediTrack — Docker + FREE AI (no API keys required)
#  STT  : faster-whisper  (self-hosted, local)
#  LLM  : none            (suggestions disabled)
#  Embed: none            (RAG disabled)
#
#  Use this to evaluate transcription with zero cost.
#  Add CLAUDE_TOKEN to .env to re-enable LLM suggestions.
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
    cp cmds/.env.example .env
    echo "  [i] Created .env from template (API keys optional in free mode)."
fi

# Load .env — override STT provider
set -a; source .env 2>/dev/null || true; set +a
export STT_PROVIDER=Whisper

echo ""
echo "  ============================================================"
echo "   MediTrack  |  Docker  |  Whisper STT  (no API keys)"
echo "  ============================================================"
echo ""
echo "  Pulling faster-whisper image (first run may take a few minutes)..."
echo ""
docker compose --profile whisper up -d

echo ""
echo "  ── Service URLs ─────────────────────────────────────────────"
echo "   Web UI       https://localhost:3000"
echo "   Clara API    https://localhost:5005"
echo "   Identity     https://localhost:5001"
echo "   Whisper API  http://localhost:8000"
echo "   RabbitMQ     http://localhost:15672   (guest / guest)"
echo "   Jaeger       http://localhost:16686"
echo "  ─────────────────────────────────────────────────────────────"
echo ""
echo "  Note: LLM suggestions need CLAUDE_TOKEN in .env"
echo "  Logs:  docker compose logs -f clara-api whisper-api"
echo "  Stop:  ./cmds/stop.sh"
echo ""
