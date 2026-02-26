var builder = DistributedApplication.CreateBuilder(args);

var sql = builder.AddSqlServer("sqlserver")
    .WithDataVolume()
    .WithLifetime(ContainerLifetime.Persistent);

var identityDb = sql.AddDatabase("IdentityDb");
var patientDb = sql.AddDatabase("PatientDb");
var appointmentDb = sql.AddDatabase("AppointmentDb");
var medicalRecordsDb = sql.AddDatabase("MedicalRecordsDb");
var auditDb = sql.AddDatabase("AuditDatabase");

var rabbitmq = builder.AddRabbitMQ("rabbitmq")
    .WithDataVolume()
    .WithManagementPlugin()
    .WithLifetime(ContainerLifetime.Persistent);

var identityApi = builder.AddProject<Projects.Identity_API>("identity-api")
    .WithReference(identityDb);

var patientApi = builder.AddProject<Projects.Patient_API>("patient-api")
    .WithReference(patientDb)
    .WithReference(rabbitmq)
    .WithReference(identityApi)
    .WithEnvironment("IdentityUrl", identityApi.GetEndpoint("https"));

var appointmentApi = builder.AddProject<Projects.Appointment_API>("appointment-api")
    .WithReference(appointmentDb)
    .WithReference(rabbitmq)
    .WithReference(identityApi)
    .WithEnvironment("IdentityUrl", identityApi.GetEndpoint("https"));

var medicalRecordsApi = builder.AddProject<Projects.MedicalRecords_API>("medicalrecords-api")
    .WithReference(medicalRecordsDb)
    .WithReference(rabbitmq)
    .WithReference(identityApi)
    .WithEnvironment("IdentityUrl", identityApi.GetEndpoint("https"));

var notificationWorker = builder.AddProject<Projects.Notification_Worker>("notification-worker")
    .WithReference(auditDb)
    .WithReference(rabbitmq);

builder.AddNpmApp("web", "../MediTrack.Web", "dev")
    .WithReference(identityApi)
    .WithEnvironment("VITE_IDENTITY_URL", identityApi.GetEndpoint("https"))
    .WithReference(patientApi)
    .WithEnvironment("VITE_PATIENT_API_URL", patientApi.GetEndpoint("https"))
    .WithReference(appointmentApi)
    .WithEnvironment("VITE_APPOINTMENT_API_URL", appointmentApi.GetEndpoint("https"))
    .WithReference(medicalRecordsApi)
    .WithEnvironment("VITE_MEDICALRECORDS_API_URL", medicalRecordsApi.GetEndpoint("https"))
    .WaitFor(identityApi)
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

builder.Build().Run();
