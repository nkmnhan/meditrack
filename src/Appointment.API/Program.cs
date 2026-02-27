using Appointment.API.Apis;
using Appointment.API.Infrastructure;
using Appointment.API.Mapping;
using Appointment.API.Services;
using Appointment.API.Validators;
using FluentValidation;
using MediTrack.EventBusRabbitMQ;
using MediTrack.ServiceDefaults;
using MediTrack.ServiceDefaults.Extensions;
using Microsoft.EntityFrameworkCore;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults("appointment-api");

// Database
builder.Services.AddDbContext<AppointmentDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AppointmentDb")));

// Authentication & Authorization
builder.Services.AddDefaultAuthentication(builder.Configuration);

// Services
builder.Services.AddScoped<IAppointmentService, AppointmentService>();

// AutoMapper
builder.Services.AddAutoMapper(config => config.AddProfile<AppointmentMappingProfile>());

// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<CreateAppointmentRequestValidator>();

// RabbitMQ EventBus
builder.Services.AddRabbitMQEventBus(builder.Configuration);

// CORS
builder.Services.AddDefaultCors(builder.Configuration, builder.Environment);

// API Explorer for OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

WebApplication app = builder.Build();

// Create database on startup (DEVELOPMENT ONLY — use deployment pipeline in production)
if (app.Environment.IsDevelopment())
{
    using IServiceScope scope = app.Services.CreateScope();
    AppointmentDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppointmentDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
}

app.MapDefaultEndpoints();
app.UseCors(CorsExtensions.PolicyName);
app.UseAuthentication();
app.UseAuthorization();

// Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Map Minimal APIs
app.MapAppointmentsApi();

await app.RunAsync();
