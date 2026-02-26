#Requires -Version 5.1
<#
.SYNOPSIS
    MediTrack Development Data Seeder
.DESCRIPTION
    Seeds all MediTrack services with realistic test data.
    Requires Docker services to be running (docker-compose up -d).
    Identity users/roles are seeded automatically on startup.
    This script seeds: Patients, Appointments, Medical Records.
#>

# --- Configuration ---
$PatientApiUrl    = "https://localhost:5002"
$AppointmentApiUrl = "https://localhost:5003"
$MedicalRecordsApiUrl = "https://localhost:5004"

$PatientCount           = 50
$AppointmentsPerPatient = 3
$RecordsPerPatient      = 3
$ClearExisting          = $false

# Allow self-signed certs in development
Add-Type @"
using System.Net;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
public class TrustAllCerts {
    public static void Enable() {
        ServicePointManager.ServerCertificateValidationCallback =
            delegate { return true; };
    }
}
"@
[TrustAllCerts]::Enable()

# For PowerShell 6+ (Core), also disable cert validation on HttpClient
if ($PSVersionTable.PSVersion.Major -ge 6) {
    $PSDefaultParameterValues['Invoke-RestMethod:SkipCertificateCheck'] = $true
    $PSDefaultParameterValues['Invoke-WebRequest:SkipCertificateCheck'] = $true
}

# --- Helpers ---
function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Step, [string]$Description)
    Write-Host "[$Step] " -ForegroundColor Yellow -NoNewline
    Write-Host $Description
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [OK] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Fail {
    param([string]$Message)
    Write-Host "  [FAIL] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Write-Info {
    param([string]$Message)
    Write-Host "  $Message" -ForegroundColor DarkGray
}

function Test-ServiceHealth {
    param([string]$Name, [string]$BaseUrl)

    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Success "$Name is healthy ($BaseUrl)"
            return $true
        }
    }
    catch {
        # Try alive endpoint as fallback
        try {
            $response = Invoke-WebRequest -Uri "$BaseUrl/alive" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Success "$Name is alive ($BaseUrl)"
                return $true
            }
        }
        catch {
            Write-Fail "$Name is not reachable at $BaseUrl"
            Write-Info $_.Exception.Message
            return $false
        }
    }
    return $false
}

function Invoke-SeedEndpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "POST"
    )

    try {
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 120 -ErrorAction Stop
        }
        else {
            $response = Invoke-RestMethod -Uri $Url -Method Post -TimeoutSec 120 -ErrorAction Stop
        }
        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode
        $errorBody = ""
        try {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            $reader.Close()
        }
        catch {}
        Write-Fail "$Name failed (HTTP $statusCode)"
        if ($errorBody) { Write-Info $errorBody }
        else { Write-Info $_.Exception.Message }
        return $null
    }
}

# --- Main ---
$startTime = Get-Date

Write-Header "MediTrack - Development Data Seeder"
Write-Host "  This script seeds realistic test data into all MediTrack services."
Write-Host "  Make sure Docker services are running: docker-compose up -d"
Write-Host ""
Write-Host "  Configuration:" -ForegroundColor DarkGray
Write-Host "    Patients:              $PatientCount" -ForegroundColor DarkGray
Write-Host "    Appointments/patient:  $AppointmentsPerPatient" -ForegroundColor DarkGray
Write-Host "    Med records/patient:   $RecordsPerPatient" -ForegroundColor DarkGray
Write-Host "    Clear existing data:   $ClearExisting" -ForegroundColor DarkGray
Write-Host ""

# ---- Step 1: Health Checks ----
Write-Step "1/5" "Checking service health..."

$patientHealthy = Test-ServiceHealth "Patient API" $PatientApiUrl
$appointmentHealthy = Test-ServiceHealth "Appointment API" $AppointmentApiUrl
$medicalRecordsHealthy = Test-ServiceHealth "MedicalRecords API" $MedicalRecordsApiUrl

if (-not $patientHealthy) {
    Write-Host ""
    Write-Fail "Patient API is required. Run: docker-compose up -d"
    Write-Host ""
    exit 1
}

# Track results for final report
$report = @{
    PatientsCreated      = 0
    PatientsFailed       = 0
    AppointmentsCreated  = 0
    AppointmentsFailed   = 0
    MedRecordsCreated    = 0
    MedRecordsFailed     = 0
    Warnings             = @()
}

# ---- Step 2: Seed Patients ----
Write-Host ""
Write-Step "2/5" "Seeding $PatientCount patients..."

$clearParam = if ($ClearExisting) { "true" } else { "false" }
$patientUrl = "$PatientApiUrl/api/dev/seed/patients?count=$PatientCount&clearExisting=$clearParam"
$patientResult = Invoke-SeedEndpoint "Patient seeding" $patientUrl

if ($patientResult) {
    $report.PatientsCreated = $patientResult.created
    $report.PatientsFailed  = $patientResult.failed
    Write-Success "$($patientResult.created) patients created, $($patientResult.failed) failed"
}
else {
    Write-Fail "Patient seeding failed entirely"
    $report.Warnings += "Patient seeding failed"
}

