# ============================================================
#  MediTrack — Aspire Nexus + PAID AI
#  STT  : Deepgram  (cloud, real-time)
#  LLM  : Claude    (Anthropic)
#  Embed: OpenAI    (text-embedding-3-small)
#
#  Nexus dashboard : http://localhost:15178
#  Requires: CLAUDE_TOKEN + DEEP_GRAM_TOKEN in root .env
# ============================================================
param()
$ErrorActionPreference = "Stop"

$Root = (Split-Path $PSScriptRoot -Parent)
Set-Location $Root

# ── Load .env ────────────────────────────────────────────────
if (-not (Test-Path ".env")) {
    Copy-Item "cmds\.env.example" ".env"
    Write-Warning ".env created from template. Fill in your API keys and re-run."
    Start-Process notepad ".env"
    exit 1
}

$envVars = @{}
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^([^#\s][^=]*)=(.*)$") {
        $envVars[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}

if (-not $envVars["CLAUDE_TOKEN"]) { Write-Error "CLAUDE_TOKEN not set in .env" }
if (-not $envVars["DEEP_GRAM_TOKEN"]) { Write-Error "DEEP_GRAM_TOKEN not set in .env" }

# ── Set env vars — inherited by all Aspire child services ───
foreach ($kv in $envVars.GetEnumerator()) {
    [System.Environment]::SetEnvironmentVariable($kv.Key, $kv.Value, "Process")
}

# Also set the ASP.NET Core mapped names so services pick them up directly
$env:AI__Anthropic__ApiKey   = $envVars["CLAUDE_TOKEN"]
$env:AI__OpenAI__ApiKey      = if ($envVars["OPENAI_API_KEY"]) { $envVars["OPENAI_API_KEY"] } else { "sk-placeholder-for-dev" }
$env:AI__Deepgram__ApiKey    = $envVars["DEEP_GRAM_TOKEN"]
$env:AI__Stt__DefaultProvider = "Deepgram"
$env:POSTGRES_PASSWORD       = if ($envVars["POSTGRES_PASSWORD"]) { $envVars["POSTGRES_PASSWORD"] } else { "MediTrack_Dev@2026!" }

# ── Start infrastructure (DB, MQ, monitoring) ───────────────
Write-Host ""
Write-Host "  ============================================================"
Write-Host "   MediTrack  |  Nexus  |  Deepgram STT + Claude AI"
Write-Host "  ============================================================"
Write-Host ""
Write-Host "  Starting infrastructure (Postgres, RabbitMQ, Jaeger, Prometheus)..."
docker compose up -d postgres rabbitmq jaeger prometheus otel-collector

Write-Host ""
Write-Host "  Starting Aspire Nexus dashboard..."
Write-Host "  Dashboard: http://localhost:15178"
Write-Host ""

dotnet run --project src/Aspire.Nexus --launch-profile http
