using MediTrack.Notification;
using MediTrack.ServiceDefaults.Extensions;

HostApplicationBuilder builder = Host.CreateApplicationBuilder(args);

builder.Services.AddDefaultHealthChecks();

builder.Services.AddHostedService<NotificationWorker>();

IHost host = builder.Build();
await host.RunAsync();
