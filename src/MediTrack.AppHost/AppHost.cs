using System.Diagnostics;

var builder = DistributedApplication.CreateBuilder(args);

// Custom dev cert for all API projects — prevents browser cert warnings
var certPath = Path.GetFullPath(Path.Combine(builder.AppHostDirectory, "..", "..", "dev-certs", "certs", "localhost.pem"));
var certKeyPath = Path.GetFullPath(Path.Combine(builder.AppHostDirectory, "..", "..", "dev-certs", "certs", "localhost-key.pem"));

// ──────────────────────────────────────────────────────
// Prerequisites — ensure dev cert is trusted and Docker infra is running
// ──────────────────────────────────────────────────────
var repoRoot = Path.GetFullPath(Path.Combine(builder.AppHostDirectory, "..", ".."));

// Ensure .NET dev cert is trusted (required for Aspire dashboard OTLP endpoint)
var devCertCheck = Process.Start(new ProcessStartInfo
{
    FileName = "dotnet",
    Arguments = "dev-certs https --check --trust",
    RedirectStandardOutput = true,
    RedirectStandardError = true,
    UseShellExecute = false,
});
devCertCheck?.WaitForExit();
if (devCertCheck?.ExitCode != 0)
{
    Console.WriteLine("Trusting .NET dev certificate for Aspire dashboard OTLP...");
    var devCertTrust = Process.Start(new ProcessStartInfo
    {
        FileName = "dotnet",
        Arguments = "dev-certs https --trust",
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        UseShellExecute = false,
    });
    devCertTrust?.WaitForExit();
}

var dockerCompose = Process.Start(new ProcessStartInfo
{
    FileName = "docker",
    Arguments = "compose up -d --wait postgres rabbitmq",
    WorkingDirectory = repoRoot,
    RedirectStandardOutput = true,
    RedirectStandardError = true,
    UseShellExecute = false,
});
dockerCompose?.WaitForExit();
if (dockerCompose?.ExitCode != 0)
{
    Console.Error.WriteLine("Failed to start Docker Compose infrastructure. Is Docker Desktop running?");
}
var identityDb = builder.AddConnectionString("IdentityDb");
var patientDb = builder.AddConnectionString("PatientDb");
var appointmentDb = builder.AddConnectionString("AppointmentDb");
var medicalRecordsDb = builder.AddConnectionString("MedicalRecordsDb");
var auditDb = builder.AddConnectionString("AuditDatabase");
var claraDb = builder.AddConnectionString("ClaraDb");
var rabbitmq = builder.AddConnectionString("rabbitmq");

// ──────────────────────────────────────────────────────
// Backend services — HTTPS ports match docker-compose
// identity-api:5001  patient-api:5002  appointment-api:5003
// medicalrecords-api:5004  clara-api:5005
// Ports are set in each project's launchSettings.json
// ──────────────────────────────────────────────────────
var identityApi = builder.AddProject<Projects.Identity_API>("identity-api")
    .WithOtlpExporter()
    .WithReference(identityDb)
    .WithReference(rabbitmq)
    .WithEnvironment("IdentityUrl", "https://localhost:5001")
    .WithEnvironment("ServiceClientSecret", "service-secret-dev")
    .WithEnvironment("WebClientUrl", "https://localhost:3000")
    .WithEnvironment("Kestrel__Certificates__Default__Path", certPath)
    .WithEnvironment("Kestrel__Certificates__Default__KeyPath", certKeyPath);

var patientApi = builder.AddProject<Projects.Patient_API>("patient-api")
    .WithOtlpExporter()
    .WithReference(patientDb)
    .WithReference(rabbitmq)
    .WithReference(identityApi)
    .WaitFor(identityApi)
    .WithEnvironment("IdentityUrl", identityApi.GetEndpoint("https"))
    .WithEnvironment("Kestrel__Certificates__Default__Path", certPath)
    .WithEnvironment("Kestrel__Certificates__Default__KeyPath", certKeyPath);

var appointmentApi = builder.AddProject<Projects.Appointment_API>("appointment-api")
    .WithOtlpExporter()
    .WithReference(appointmentDb)
    .WithReference(rabbitmq)
    .WithReference(identityApi)
    .WaitFor(identityApi)
    .WithEnvironment("IdentityUrl", identityApi.GetEndpoint("https"))
    .WithEnvironment("Kestrel__Certificates__Default__Path", certPath)
    .WithEnvironment("Kestrel__Certificates__Default__KeyPath", certKeyPath);

var medicalRecordsApi = builder.AddProject<Projects.MedicalRecords_API>("medicalrecords-api")
    .WithOtlpExporter()
    .WithReference(medicalRecordsDb)
    .WithReference(rabbitmq)
    .WithReference(identityApi)
    .WaitFor(identityApi)
    .WithEnvironment("IdentityUrl", identityApi.GetEndpoint("https"))
    .WithEnvironment("Kestrel__Certificates__Default__Path", certPath)
    .WithEnvironment("Kestrel__Certificates__Default__KeyPath", certKeyPath);

var notificationWorker = builder.AddProject<Projects.Notification_Worker>("notification-worker")
    .WithOtlpExporter()
    .WithReference(auditDb)
    .WithReference(rabbitmq);

var claraApi = builder.AddProject<Projects.Clara_API>("clara-api")
    .WithOtlpExporter()
    .WithReference(claraDb)
    .WithReference(rabbitmq)
    .WithReference(identityApi)
    .WaitFor(identityApi)
    .WithEnvironment("IdentityUrl", identityApi.GetEndpoint("https"))
    .WithEnvironment("Kestrel__Certificates__Default__Path", certPath)
    .WithEnvironment("Kestrel__Certificates__Default__KeyPath", certKeyPath);

// ──────────────────────────────────────────────────────
// Web frontend — https://localhost:3000 (matches docker-compose)
// AddViteApp creates an HTTP endpoint + starts vite.
// Override PORT=3000 so vite binds to port 3000 with HTTPS
// (vite.config.ts configures HTTPS via dev certs).
// ──────────────────────────────────────────────────────
var web = builder.AddViteApp("web", "../MediTrack.Web")
    .WithEnvironment("PORT", "3000")
    .WithHttpsEndpoint(port: 3000, targetPort: 3000, name: "https", isProxied: false)
    .WithReference(identityApi)
    .WithEnvironment("VITE_IDENTITY_URL", "https://localhost:5001")
    .WithEnvironment("VITE_PATIENT_API_URL", "https://localhost:5002")
    .WithEnvironment("VITE_APPOINTMENT_API_URL", "https://localhost:5003")
    .WithEnvironment("VITE_MEDICALRECORDS_API_URL", "https://localhost:5004")
    .WithEnvironment("VITE_CLARA_API_URL", "https://localhost:5005")
    .WaitFor(identityApi)
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

builder.Build().Run();
