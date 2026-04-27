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
using Microsoft.Extensions.AI;
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

// Rate limiting policies (prevents abuse and cost overruns; relaxed in Development for E2E tests)
builder.Services.AddRateLimitingPolicies(builder.Environment);

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
builder.Services.AddScoped<ITranscriptionService, DeepgramService>();
builder.Services.AddKeyedSingleton<ISttProvider>(SttProviderType.Deepgram, (sp, _) => new DeepgramSttProvider(
    sp.GetRequiredService<IConfiguration>(),
    new DeepgramWebSocketFactory(),
    sp.GetRequiredService<ILogger<DeepgramSttProvider>>()));
builder.Services.AddKeyedSingleton<ISttProvider, WhisperSttProvider>(SttProviderType.Whisper);
builder.Services.AddSingleton<ISttProviderFactory, SttProviderFactory>();
builder.Services.AddScoped<ISpeakerDetectionService, SpeakerDetectionService>();

// AI suggestion services
builder.Services.AddScoped<IKnowledgeService, KnowledgeService>();
builder.Services.AddScoped<ICorrectiveRagService, CorrectiveRagService>();
builder.Services.AddScoped<IPatientContextService, PatientContextService>();
builder.Services.AddScoped<ISuggestionCriticService, SuggestionCriticService>();

// Agent tools — scoped so each request gets its own instance with fresh event callback
builder.Services.AddScoped<AgentTools>();

// Agent registry — keyed so callers can resolve by agent ID
builder.Services.AddKeyedScoped<IAgentService, ClaraDoctorAgent>(AgentKeys.ClaraDoctor);
builder.Services.AddKeyedScoped<IAgentService, PatientCompanionAgent>(AgentKeys.PatientCompanion);

// Default agent resolved by SuggestionService (unkeyed) — doctor agent for clinical sessions
builder.Services.AddScoped<IAgentService>(sp =>
    sp.GetRequiredKeyedService<IAgentService>(AgentKeys.ClaraDoctor));

builder.Services.AddScoped<ISuggestionService, SuggestionService>();
builder.Services.AddScoped<IAgentMemoryService, AgentMemoryService>();

// Asking mode — uses OnDemand (accuracy-optimised) chat client, no live session needed
builder.Services.AddScoped<IAskService>(sp => new AskService(
    sp.GetRequiredService<IKnowledgeService>(),
    sp.GetRequiredService<IPatientContextService>(),
    sp.GetRequiredKeyedService<IChatClient>(ChatClientKeys.OnDemand),
    sp.GetRequiredService<ILogger<AskService>>()
));

// Analytics service (admin reports)
builder.Services.AddScoped<AnalyticsService>();

// Whisper STT HTTP client (self-hosted faster-whisper OpenAI-compatible API)
builder.Services.AddHttpClient<WhisperSttProvider>((sp, client) =>
{
    var baseUrl = sp.GetRequiredService<IConfiguration>()["AI:Whisper:BaseUrl"] ?? "http://whisper-api:8000";
    client.BaseAddress = new Uri(baseUrl);
});

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
// MaximumReceiveMessageSize raised to 1MB: audio chunks (WebM/Opus) can exceed the 32KB default,
// especially the first chunk which carries the full EBML container header + codec info.
builder.Services.AddSignalR(options =>
{
    options.MaximumReceiveMessageSize = 1024 * 1024; // 1MB
});

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
app.MapAskEndpoints();
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
