@echo off
:: MediTrack Development Data Seeder
:: Double-click to seed all services with realistic test data.
:: Requires Docker services to be running (docker-compose up -d).

powershell -ExecutionPolicy Bypass -File "%~dp0seed-data.ps1"
echo.
pause
