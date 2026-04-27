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
param()
$ErrorActionPreference = "Stop"

$Root = (Split-Path $PSScriptRoot -Parent)
Set-Location $Root

# ── Load .env (optional — local mode needs no keys) ─────────
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "  [i] .env created from template (API keys optional in local mode)."
}

$envVars = @{}
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^([^#\s][^=]*)=(.*)$") {
        $envVars[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}

foreach ($kv in $envVars.GetEnumerator()) {
    [System.Environment]::SetEnvironmentVariable($kv.Key, $kv.Value, "Process")
}

# Override STT to local Whisper regardless of what .env says
$env:AI__Stt__DefaultProvider   = "Whisper"
$env:AI__Whisper__BaseUrl       = "http://localhost:8000"
$env:AI__Whisper__BufferSeconds = "5"
$env:AI__Whisper__Model         = $envVars["WHISPER_MODEL"] ?? "base.en"
$env:POSTGRES_PASSWORD          = $envVars["POSTGRES_PASSWORD"] ?? "MediTrack_Dev@2026!"

# Optional — LLM suggestions work if keys are present
if ($envVars["CLAUDE_TOKEN"]) {
    $env:AI__Anthropic__ApiKey = $envVars["CLAUDE_TOKEN"]
    Write-Host "  [i] CLAUDE_TOKEN detected — LLM suggestions enabled."
} else {
    Write-Host "  [i] No CLAUDE_TOKEN — LLM suggestions disabled (transcription still works)."
}

# ── Start infrastructure + Whisper ───────────────────────────
Write-Host ""
Write-Host "  ============================================================"
Write-Host "   MediTrack  |  Nexus  |  Whisper STT  (no API keys)"
Write-Host "  ============================================================"
Write-Host ""
Write-Host "  Starting infrastructure + Whisper (first pull may take a few minutes)..."
docker compose --profile whisper up -d postgres rabbitmq jaeger prometheus otel-collector whisper-api

Write-Host ""
Write-Host "  Starting Aspire Nexus — dashboard: http://localhost:15178"
Write-Host "  Whisper API running at: http://localhost:8000"
Write-Host ""

dotnet run --project src/Aspire.Nexus --launch-profile http
