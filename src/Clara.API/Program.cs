using Clara.API.Apis;
using Clara.API.Application.Models;
using Clara.API.Data;
using Clara.API.Extensions;
using Clara.API.Health;
using Clara.API.Hubs;
using Clara.API.Services;
using MediTrack.EventBusRabbitMQ;
using FluentValidation;
using MediTrack.ServiceDefaults;
using MediTrack.ServiceDefaults.Extensions;
using MediTrack.Shared.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults("clara-api");

// Database with pgvector + EnableDynamicJson (required for List<Guid> JSONB columns in Npgsql 8).
// DataSource built via ClaraDataSourceFactory to avoid the Pgvector/Pgvector.EntityFrameworkCore
// UseVector() extension method conflict — see ClaraDbContextFactory.cs.
var claraDataSource = ClaraDataSourceFactory.Build(
    builder.Configuration.GetConnectionString("ClaraDb")!);

builder.Services.AddDbContext<ClaraDbContext>(options =>
    options.UseNpgsql(claraDataSource, npgsqlOptions => npgsqlOptions.UseVector()));

// Read-only audit database context (cross-boundary read access to Notification.Worker's audit DB)
builder.Services.AddDbContext<AuditReadContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("AuditDatabase")));

// Authentication & Authorization
builder.Services.AddDefaultAuthentication(builder.Configuration);

// AI options — strongly-typed, validated at startup (fail fast on misconfiguration)
builder.Services.AddOptions<AIOptions>()
    .BindConfiguration(AIOptions.SectionName)
    .ValidateOnStart();

// AI Services (IChatClient, IEmbeddingGenerator)
builder.Services.AddAIServices(builder.Configuration);

// Resilient HTTP clients (Deepgram, OpenAI, PatientApi)
builder.Services.AddResilientHttpClients(builder.Configuration);

// Rate limiting policies (prevents abuse and cost overruns)
builder.Services.AddRateLimitingPolicies();

// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Batch trigger options (AI:Batching config section)
builder.Services.Configure<BatchTriggerOptions>(
    builder.Configuration.GetSection(BatchTriggerOptions.SectionName));

// PHI audit event bus (HIPAA mandatory — every AI-PHI interaction must be audit-logged)
builder.Services.AddRabbitMQEventBus(builder.Configuration);
builder.Services.AddScoped<IPHIAuditService, PHIAuditService>();

// Session management services
builder.Services.AddSingleton<IBatchTriggerService, BatchTriggerService>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<DeepgramService>();
builder.Services.AddScoped<SpeakerDetectionService>();

// AI suggestion services
builder.Services.AddScoped<IKnowledgeService, KnowledgeService>();
builder.Services.AddScoped<ICorrectiveRagService, CorrectiveRagService>();
builder.Services.AddScoped<IPatientContextService, PatientContextService>();
builder.Services.AddScoped<ISuggestionCriticService, SuggestionCriticService>();

// Agent registry — keyed so callers can resolve by agent ID
builder.Services.AddKeyedScoped<IAgentService, ClaraDoctorAgent>("clara-doctor");
builder.Services.AddKeyedScoped<IAgentService, PatientCompanionAgent>("patient-companion");

// Default agent resolved by SuggestionService (unkeyed) — doctor agent for clinical sessions
builder.Services.AddScoped<IAgentService>(sp =>
    sp.GetRequiredKeyedService<IAgentService>("clara-doctor"));

builder.Services.AddScoped<ISuggestionService, SuggestionService>();
builder.Services.AddScoped<IAgentMemoryService, AgentMemoryService>();

// Analytics service (admin reports)
builder.Services.AddScoped<AnalyticsService>();

// Infrastructure monitoring services
builder.Services.AddHttpClient<PrometheusService>(client =>
{
    var prometheusUrl = builder.Configuration["Monitoring:PrometheusUrl"] ?? "http://prometheus:9090";
    client.BaseAddress = new Uri(prometheusUrl);
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddHttpClient<RabbitMQMonitorService>(client =>
{
    var rabbitMQUrl = builder.Configuration["Monitoring:RabbitMQManagementUrl"] ?? "http://rabbitmq:15672";
    client.BaseAddress = new Uri(rabbitMQUrl);
    client.Timeout = TimeSpan.FromSeconds(10);

    // RabbitMQ Management API uses Basic auth
    var rabbitUser = builder.Configuration["RabbitMQ:UserName"] ?? "guest";
    var rabbitPass = builder.Configuration["RabbitMQ:Password"] ?? "guest";
    var credentials = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($"{rabbitUser}:{rabbitPass}"));
    client.DefaultRequestHeaders.Authorization =
        new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);
});
builder.Services.AddSingleton<DatabaseMonitorService>();

// Dashboard aggregator (caches results in IMemoryCache)
builder.Services.AddMemoryCache();
builder.Services.AddScoped<DashboardAggregatorService>();

// Skill loader (loads YAML skills at startup)
builder.Services.AddSingleton<SkillLoaderService>();

// Knowledge seeder (embeds and stores guidelines)
builder.Services.AddScoped<KnowledgeSeederService>();

// Health checks
builder.Services.AddHealthChecks()
    .AddCheck<ClaraHealthCheck>("claradb")
    .AddNpgsqlHealthCheck(builder.Configuration, "ClaraDb")
    .AddRabbitMQHealthCheck(builder.Configuration);

// Health check HTTP client (for system health aggregation endpoint)
builder.Services.AddHttpClient("HealthCheck", client =>
{
    client.Timeout = TimeSpan.FromSeconds(5);
});

// Required for AuthenticationDelegatingHandler
builder.Services.AddHttpContextAccessor();

// CORS
builder.Services.AddDefaultCors(builder.Configuration, builder.Environment);

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Controllers (for DevController)
builder.Services.AddControllers();

// SignalR for real-time communication
builder.Services.AddSignalR();

WebApplication app = builder.Build();

// Validate critical config in production (OWASP A02:2025 — Security Misconfiguration)
ConfigValidator.ValidateProductionConfig(builder.Configuration, app.Environment);

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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Map SignalR hub
app.MapHub<SessionHub>("/sessionHub");

// Map API endpoints
app.MapSessionEndpoints();
app.MapKnowledgeEndpoints();
app.MapAuditEndpoints();
app.MapAnalyticsEndpoints();
app.MapSystemHealthEndpoints();
app.MapInfrastructureEndpoints();
app.MapDashboardEndpoints();
app.MapAnalyticsProxyEndpoints();

// Map Controllers (DevController)
// Note: DevController uses MVC for test/dev endpoints only. All production endpoints use minimal APIs for performance.
app.MapControllers();

// Health endpoint (basic check)
app.MapGet("/", () => Results.Ok(new { service = "Clara.API", status = "healthy" }));

await app.RunAsync();
