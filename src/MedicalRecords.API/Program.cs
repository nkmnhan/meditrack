using FluentValidation;
using MediTrack.EventBusRabbitMQ;
using MediTrack.MedicalRecords.API.Apis;
using MediTrack.MedicalRecords.API.Application.Commands;
using MediTrack.MedicalRecords.API.Application.Mapping;
using MediTrack.MedicalRecords.API.Application.Services;
using MediTrack.MedicalRecords.API.Application.Validations;
using MediTrack.MedicalRecords.Domain.Aggregates;
using MediTrack.MedicalRecords.Infrastructure;
using MediTrack.MedicalRecords.Infrastructure.Repositories;
using MediTrack.ServiceDefaults;
using MediTrack.ServiceDefaults.Extensions;
using MediTrack.ServiceDefaults.Http;
using Microsoft.EntityFrameworkCore;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults("medicalrecords-api");

// Database
builder.Services.AddDbContext<MedicalRecordsDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("MedicalRecordsDb")));

// Authentication & Authorization
builder.Services.AddDefaultAuthentication(builder.Configuration);

// Required for AuthenticationDelegatingHandler
builder.Services.AddHttpContextAccessor();

// HttpClient for cross-service communication (Patient.API)
// AuthenticationDelegatingHandler forwards bearer token from current request
builder.Services.AddTransient<AuthenticationDelegatingHandler>();
builder.Services.AddHttpClient<IPatientResolver, PatientResolver>(client =>
{
    var patientApiUrl = builder.Configuration["PatientApiUrl"] ?? "http://patient-api:8080";
    client.BaseAddress = new Uri(patientApiUrl);
})
.AddHttpMessageHandler<AuthenticationDelegatingHandler>();

// Repositories
builder.Services.AddScoped<IMedicalRecordRepository, MedicalRecordRepository>();

// MediatR (CQRS)
builder.Services.AddMediatR(config =>
    config.RegisterServicesFromAssemblyContaining<CreateMedicalRecordCommand>());

// AutoMapper
builder.Services.AddAutoMapper(config =>
    config.AddProfile<MedicalRecordsMappingProfile>());

// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<CreateMedicalRecordRequestValidator>();

// RabbitMQ EventBus
builder.Services.AddRabbitMQEventBus(builder.Configuration);

// Dev seeder (registered in all environments but endpoints only mapped in Development)
builder.Services.AddScoped<MedicalRecordSeeder>();

// CORS
builder.Services.AddDefaultCors(builder.Configuration, builder.Environment);

// API Explorer for OpenAPI
builder.Services.AddEndpointsApiExplorer();

WebApplication app = builder.Build();

// Apply database migrations on startup
using (IServiceScope scope = app.Services.CreateScope())
{
    MedicalRecordsDbContext dbContext = scope.ServiceProvider.GetRequiredService<MedicalRecordsDbContext>();
    await dbContext.Database.MigrateAsync();
}

app.MapDefaultEndpoints();
app.UseSecurityHeaders();
app.UseCors(CorsExtensions.PolicyName);
app.UseAuthentication();
app.UseAuthorization();

// Map Minimal APIs
app.MapMedicalRecordsApi();

// Development-only endpoints
if (app.Environment.IsDevelopment())
{
    app.MapDevSeederApi();
}

await app.RunAsync();
