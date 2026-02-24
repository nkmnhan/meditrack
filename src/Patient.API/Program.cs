using FluentValidation;
using MediTrack.EventBusRabbitMQ;
using MediTrack.ServiceDefaults;
using MediTrack.ServiceDefaults.Extensions;
using MediTrack.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Patient.API.Apis;
using Patient.API.Infrastructure;
using Patient.API.Mapping;
using Patient.API.Services;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults("patient-api");

// Database
builder.Services.AddDbContext<PatientDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("PatientDb")));

// Services
builder.Services.AddScoped<IPatientService, PatientService>();

// AutoMapper
builder.Services.AddAutoMapper(configuration =>
    configuration.AddProfile<PatientMappingProfile>());

// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Authentication & Authorization
builder.Services.AddDefaultAuthentication(builder.Configuration);

// RabbitMQ EventBus
builder.Services.AddRabbitMQEventBus(builder.Configuration);

// PHI Audit Logging
builder.Services.AddPHIAuditLogging();

// OpenAPI / Swagger
builder.Services.AddEndpointsApiExplorer();

WebApplication app = builder.Build();

app.MapDefaultEndpoints();
app.UseAuthentication();
app.UseAuthorization();

// Map APIs
app.MapPatientsApi();

await app.RunAsync();
