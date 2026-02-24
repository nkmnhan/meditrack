using FluentValidation;
using MediTrack.EventBusRabbitMQ;
using MediTrack.MedicalRecords.API.Apis;
using MediTrack.MedicalRecords.API.Application.Commands;
using MediTrack.MedicalRecords.API.Application.Mapping;
using MediTrack.MedicalRecords.API.Application.Validations;
using MediTrack.MedicalRecords.Domain.Aggregates;
using MediTrack.MedicalRecords.Infrastructure;
using MediTrack.MedicalRecords.Infrastructure.Repositories;
using MediTrack.ServiceDefaults;
using MediTrack.ServiceDefaults.Extensions;
using Microsoft.EntityFrameworkCore;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults("medicalrecords-api");

// Database
builder.Services.AddDbContext<MedicalRecordsDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("MedicalRecordsDb")));

// Authentication & Authorization
builder.Services.AddDefaultAuthentication(builder.Configuration);

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

// CORS
builder.Services.AddDefaultCors(builder.Configuration, builder.Environment);

// API Explorer for OpenAPI
builder.Services.AddEndpointsApiExplorer();

WebApplication app = builder.Build();

// Create database on startup (DEVELOPMENT ONLY — use deployment pipeline in production)
if (app.Environment.IsDevelopment())
{
    using IServiceScope scope = app.Services.CreateScope();
    MedicalRecordsDbContext dbContext = scope.ServiceProvider.GetRequiredService<MedicalRecordsDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
}

app.MapDefaultEndpoints();
app.UseCors(CorsExtensions.PolicyName);
app.UseAuthentication();
app.UseAuthorization();

// Map Minimal APIs
app.MapMedicalRecordsApi();

await app.RunAsync();
