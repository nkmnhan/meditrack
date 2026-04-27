@echo off
:: ============================================================
::  MediTrack — Docker + CLOUD AI
::  STT  : Deepgram  (cloud, real-time)
::  LLM  : Claude    (Anthropic)
::  Embed: OpenAI    (text-embedding-3-small)
::
::  Requires: CLAUDE_TOKEN + DEEP_GRAM_TOKEN in root .env
:: ============================================================
setlocal
cd /d %~dp0..

if not exist ".env" (
    echo.
    echo  [!] No .env found in project root.
    echo      Copying template — fill in your API keys, then re-run.
    echo.
    copy .env.example .env >nul
    notepad .env
    pause & exit /b 1
)

echo.
echo  ============================================================
echo   MediTrack  ^|  Docker  ^|  Deepgram STT + Claude AI
echo  ============================================================
echo.
echo  Starting all services...
echo.
docker compose up -d

echo.
echo  ── Service URLs ────────────────────────────────────────────
echo   Web UI       https://localhost:3000
echo   Clara API    https://localhost:5005
echo   Identity     https://localhost:5001
echo   Patient      https://localhost:5002
echo   Appointment  https://localhost:5003
echo   Records      https://localhost:5004
echo   RabbitMQ     http://localhost:15672   (guest / guest)
echo   Jaeger       http://localhost:16686
echo   Prometheus   http://localhost:9090
echo  ────────────────────────────────────────────────────────────
echo.
echo  Logs:  docker compose logs -f clara-api
echo  Stop:  scripts\stop.cmd
echo.
pause
