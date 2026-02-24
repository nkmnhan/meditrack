using MediTrack.EventBus.Abstractions;
using MediTrack.EventBusRabbitMQ;
using MediTrack.Notification;
using MediTrack.Notification.EventHandlers;
using MediTrack.Notification.Services;
using MediTrack.ServiceDefaults.Extensions;
using MediTrack.Shared.Events;
using Microsoft.EntityFrameworkCore;
using Notification.Worker.Data;
using Notification.Worker.Services;

HostApplicationBuilder builder = Host.CreateApplicationBuilder(args);

// Add service defaults (health checks, OpenTelemetry)
builder.Services.AddDefaultHealthChecks();
builder.Services.AddDefaultOpenTelemetry("notification-worker");

// Configure audit database
builder.Services.AddDbContext<AuditDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("AuditDatabase")
        ?? throw new InvalidOperationException("AuditDatabase connection string not found");
    options.UseSqlServer(connectionString);
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

IHost host = builder.Build();

// Apply database migrations (DEVELOPMENT ONLY — use deployment pipeline in production)
// Auto-migration requires DDL permissions which violates least privilege in production
if (builder.Environment.IsDevelopment())
{
    using (var scope = host.Services.CreateScope())
    {
        var auditDbContext = scope.ServiceProvider.GetRequiredService<AuditDbContext>();
        await auditDbContext.Database.MigrateAsync();
    }
}

// Subscribe to integration events
var eventBus = host.Services.GetRequiredService<IEventBus>();

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

await host.RunAsync();
