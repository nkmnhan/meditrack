#!/usr/bin/env bash
# ============================================================
#  MediTrack — Aspire Nexus + LOCAL AI (no API keys required)
#  STT  : faster-whisper  (self-hosted Docker container)
#  LLM  : none            (suggestions disabled)
#  Embed: none            (RAG disabled)
#
#  Nexus dashboard : http://localhost:15178
#  Whisper API     : http://localhost:8000
#
#  Add CLAUDE_TOKEN to .env to re-enable LLM suggestions.
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
    cp .env.example .env
    echo "  [i] .env created from template (API keys optional in local mode)."
fi

set -a; source .env 2>/dev/null || true; set +a

export AI__Stt__DefaultProvider="Whisper"
export AI__Whisper__BaseUrl="http://localhost:8000"
export AI__Whisper__BufferSeconds="5"
export AI__Whisper__Model="${WHISPER_MODEL:-base.en}"

if [ -n "${CLAUDE_TOKEN:-}" ]; then
    export AI__Anthropic__ApiKey="$CLAUDE_TOKEN"
    echo "  [i] CLAUDE_TOKEN detected — LLM suggestions enabled."
else
    echo "  [i] No CLAUDE_TOKEN — LLM suggestions disabled (transcription still works)."
fi

echo ""
echo "  ============================================================"
echo "   MediTrack  |  Nexus  |  Whisper STT  (no API keys)"
echo "  ============================================================"
echo ""
echo "  Starting infrastructure + Whisper (first pull may take a few minutes)..."
docker compose --profile whisper up -d postgres rabbitmq jaeger prometheus otel-collector whisper-api

echo ""
echo "  Starting Aspire Nexus — dashboard: http://localhost:15178"
echo "  Whisper API running at: http://localhost:8000"
echo ""
dotnet run --project src/Aspire.Nexus --launch-profile http
