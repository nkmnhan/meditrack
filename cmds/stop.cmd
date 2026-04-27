@echo off
:: ============================================================
::  MediTrack — Stop all services
:: ============================================================
setlocal
cd /d %~dp0..

echo.
echo  Stopping all MediTrack containers...
docker compose --profile whisper down

echo.
echo  All services stopped.
echo  Data volumes preserved. Use "docker compose down -v" to also wipe data.
echo.
pause
