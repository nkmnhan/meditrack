@echo off
echo Starting MediTrack with .NET Aspire...
echo Make sure Docker Desktop is running.
echo.

:: Launch the Aspire dashboard in the default browser after a short delay
start "" cmd /c "timeout /t 5 /nobreak >nul && start https://localhost:17196"

dotnet run --project src\MediTrack.AppHost\MediTrack.AppHost.csproj --launch-profile https
