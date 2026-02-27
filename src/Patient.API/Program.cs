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
builder.Services.AddScoped<PatientSeeder>();

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

// CORS
builder.Services.AddDefaultCors(builder.Configuration, builder.Environment);

// OpenAPI / Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

WebApplication app = builder.Build();

// Create database on startup (DEVELOPMENT ONLY — use deployment pipeline in production)
if (app.Environment.IsDevelopment())
{
    using IServiceScope scope = app.Services.CreateScope();
    PatientDbContext dbContext = scope.ServiceProvider.GetRequiredService<PatientDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
}

app.MapDefaultEndpoints();
app.UseCors(CorsExtensions.PolicyName);
app.UseAuthentication();
app.UseAuthorization();

// Map APIs
app.MapPatientsApi();

// Development-only endpoints
if (app.Environment.IsDevelopment())
{
    app.MapDevSeederApi();

    // Swagger
    app.UseSwagger();
    app.UseSwaggerUI();
}

await app.RunAsync();
