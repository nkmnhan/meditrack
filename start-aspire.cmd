@echo off
echo ========================================
echo MediTrack - Aspire.Nexus
echo ========================================
echo Make sure Docker Desktop is running.
echo.

cd /d %~dp0src\Aspire.Nexus

dotnet run --launch-profile https

echo.
pause
