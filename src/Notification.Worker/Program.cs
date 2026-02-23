using MediTrack.EventBus.Abstractions;
using MediTrack.EventBusRabbitMQ;
using MediTrack.Notification;
using MediTrack.Notification.EventHandlers;
using MediTrack.Notification.Services;
using MediTrack.ServiceDefaults.Extensions;
using MediTrack.Shared.Events;

HostApplicationBuilder builder = Host.CreateApplicationBuilder(args);

// Add service defaults (health checks, OpenTelemetry)
builder.Services.AddDefaultHealthChecks();
builder.Services.AddDefaultOpenTelemetry("notification-worker");

// Register notification service
builder.Services.AddSingleton<INotificationService, NotificationService>();

// Register event handlers
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

// Register RabbitMQ EventBus
builder.Services.AddRabbitMQEventBus(builder.Configuration);

// Add background worker for processing
builder.Services.AddHostedService<NotificationWorker>();

IHost host = builder.Build();

// Subscribe to integration events
var eventBus = host.Services.GetRequiredService<IEventBus>();
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

await host.RunAsync();
