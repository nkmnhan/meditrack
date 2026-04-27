@echo off
:: ============================================================
::  MediTrack — Docker + FREE AI (no API keys required)
::  STT  : faster-whisper  (self-hosted, local)
::  LLM  : none            (suggestions disabled)
::  Embed: none            (RAG disabled)
::
::  Use this to evaluate transcription with zero cost.
::  Add CLAUDE_TOKEN to .env to re-enable LLM suggestions.
:: ============================================================
setlocal
cd /d %~dp0..

if not exist ".env" (
    copy cmds\.env.example .env >nul
    echo  [i] Created .env from template ^(API keys optional in free mode^).
)

set STT_PROVIDER=Whisper

echo.
echo  ============================================================
echo   MediTrack  ^|  Docker  ^|  Whisper STT  (no API keys)
echo  ============================================================
echo.
echo  Pulling faster-whisper image (first run may take a few minutes)...
echo.
docker compose --profile whisper up -d

echo.
echo  ── Service URLs ────────────────────────────────────────────
echo   Web UI       https://localhost:3000
echo   Clara API    https://localhost:5005
echo   Identity     https://localhost:5001
echo   Whisper API  http://localhost:8000
echo   RabbitMQ     http://localhost:15672   (guest / guest)
echo   Jaeger       http://localhost:16686
echo  ────────────────────────────────────────────────────────────
echo.
echo  Note: LLM suggestions need CLAUDE_TOKEN in .env
echo  Logs: docker compose logs -f clara-api whisper-api
echo  Stop: cmds\stop.cmd
echo.
pause
