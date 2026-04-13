using Appointment.API.Infrastructure;
using Clara.API.Data;
using MediTrack.Identity.Data;
using MediTrack.Identity.Models;
using MediTrack.MedicalRecords.Infrastructure;
using MediTrack.ServiceDefaults;
using MediTrack.Simulator;
using MediTrack.Simulator.Configuration;
using MediTrack.Simulator.Seeders;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Notification.Worker.Data;
using Patient.API.Infrastructure;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults("simulator");

// ── All 6 DbContexts ──

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("IdentityDb")));

builder.Services.AddDbContext<PatientDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PatientDb")));

builder.Services.AddDbContext<AppointmentDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("AppointmentDb")));

builder.Services.AddDbContext<MedicalRecordsDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("MedicalRecordsDb")));

builder.Services.AddDbContext<AuditDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("AuditDatabase")));

// EnableDynamicJson is required for List<Guid> JSONB columns in Npgsql 8+.
// ClaraDataSourceFactory wraps NpgsqlDataSourceBuilder with EnableDynamicJson + pgvector.
var claraDataSource = ClaraDataSourceFactory.Build(
    builder.Configuration.GetConnectionString("ClaraDb")!);
builder.Services.AddDbContext<ClaraDbContext>(options =>
    options.UseNpgsql(claraDataSource, npgsqlOptions => npgsqlOptions.UseVector()));

// ── ASP.NET Identity (for IdentitySeeder) ──

builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// ── Seeders ──

builder.Services.AddScoped<IdentitySeeder>();
builder.Services.AddScoped<PatientSeeder>();
builder.Services.AddScoped<AppointmentSeeder>();
builder.Services.AddScoped<MedicalRecordSeeder>();
builder.Services.AddScoped<AuditSeeder>();
builder.Services.AddScoped<SessionSeeder>();

// ── Configuration ──

builder.Services.Configure<SimulatorOptions>(
    builder.Configuration.GetSection(SimulatorOptions.SectionName));

// ── Orchestrator ──

builder.Services.AddHostedService<SimulatorOrchestrator>();

WebApplication app = builder.Build();

app.MapDefaultEndpoints();

await app.RunAsync();
