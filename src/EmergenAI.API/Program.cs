using EmergenAI.API.Data;
using EmergenAI.API.Health;
using MediTrack.ServiceDefaults;
using MediTrack.ServiceDefaults.Extensions;
using Microsoft.EntityFrameworkCore;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults("emergenai-api");

// Database with pgvector support
builder.Services.AddDbContext<EmergenDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("EmergenDb"),
        npgsqlOptions => npgsqlOptions.UseVector()));

// Authentication & Authorization
builder.Services.AddDefaultAuthentication(builder.Configuration);

// Health checks
builder.Services.AddHealthChecks()
    .AddCheck<EmergenHealthCheck>("emergendb");

// Required for AuthenticationDelegatingHandler
builder.Services.AddHttpContextAccessor();

// CORS
builder.Services.AddDefaultCors(builder.Configuration, builder.Environment);

// API Explorer for OpenAPI
builder.Services.AddEndpointsApiExplorer();

// SignalR for real-time communication
builder.Services.AddSignalR();

WebApplication app = builder.Build();

// Apply database migrations on startup
using (IServiceScope scope = app.Services.CreateScope())
{
    EmergenDbContext dbContext = scope.ServiceProvider.GetRequiredService<EmergenDbContext>();
    await dbContext.Database.MigrateAsync();
}

app.MapDefaultEndpoints();
app.UseSecurityHeaders();
app.UseCors(CorsExtensions.PolicyName);
app.UseAuthentication();
app.UseAuthorization();

// Health endpoint (basic check)
app.MapGet("/", () => Results.Ok(new { service = "EmergenAI.API", status = "healthy" }));

await app.RunAsync();