# ---- Step 3: Fetch Patient IDs ----
Write-Host ""
Write-Step "3/5" "Fetching patient data for cross-service seeding..."

$patientSummaryUrl = "$PatientApiUrl/api/dev/seed/patient-summary"
$patientSummaries = Invoke-SeedEndpoint "Patient summary" $patientSummaryUrl -Method "GET"

if ($patientSummaries -and $patientSummaries.Count -gt 0) {
    Write-Success "Found $($patientSummaries.Count) patients"
    $patientIds = ($patientSummaries | ForEach-Object { $_.id }) -join ","
}
else {
    Write-Fail "No patients found. Appointment and medical records seeding may use fallback data."
    $patientIds = ""
    $report.Warnings += "No patient IDs fetched; seeders will use fallback data"
}

# ---- Step 4: Seed Appointments ----
Write-Host ""
if ($appointmentHealthy) {
    Write-Step "4/5" "Seeding appointments ($AppointmentsPerPatient per patient)..."

    $appointmentUrl = "$AppointmentApiUrl/api/dev/seed/appointments?appointmentsPerPatient=$AppointmentsPerPatient&clearExisting=$clearParam"
    $appointmentResult = Invoke-SeedEndpoint "Appointment seeding" $appointmentUrl

    if ($appointmentResult) {
        $report.AppointmentsCreated = $appointmentResult.created
        $report.AppointmentsFailed  = $appointmentResult.failed
        Write-Success "$($appointmentResult.created) appointments created, $($appointmentResult.failed) failed"
    }
    else {
        Write-Fail "Appointment seeding failed entirely"
        $report.Warnings += "Appointment seeding failed"
    }
}
else {
    Write-Step "4/5" "Skipping appointments (Appointment API not healthy)"
    $report.Warnings += "Appointment API not reachable; skipped"
}

# ---- Step 5: Seed Medical Records ----
Write-Host ""
if ($medicalRecordsHealthy) {
    Write-Step "5/5" "Seeding medical records ($RecordsPerPatient per patient)..."

    $medRecordsUrl = "$MedicalRecordsApiUrl/api/dev/seed/medical-records?recordsPerPatient=$RecordsPerPatient&clearExisting=$clearParam"
    if ($patientIds) {
        $medRecordsUrl += "&patientIds=$patientIds"
    }
    $medRecordsResult = Invoke-SeedEndpoint "Medical records seeding" $medRecordsUrl

    if ($medRecordsResult) {
        $report.MedRecordsCreated = $medRecordsResult.created
        $report.MedRecordsFailed  = $medRecordsResult.failed
        Write-Success "$($medRecordsResult.created) medical records created, $($medRecordsResult.failed) failed"
    }
    else {
        Write-Fail "Medical records seeding failed entirely"
        $report.Warnings += "Medical records seeding failed"
    }
}
else {
    Write-Step "5/5" "Skipping medical records (MedicalRecords API not healthy)"
    $report.Warnings += "MedicalRecords API not reachable; skipped"
}

# ---- Summary Report ----
$elapsed = (Get-Date) - $startTime
$elapsedFormatted = "{0:mm\:ss}" -f $elapsed

Write-Header "Seeding Complete - Summary Report"

$totalCreated = $report.PatientsCreated + $report.AppointmentsCreated + $report.MedRecordsCreated
$totalFailed  = $report.PatientsFailed + $report.AppointmentsFailed + $report.MedRecordsFailed

Write-Host "  Patients:          " -NoNewline
Write-Host "$($report.PatientsCreated) created" -ForegroundColor Green -NoNewline
if ($report.PatientsFailed -gt 0) { Write-Host ", $($report.PatientsFailed) failed" -ForegroundColor Red -NoNewline }
Write-Host ""

Write-Host "  Appointments:      " -NoNewline
Write-Host "$($report.AppointmentsCreated) created" -ForegroundColor Green -NoNewline
if ($report.AppointmentsFailed -gt 0) { Write-Host ", $($report.AppointmentsFailed) failed" -ForegroundColor Red -NoNewline }
Write-Host ""

Write-Host "  Medical Records:   " -NoNewline
Write-Host "$($report.MedRecordsCreated) created" -ForegroundColor Green -NoNewline
if ($report.MedRecordsFailed -gt 0) { Write-Host ", $($report.MedRecordsFailed) failed" -ForegroundColor Red -NoNewline }
Write-Host ""

Write-Host ""
Write-Host "  Total:             " -NoNewline
Write-Host "$totalCreated created" -ForegroundColor Green -NoNewline
if ($totalFailed -gt 0) { Write-Host ", $totalFailed failed" -ForegroundColor Red -NoNewline }
Write-Host ""

Write-Host "  Time elapsed:      $elapsedFormatted"

if ($report.Warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "  Warnings:" -ForegroundColor Yellow
    foreach ($warning in $report.Warnings) {
        Write-Host "    - $warning" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "  Default test accounts (seeded on Identity.API startup):" -ForegroundColor DarkGray
Write-Host "    Admin:   admin@meditrack.local  / Admin123!" -ForegroundColor DarkGray
Write-Host "    Doctor:  doctor@meditrack.local / Doctor123!" -ForegroundColor DarkGray
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
