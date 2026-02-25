using Appointment.API.Apis;
using Appointment.API.Infrastructure;
using Appointment.API.Mapping;
using Appointment.API.Services;
using Appointment.API.Validators;
using FluentValidation;
using MediTrack.EventBusRabbitMQ;
using MediTrack.ServiceDefaults;
using MediTrack.ServiceDefaults.Extensions;
using MediTrack.ServiceDefaults.Http;
using Microsoft.EntityFrameworkCore;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults("appointment-api");

// Database
builder.Services.AddDbContext<AppointmentDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("AppointmentDb")));

// Authentication & Authorization
builder.Services.AddDefaultAuthentication(builder.Configuration);

// Required for AuthenticationDelegatingHandler
builder.Services.AddHttpContextAccessor();

// Services
builder.Services.AddScoped<IAppointmentService, AppointmentService>();

// Patient resolver for cross-service IDOR checks
// AuthenticationDelegatingHandler forwards bearer token from current request
builder.Services.AddTransient<AuthenticationDelegatingHandler>();
builder.Services.AddHttpClient<IPatientResolver, PatientResolver>(client =>
{
    var patientApiUrl = builder.Configuration["PatientApiUrl"] ?? "http://patient-api:8080";
    client.BaseAddress = new Uri(patientApiUrl);
})
.AddHttpMessageHandler<AuthenticationDelegatingHandler>();

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

WebApplication app = builder.Build();

// Apply database migrations on startup
using (IServiceScope scope = app.Services.CreateScope())
{
    AppointmentDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppointmentDbContext>();
    await dbContext.Database.MigrateAsync();
}

app.MapDefaultEndpoints();
app.UseSecurityHeaders();
app.UseCors(CorsExtensions.PolicyName);
app.UseAuthentication();
app.UseAuthorization();

// Map Minimal APIs
app.MapAppointmentsApi();

await app.RunAsync();
