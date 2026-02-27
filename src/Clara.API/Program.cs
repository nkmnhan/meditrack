using Clara.API.Apis;
using Clara.API.Data;
using Clara.API.Extensions;
using Clara.API.Health;
using Clara.API.Hubs;
using Clara.API.Services;
using FluentValidation;
using MediTrack.ServiceDefaults;
using MediTrack.ServiceDefaults.Extensions;
using Microsoft.EntityFrameworkCore;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults("clara-api");

// Database with pgvector support
builder.Services.AddDbContext<ClaraDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("ClaraDb"),
        npgsqlOptions => npgsqlOptions.UseVector()));

// Authentication & Authorization
builder.Services.AddDefaultAuthentication(builder.Configuration);

// AI Services (IChatClient, IEmbeddingGenerator)
builder.Services.AddAIServices(builder.Configuration);

// Resilient HTTP clients (Deepgram, OpenAI, PatientApi)
builder.Services.AddResilientHttpClients(builder.Configuration);

// Rate limiting policies (prevents abuse and cost overruns)
builder.Services.AddRateLimitingPolicies();

// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Session management services
builder.Services.AddSingleton<BatchTriggerService>();
builder.Services.AddScoped<SessionService>();
builder.Services.AddScoped<DeepgramService>();
builder.Services.AddScoped<SpeakerDetectionService>();

// AI suggestion services
builder.Services.AddScoped<KnowledgeService>();
builder.Services.AddScoped<PatientContextService>();
builder.Services.AddScoped<SuggestionService>();

// Skill loader (loads YAML skills at startup)
builder.Services.AddSingleton<SkillLoaderService>();

// Knowledge seeder (embeds and stores guidelines)
builder.Services.AddScoped<KnowledgeSeederService>();

// Health checks
builder.Services.AddHealthChecks()
    .AddCheck<ClaraHealthCheck>("claradb");

// Required for AuthenticationDelegatingHandler
builder.Services.AddHttpContextAccessor();

// CORS
builder.Services.AddDefaultCors(builder.Configuration, builder.Environment);

// API Explorer for OpenAPI
builder.Services.AddEndpointsApiExplorer();

// Controllers (for DevController)
builder.Services.AddControllers();

// SignalR for real-time communication
builder.Services.AddSignalR();

WebApplication app = builder.Build();

// Apply database migrations on startup
using (IServiceScope scope = app.Services.CreateScope())
{
    ClaraDbContext dbContext = scope.ServiceProvider.GetRequiredService<ClaraDbContext>();
    await dbContext.Database.MigrateAsync();
}

// Load clinical skills at startup
var skillLoader = app.Services.GetRequiredService<SkillLoaderService>();
await skillLoader.LoadSkillsAsync();

// Seed knowledge base (idempotent - skips existing documents)
using (IServiceScope scope = app.Services.CreateScope())
{
    var knowledgeSeeder = scope.ServiceProvider.GetRequiredService<KnowledgeSeederService>();
    await knowledgeSeeder.SeedKnowledgeBaseAsync();
}

app.MapDefaultEndpoints();
app.UseSecurityHeaders();
app.UseCors(CorsExtensions.PolicyName);
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// Map SignalR hub
app.MapHub<SessionHub>("/sessionHub");

// Map API endpoints
app.MapSessionEndpoints();
app.MapKnowledgeEndpoints();

// Map Controllers (DevController)
// Note: DevController uses MVC for test/dev endpoints only. All production endpoints use minimal APIs for performance.
app.MapControllers();

// Health endpoint (basic check)
app.MapGet("/", () => Results.Ok(new { service = "Clara.API", status = "healthy" }));

await app.RunAsync();
