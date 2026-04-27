#!/usr/bin/env bash
# ============================================================
#  MediTrack — Stop all services
# ============================================================
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo ""
echo "  Stopping all MediTrack containers..."
docker compose --profile whisper down

echo ""
echo "  All services stopped."
echo "  Data volumes preserved. Use 'docker compose down -v' to also wipe data."
echo ""
