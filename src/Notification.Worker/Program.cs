using MediTrack.EventBus.Abstractions;
using MediTrack.EventBusRabbitMQ;
using MediTrack.Notification;
using MediTrack.Notification.EventHandlers;
using MediTrack.Notification.Services;
using MediTrack.ServiceDefaults;
using MediTrack.ServiceDefaults.Extensions;
using MediTrack.Shared.Events;
using Microsoft.EntityFrameworkCore;
using Notification.Worker.Data;
using Notification.Worker.Services;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults (health checks, OpenTelemetry, response compression)
builder.AddServiceDefaults("notification-worker");

// Dependency health checks
builder.Services.AddHealthChecks()
    .AddNpgsqlHealthCheck(builder.Configuration, "AuditDatabase")
    .AddRabbitMQHealthCheck(builder.Configuration);

// Configure audit database
builder.Services.AddDbContext<AuditDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("AuditDatabase")
        ?? throw new InvalidOperationException("AuditDatabase connection string not found");
    options.UseNpgsql(connectionString);
});

// Register services
builder.Services.AddSingleton<INotificationService, NotificationService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();

// Register notification event handlers
builder.Services.AddScoped<AppointmentCreatedIntegrationEventHandler>();
builder.Services.AddScoped<AppointmentConfirmedIntegrationEventHandler>();
builder.Services.AddScoped<AppointmentRescheduledIntegrationEventHandler>();
builder.Services.AddScoped<AppointmentCancelledIntegrationEventHandler>();
builder.Services.AddScoped<AppointmentReminderIntegrationEventHandler>();
builder.Services.AddScoped<PatientRegisteredIntegrationEventHandler>();
builder.Services.AddScoped<PatientUpdatedIntegrationEventHandler>();
builder.Services.AddScoped<MedicalRecordCreatedIntegrationEventHandler>();
builder.Services.AddScoped<PrescriptionAddedIntegrationEventHandler>();
builder.Services.AddScoped<VitalSignsRecordedIntegrationEventHandler>();

// Register PHI audit event handlers
builder.Services.AddScoped<PatientPHIAccessedIntegrationEventHandler>();
builder.Services.AddScoped<MedicalRecordPHIAccessedIntegrationEventHandler>();
builder.Services.AddScoped<PHIModifiedIntegrationEventHandler>();
builder.Services.AddScoped<PHIDeletedIntegrationEventHandler>();
builder.Services.AddScoped<PHIExportedIntegrationEventHandler>();
builder.Services.AddScoped<UnauthorizedPHIAccessAttemptIntegrationEventHandler>();
builder.Services.AddScoped<PHIBreachDetectedIntegrationEventHandler>();

// Register RabbitMQ EventBus
builder.Services.AddRabbitMQEventBus(builder.Configuration);

// Add background worker for processing
builder.Services.AddHostedService<NotificationWorker>();

// Add audit archival background service (daily archival of old audit logs)
builder.Services.AddHostedService<AuditArchivalService>();

var app = builder.Build();

// Map health check endpoints (/health, /health/live, /health/details)
app.MapDefaultEndpoints();

// Apply database migrations on startup
using (var scope = app.Services.CreateScope())
{
    var auditDbContext = scope.ServiceProvider.GetRequiredService<AuditDbContext>();
    await auditDbContext.Database.MigrateAsync();
}

// Subscribe to integration events
var eventBus = app.Services.GetRequiredService<IEventBus>();

// Notification events
eventBus.Subscribe<AppointmentCreatedIntegrationEvent, AppointmentCreatedIntegrationEventHandler>();
eventBus.Subscribe<AppointmentConfirmedIntegrationEvent, AppointmentConfirmedIntegrationEventHandler>();
eventBus.Subscribe<AppointmentRescheduledIntegrationEvent, AppointmentRescheduledIntegrationEventHandler>();
eventBus.Subscribe<AppointmentCancelledIntegrationEvent, AppointmentCancelledIntegrationEventHandler>();
eventBus.Subscribe<AppointmentReminderIntegrationEvent, AppointmentReminderIntegrationEventHandler>();
eventBus.Subscribe<PatientRegisteredIntegrationEvent, PatientRegisteredIntegrationEventHandler>();
eventBus.Subscribe<PatientUpdatedIntegrationEvent, PatientUpdatedIntegrationEventHandler>();
eventBus.Subscribe<MedicalRecordCreatedIntegrationEvent, MedicalRecordCreatedIntegrationEventHandler>();
eventBus.Subscribe<PrescriptionAddedIntegrationEvent, PrescriptionAddedIntegrationEventHandler>();
eventBus.Subscribe<VitalSignsRecordedIntegrationEvent, VitalSignsRecordedIntegrationEventHandler>();

// PHI audit events
eventBus.Subscribe<PatientPHIAccessedIntegrationEvent, PatientPHIAccessedIntegrationEventHandler>();
eventBus.Subscribe<MedicalRecordPHIAccessedIntegrationEvent, MedicalRecordPHIAccessedIntegrationEventHandler>();
eventBus.Subscribe<PHIModifiedIntegrationEvent, PHIModifiedIntegrationEventHandler>();
eventBus.Subscribe<PHIDeletedIntegrationEvent, PHIDeletedIntegrationEventHandler>();
eventBus.Subscribe<PHIExportedIntegrationEvent, PHIExportedIntegrationEventHandler>();
eventBus.Subscribe<UnauthorizedPHIAccessAttemptIntegrationEvent, UnauthorizedPHIAccessAttemptIntegrationEventHandler>();
eventBus.Subscribe<PHIBreachDetectedIntegrationEvent, PHIBreachDetectedIntegrationEventHandler>();

await app.RunAsync();
