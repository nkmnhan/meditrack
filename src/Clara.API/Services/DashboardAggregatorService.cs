using System.Text.Json;
using Clara.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Clara.API.Services;

/// <summary>
/// Aggregates dashboard overview data from multiple microservices via HTTP.
/// Uses IMemoryCache (60s TTL) to prevent hammering downstream services.
/// </summary>
public sealed class DashboardAggregatorService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ClaraDbContext _dbContext;
    private readonly IMemoryCache _cache;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<DashboardAggregatorService> _logger;

    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(60);
    private const string CacheKey = "dashboard_overview";

    public DashboardAggregatorService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ClaraDbContext dbContext,
        IMemoryCache cache,
        IHttpContextAccessor httpContextAccessor,
        ILogger<DashboardAggregatorService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _dbContext = dbContext;
        _cache = cache;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task<DashboardOverview> GetOverviewAsync(CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue(CacheKey, out DashboardOverview? cached) && cached is not null)
        {
            return cached;
        }

        var patientTask = GetPatientStatsAsync(cancellationToken);
        var appointmentTask = GetAppointmentStatsAsync(cancellationToken);
        var identityTask = GetIdentityStatsAsync(cancellationToken);
        var claraTask = GetClaraStatsAsync(cancellationToken);
        var healthTask = GetSystemStatusAsync(cancellationToken);

        await Task.WhenAll(patientTask, appointmentTask, identityTask, claraTask, healthTask);

        var overview = new DashboardOverview
        {
            TotalPatients = patientTask.Result.Total,
            PatientsTrend = patientTask.Result.Trend,
            TodayAppointments = appointmentTask.Result.TodayCount,
            AppointmentsTrend = appointmentTask.Result.Trend,
            ClaraSessions = claraTask.Result.Total,
            ClaraSessionsTrend = claraTask.Result.Trend,
            ActiveUsers = identityTask.Result.ActiveUsers,
            ActiveUsersTrend = identityTask.Result.Trend,
            SystemStatus = healthTask.Result
        };

        _cache.Set(CacheKey, overview, CacheDuration);
        return overview;
    }

    private async Task<(int Total, double Trend)> GetPatientStatsAsync(CancellationToken cancellationToken)
    {
        try
        {
            var httpClient = CreateServiceClient("PatientApi", "https://patient-api:8443");
            var demographics = await httpClient.GetFromJsonAsync<JsonElement>(
                "/api/admin/analytics/demographics", cancellationToken);

            var total = demographics.TryGetProperty("totalPatients", out var totalElement)
                ? totalElement.GetInt32() : 0;

            // Get recent trend from registration data
            var trends = await httpClient.GetFromJsonAsync<JsonElement>(
                "/api/admin/analytics/registration-trends?days=60", cancellationToken);

            var trend = CalculateTrend(trends);
            return (total, trend);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to fetch patient stats");
            return (0, 0);
        }
    }

    private async Task<(int TodayCount, double Trend)> GetAppointmentStatsAsync(CancellationToken cancellationToken)
    {
        try
        {
            var httpClient = CreateServiceClient("AppointmentApi", "https://appointment-api:8443");
            var volume = await httpClient.GetFromJsonAsync<JsonElement>(
                "/api/admin/analytics/volume?days=30", cancellationToken);

            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var yesterday = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");

            int todayCount = 0;
            int yesterdayCount = 0;

            foreach (var entry in volume.EnumerateArray())
            {
                var date = entry.TryGetProperty("date", out var dateElement) ? dateElement.GetString() : "";
                var total = entry.TryGetProperty("total", out var totalElement) ? totalElement.GetInt32() : 0;

                if (date == today) todayCount = total;
                if (date == yesterday) yesterdayCount = total;
            }

            var trend = yesterdayCount > 0
                ? Math.Round(((double)(todayCount - yesterdayCount) / yesterdayCount) * 100, 1)
                : 0;

            return (todayCount, trend);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to fetch appointment stats");
            return (0, 0);
        }
    }

    private async Task<(int ActiveUsers, double Trend)> GetIdentityStatsAsync(CancellationToken cancellationToken)
    {
        try
        {
            var httpClient = CreateServiceClient("IdentityApi", "https://identity-api:8443");
            var stats = await httpClient.GetFromJsonAsync<JsonElement>(
                "/api/admin/analytics/user-stats", cancellationToken);

            var activeUsers = stats.TryGetProperty("activeUsersLast30Days", out var activeElement)
                ? activeElement.GetInt32() : 0;
            var totalUsers = stats.TryGetProperty("totalUsers", out var totalElement)
                ? totalElement.GetInt32() : 0;

            // Trend is active rate
            var trend = totalUsers > 0
                ? Math.Round(((double)activeUsers / totalUsers) * 100, 1)
                : 0;

            return (activeUsers, trend);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to fetch identity stats");
            return (0, 0);
        }
    }

    private async Task<(int Total, double Trend)> GetClaraStatsAsync(CancellationToken cancellationToken)
    {
        try
        {
            var thirtyDaysAgo = DateTimeOffset.UtcNow.AddDays(-30);
            var sixtyDaysAgo = DateTimeOffset.UtcNow.AddDays(-60);

            var currentSessions = await _dbContext.Sessions
                .Where(session => session.StartedAt >= thirtyDaysAgo)
                .CountAsync(cancellationToken);

            var previousSessions = await _dbContext.Sessions
                .Where(session => session.StartedAt >= sixtyDaysAgo && session.StartedAt < thirtyDaysAgo)
                .CountAsync(cancellationToken);

            var trend = previousSessions > 0
                ? Math.Round(((double)(currentSessions - previousSessions) / previousSessions) * 100, 1)
                : 0;

            return (currentSessions, trend);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to fetch Clara session stats");
            return (0, 0);
        }
    }

    private async Task<string> GetSystemStatusAsync(CancellationToken cancellationToken)
    {
        try
        {
            var httpClient = _httpClientFactory.CreateClient("HealthCheck");
            // Clara.API's own health endpoint includes all dependency checks
            var response = await httpClient.GetAsync("https://localhost:8443/health", cancellationToken);
            return response.IsSuccessStatusCode ? "Healthy" : "Degraded";
        }
        catch
        {
            return "Unknown";
        }
    }

    private HttpClient CreateServiceClient(string configKey, string defaultUrl)
    {
        var httpClient = _httpClientFactory.CreateClient("HealthCheck");
        var baseUrl = _configuration[$"Services:{configKey}"] ?? defaultUrl;
        httpClient.BaseAddress = new Uri(baseUrl);

        // Forward the caller's Bearer token to the downstream service
        var authHeader = _httpContextAccessor.HttpContext?.Request.Headers.Authorization.ToString();
        if (!string.IsNullOrEmpty(authHeader))
        {
            httpClient.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", authHeader);
        }

        return httpClient;
    }

    private static double CalculateTrend(JsonElement trendsArray)
    {
        if (trendsArray.ValueKind != JsonValueKind.Array)
            return 0;

        var items = trendsArray.EnumerateArray().ToList();
        if (items.Count < 2)
            return 0;

        var midpoint = items.Count / 2;
        var firstHalf = items.Take(midpoint).Sum(item =>
            item.TryGetProperty("count", out var countElement) ? countElement.GetInt32() : 0);
        var secondHalf = items.Skip(midpoint).Sum(item =>
            item.TryGetProperty("count", out var countElement) ? countElement.GetInt32() : 0);

        return firstHalf > 0
            ? Math.Round(((double)(secondHalf - firstHalf) / firstHalf) * 100, 1)
            : 0;
    }
}

public sealed record DashboardOverview
{
    public required int TotalPatients { get; init; }
    public required double PatientsTrend { get; init; }
    public required int TodayAppointments { get; init; }
    public required double AppointmentsTrend { get; init; }
    public required int ClaraSessions { get; init; }
    public required double ClaraSessionsTrend { get; init; }
    public required int ActiveUsers { get; init; }
    public required double ActiveUsersTrend { get; init; }
    public required string SystemStatus { get; init; }
}
