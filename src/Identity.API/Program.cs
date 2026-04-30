using System.Threading.RateLimiting;
using Duende.IdentityServer.EntityFramework.DbContexts;
using MediTrack.Identity.Apis;
using MediTrack.Identity.Data;
using MediTrack.Identity.Models;
using MediTrack.Identity.Services;
using MediTrack.ServiceDefaults.Middleware;
using MediTrack.ServiceDefaults;
using MediTrack.ServiceDefaults.Extensions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults("identity-api");

// Dependency health checks (no RabbitMQ — Identity doesn't publish events)
builder.Services.AddHealthChecks()
    .AddNpgsqlHealthCheck(builder.Configuration, "IdentityDb");

// EF Core + PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("IdentityDb")));

// ASP.NET Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        // Password requirements
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequiredLength = 8;

        // Lockout policy (OWASP A07:2025 - Identification and Authentication Failures)
        options.Lockout.MaxFailedAccessAttempts = 5; // Lock after 5 failed attempts
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15); // Lock for 15 minutes
        options.Lockout.AllowedForNewUsers = true; // Enable lockout for all users
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// JWT Bearer auth for REST API endpoints (alongside cookie auth for Razor Pages).
// Identity.API is the IdentityServer itself, so it validates tokens it issued.
string identityUrl = builder.Configuration["IdentityUrl"]
    ?? throw new InvalidOperationException("IdentityUrl configuration is required.");

builder.Services.AddAuthentication()
    .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
    {
        options.Authority = identityUrl;
        options.RequireHttpsMetadata = true;
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false,
            ValidateIssuer = false,
            NameClaimType = "name",
            RoleClaimType = "role"
        };
    });

builder.Services.AddAuthorization();

// Duende IdentityServer with EF Core configuration and operational stores
string identityConnectionString = builder.Configuration.GetConnectionString("IdentityDb")
    ?? throw new InvalidOperationException("IdentityDb connection string is required.");

builder.Services
    .AddIdentityServer(options =>
    {
        options.Events.RaiseErrorEvents = true;
        options.Events.RaiseInformationEvents = true;
        options.Events.RaiseFailureEvents = true;
        options.Events.RaiseSuccessEvents = true;
        options.EmitStaticAudienceClaim = true;
    })
    .AddConfigurationStore(storeOptions =>
    {
        storeOptions.ConfigureDbContext = dbContextBuilder =>
            dbContextBuilder.UseNpgsql(
                identityConnectionString,
                npgsqlOptions => npgsqlOptions.MigrationsAssembly("Identity.API"));
    })
    .AddOperationalStore(storeOptions =>
    {
        storeOptions.ConfigureDbContext = dbContextBuilder =>
            dbContextBuilder.UseNpgsql(
                identityConnectionString,
                npgsqlOptions => npgsqlOptions.MigrationsAssembly("Identity.API"));
        storeOptions.EnableTokenCleanup = true;
        storeOptions.TokenCleanupInterval = 3600;
    })
    .AddAspNetIdentity<ApplicationUser>()
    .AddProfileService<ProfileService>();

// CORS
builder.Services.AddDefaultCors(builder.Configuration, builder.Environment);

// Rate Limiting (OWASP A07:2025 - Identification and Authentication Failures)
builder.Services.AddRateLimiter(options =>
{
    // Per-IP rate limit for login attempts to prevent brute-force attacks (OWASP A07:2025)
    // Keyed by remote IP so one attacker doesn't exhaust the limit for all users
    options.AddPolicy("login", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

    // Per-IP rate limit for registration to prevent abuse
    options.AddPolicy("register", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(5),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

    // Rejection handler for rate-limited requests
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsync(
            "Too many requests. Please try again later.", token);
    };
});

builder.Services.AddRazorPages();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

WebApplication app = builder.Build();

// Apply database migrations on startup
using (IServiceScope scope = app.Services.CreateScope())
{
    ApplicationDbContext identityDbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await identityDbContext.Database.MigrateAsync();

    ConfigurationDbContext configurationDbContext = scope.ServiceProvider.GetRequiredService<ConfigurationDbContext>();
    await configurationDbContext.Database.MigrateAsync();

    PersistedGrantDbContext persistedGrantDbContext = scope.ServiceProvider.GetRequiredService<PersistedGrantDbContext>();
    await persistedGrantDbContext.Database.MigrateAsync();
}

app.MapDefaultEndpoints();
// Identity API serves Razor Pages (login/register UI) — CSP:
// - No 'unsafe-inline' — all scripts in wwwroot/js/, all styles in wwwroot/css/ (OWASP A02:2025)
// - Google Fonts allowed for Inter typeface (style-src + font-src)
// - frame-ancestors: oidc-client-ts frames Identity for silent renew, checksession, signout
string webClientUrl = builder.Configuration["WebClientUrl"] ?? "https://localhost:3000";
string identityCsp = $"default-src 'self'; style-src 'self' https://fonts.googleapis.com; script-src 'self'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'self' {webClientUrl}";
app.UseSecurityHeaders(identityCsp);
app.UseRateLimiter();
app.UseCors(CorsExtensions.PolicyName);
app.UseStaticFiles();
app.UseIdentityServer();
app.UseAuthorization();
app.MapRazorPages();
app.MapUsersApi();
app.MapIdentityAnalyticsEndpoints();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

await app.RunAsync();
