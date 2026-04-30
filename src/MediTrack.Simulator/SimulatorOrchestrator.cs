using System.Diagnostics;
using MediTrack.Simulator.Configuration;
using MediTrack.Simulator.Seeders;
using Microsoft.Extensions.Options;

namespace MediTrack.Simulator;

/// <summary>
/// BackgroundService that orchestrates all seeders in dependency order.
/// Phase 1: Identity (users + roles)
/// Phase 2: Patients (returns seed results for downstream)
/// Phase 3: Appointments, MedicalRecords, Audit, Sessions (parallel — different DBs)
/// Exits cleanly after completion.
/// </summary>
public sealed class SimulatorOrchestrator : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHostApplicationLifetime _applicationLifetime;
    private readonly SimulatorOptions _options;
    private readonly ILogger<SimulatorOrchestrator> _logger;

    public SimulatorOrchestrator(
        IServiceScopeFactory scopeFactory,
        IHostApplicationLifetime applicationLifetime,
        IOptions<SimulatorOptions> options,
        ILogger<SimulatorOrchestrator> logger)
    {
        _scopeFactory = scopeFactory;
        _applicationLifetime = applicationLifetime;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Small delay to let the host finish startup (health check endpoints)
        await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);

        var totalStopwatch = Stopwatch.StartNew();
        var results = new List<SeederResult>();

        _logger.LogInformation(
            "=== MediTrack Simulator Starting ===" +
            "\n  Patients: {PatientCount}" +
            "\n  Appointments/patient: {AppointmentsPerPatient}" +
            "\n  MedicalRecords/patient: {MedicalRecordsPerPatient}" +
            "\n  Audit logs: {AuditLogCount}" +
            "\n  Clara sessions: {ClaraSessionCount}" +
            "\n  Clear existing: {ClearExisting}",
            _options.PatientCount,
            _options.AppointmentsPerPatient,
            _options.MedicalRecordsPerPatient,
            _options.AuditLogCount,
            _options.ClaraSessionCount,
            _options.ClearExisting);

        // ── Phase 1: Identity ──
        _logger.LogInformation("── Phase 1: Identity (users + roles) ──");
        var identityResult = await RunSeederAsync("Identity", async (scope, ct) =>
        {
            var seeder = scope.ServiceProvider.GetRequiredService<IdentitySeeder>();
            var (created, failed) = await seeder.SeedAsync(ct);
            return (created, failed);
        }, stoppingToken);
        results.Add(identityResult);

        // ── Phase 2: Patients ──
        _logger.LogInformation("── Phase 2: Patients ──");
        List<PatientSeedResult> patientSeedResults = [];

        var patientResult = await RunSeederAsync("Patients", async (scope, ct) =>
        {
            var seeder = scope.ServiceProvider.GetRequiredService<PatientSeeder>();
            var (patients, failed) = await seeder.SeedPatientsAsync(
                _options.PatientCount, _options.ClearExisting, ct);
            patientSeedResults = patients;
            return (patients.Count, failed);
        }, stoppingToken);
        results.Add(patientResult);

        // ── Phase 3: Dependent data (parallel) ──
        _logger.LogInformation("── Phase 3: Dependent data (parallel) ──");
        var patientIds = patientSeedResults.Select(patient => patient.Id).ToList();

        var phase3Tasks = new List<Task<SeederResult>>
        {
            RunSeederAsync("Appointments", async (scope, ct) =>
            {
                var seeder = scope.ServiceProvider.GetRequiredService<AppointmentSeeder>();
                var (created, failed) = await seeder.SeedAppointmentsAsync(
                    patientSeedResults, _options.AppointmentsPerPatient, _options.ClearExisting, ct);
                return (created, failed);
            }, stoppingToken),

            RunSeederAsync("MedicalRecords", async (scope, ct) =>
            {
                var seeder = scope.ServiceProvider.GetRequiredService<MedicalRecordSeeder>();
                var (created, failed) = await seeder.SeedMedicalRecordsAsync(
                    patientIds, _options.MedicalRecordsPerPatient, _options.ClearExisting, ct);
                return (created, failed);
            }, stoppingToken),

            RunSeederAsync("AuditLogs", async (scope, ct) =>
            {
                var seeder = scope.ServiceProvider.GetRequiredService<AuditSeeder>();
                var (created, failed) = await seeder.SeedAsync(
                    _options.AuditLogCount, _options.ClearExisting, patientIds, ct);
                return (created, failed);
            }, stoppingToken),

            RunSeederAsync("ClaraSessions", async (scope, ct) =>
            {
                var seeder = scope.ServiceProvider.GetRequiredService<SessionSeeder>();
                var (sessionsCreated, suggestionsCreated) = await seeder.SeedAsync(
                    _options.ClaraSessionCount, _options.ClearExisting, patientSeedResults, ct);
                return (sessionsCreated + suggestionsCreated, 0);
            }, stoppingToken),
        };

        var phase3Results = await Task.WhenAll(phase3Tasks);
        results.AddRange(phase3Results);

        totalStopwatch.Stop();

        // ── Summary Report ──
        _logger.LogInformation("\n=== MediTrack Simulator Complete ===");
        _logger.LogInformation("Total time: {Duration:F1}s\n", totalStopwatch.Elapsed.TotalSeconds);

        foreach (var result in results)
        {
            var statusIcon = result.IsSuccess ? "OK" : "FAIL";
            _logger.LogInformation(
                "  [{Status}] {Name}: {Created} created, {Failed} failed ({Duration:F1}s)",
                statusIcon, result.Name, result.Created, result.Failed, result.Duration.TotalSeconds);
        }

        var totalCreated = results.Sum(result => result.Created);
        var totalFailed = results.Sum(result => result.Failed);
        _logger.LogInformation(
            "\n  Total: {Created} records created, {Failed} failed",
            totalCreated, totalFailed);

        _logger.LogInformation("Simulator finished. Shutting down...");
        _applicationLifetime.StopApplication();
    }

    private async Task<SeederResult> RunSeederAsync(
        string name,
        Func<IServiceScope, CancellationToken, Task<(int Created, int Failed)>> seederAction,
        CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var (created, failed) = await seederAction(scope, cancellationToken);
            stopwatch.Stop();

            return new SeederResult(name, created, failed, stopwatch.Elapsed, IsSuccess: true);
        }
        catch (Exception exception)
        {
            stopwatch.Stop();
            _logger.LogError(exception, "Seeder {Name} failed", name);
            return new SeederResult(name, 0, 0, stopwatch.Elapsed, IsSuccess: false);
        }
    }

    private sealed record SeederResult(
        string Name,
        int Created,
        int Failed,
        TimeSpan Duration,
        bool IsSuccess);
}
