using Microsoft.EntityFrameworkCore;
using Notification.Worker.Data;
using Notification.Worker.Models;

namespace MediTrack.Simulator.Seeders;

/// <summary>
/// Seeds realistic PHI audit log data.
/// Moved from Notification.Worker/Services/AuditSeeder.cs — minimal changes.
/// </summary>
public sealed class AuditSeeder
{
    private readonly AuditDbContext _dbContext;
    private readonly ILogger<AuditSeeder> _logger;

    private static readonly (string UserId, string Username, string UserRole)[] Users =
    [
        ("94f22653-ddce-43d3-951b-4d903c31de5d", "Dr. Jane Smith", "Doctor"),
        ("84fa971d-8e6d-4138-afcb-b572364d2d61", "System Administrator", "Admin"),
        ("aaaaaaaa-0001-0001-0001-000000000001", "Dr. Robert Chen", "Doctor"),
        ("aaaaaaaa-0001-0001-0001-000000000002", "Dr. Emily Watson", "Doctor"),
        ("aaaaaaaa-0001-0001-0001-000000000003", "Dr. Michael Park", "Doctor"),
        ("aaaaaaaa-0001-0001-0001-000000000004", "Sarah Johnson", "Receptionist"),
        ("aaaaaaaa-0001-0001-0001-000000000005", "Maria Garcia", "Nurse"),
    ];

    private static readonly Guid[] PatientIds =
    [
        Guid.Parse("3c809908-310c-4263-8d61-ddcf468a7a1d"),
        Guid.Parse("60a56c53-43c2-4e14-a4bb-22559d7cd4bf"),
        Guid.Parse("2675dc04-d48a-48ad-ae73-661f77fb01ef"),
        Guid.Parse("f9657deb-9bdb-40da-a73c-f2cb5179df65"),
        Guid.Parse("070437e4-f89d-467e-b496-24708d60ee37"),
        Guid.Parse("ee52f53e-996e-4574-9595-72de0a19a885"),
        Guid.Parse("dda0438a-4093-4535-be2e-745428da9183"),
        Guid.Parse("f0512219-c483-479c-877a-645596e56009"),
        Guid.Parse("0d87cbdf-ab0f-421e-9b9f-96032fa1bf69"),
        Guid.Parse("15b371c7-330c-45fe-a4e2-f5ca1c3def1d"),
        Guid.Parse("d4feb582-c542-43ed-9efa-8e560437a5b8"),
        Guid.Parse("f75be25d-8476-4395-a7ec-7a7561546d5a"),
        Guid.Parse("bd4aebac-b790-42ec-9d7b-7c953a573486"),
        Guid.Parse("fd8e1cfb-e727-499b-9e62-d62ea42badd9"),
        Guid.Parse("9a804e22-18b9-405c-a92d-85dcf9b4f2b0"),
        Guid.Parse("faa9be2f-4496-4fb7-a5f4-2115726c9a19"),
        Guid.Parse("9684534d-53a6-4d03-bc69-eb8ad7294350"),
        Guid.Parse("88e70197-1084-42d8-91eb-dba5053437fc"),
        Guid.Parse("d8195e66-bc47-4a6c-8165-4d2faa2fea0f"),
        Guid.Parse("28dccf8c-0da6-48ee-902c-48782126e8d5"),
    ];

    private static readonly (string Action, string EventType, int Weight)[] Actions =
    [
        ("Read", "PatientPHIAccessed", 50),
        ("Read", "MedicalRecordPHIAccessed", 25),
        ("Create", "PHIModified", 8),
        ("Update", "PHIModified", 10),
        ("Search", "PatientPHIAccessed", 5),
        ("Export", "PHIExported", 1),
        ("Delete", "PHIDeleted", 1),
    ];

    private static readonly string[] ResourceTypes =
        ["Patient", "MedicalRecord", "Appointment", "Prescription", "LabResult", "VitalSigns"];

    public AuditSeeder(AuditDbContext dbContext, ILogger<AuditSeeder> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<(int Created, int Failed)> SeedAsync(
        int targetCount,
        bool clearExisting,
        CancellationToken cancellationToken)
    {
        if (clearExisting)
        {
            _logger.LogInformation("Clearing existing audit data...");
            await _dbContext.AuditLogs.ExecuteDeleteAsync(cancellationToken);
            await _dbContext.ArchivedAuditLogs.ExecuteDeleteAsync(cancellationToken);
            await _dbContext.BreachIncidents.ExecuteDeleteAsync(cancellationToken);
        }

        var random = new Random(42);
        var now = DateTimeOffset.UtcNow;
        var cutoffDate = now.AddMonths(-12);

        var hotLogs = new List<PHIAuditLog>();
        var archivedLogs = new List<ArchivedPHIAuditLog>();
        var createdCount = 0;

        var weightedActions = BuildWeightedActionIndex();

        for (var recordIndex = 0; recordIndex < targetCount; recordIndex++)
        {
            var daysAgo = (int)(random.NextDouble() * random.NextDouble() * 548);
            var hoursOffset = random.Next(0, 14);
            var minutesOffset = random.Next(0, 60);
            var timestamp = now
                .AddDays(-daysAgo)
                .AddHours(-hoursOffset)
                .AddMinutes(-minutesOffset);

            var user = Users[random.Next(Users.Length)];
            var patientId = PatientIds[random.Next(PatientIds.Length)];
            var action = weightedActions[random.Next(weightedActions.Length)];
            var resourceType = ResourceTypes[random.Next(ResourceTypes.Length)];

            var severityRoll = random.NextDouble();
            var severity = severityRoll < 0.85 ? "Info"
                : severityRoll < 0.95 ? "Warning"
                : severityRoll < 0.99 ? "Error"
                : "Critical";

            var isSuccess = random.NextDouble() < 0.97;
            var ipAddress = $"{120 + random.Next(30)}.{random.Next(256)}.{random.Next(256)}.{random.Next(256)}";

            if (timestamp >= cutoffDate)
            {
                hotLogs.Add(new PHIAuditLog
                {
                    Id = Guid.NewGuid(),
                    EventId = Guid.NewGuid(),
                    Timestamp = timestamp,
                    UserId = user.UserId,
                    Username = user.Username,
                    UserRole = user.UserRole,
                    Action = action.Action,
                    ResourceType = resourceType,
                    ResourceId = Guid.NewGuid().ToString()[..8],
                    PatientId = patientId,
                    IpAddress = ipAddress,
                    UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/133.0",
                    Success = isSuccess,
                    ErrorMessage = isSuccess ? null : "Access denied: insufficient permissions",
                    EventType = action.EventType,
                    Severity = severity,
                    AlertTriggered = severity is "Error" or "Critical",
                    Reviewed = false,
                });
            }
            else
            {
                archivedLogs.Add(new ArchivedPHIAuditLog
                {
                    Id = Guid.NewGuid(),
                    EventId = Guid.NewGuid(),
                    Timestamp = timestamp,
                    UserId = user.UserId,
                    Username = user.Username,
                    UserRole = user.UserRole,
                    Action = action.Action,
                    ResourceType = resourceType,
                    ResourceId = Guid.NewGuid().ToString()[..8],
                    PatientId = patientId,
                    IpAddress = ipAddress,
                    UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0",
                    Success = isSuccess,
                    ErrorMessage = isSuccess ? null : "Access denied: insufficient permissions",
                    EventType = action.EventType,
                    Severity = severity,
                    AlertTriggered = severity is "Error" or "Critical",
                    Reviewed = true,
                    ReviewedBy = "84fa971d-8e6d-4138-afcb-b572364d2d61",
                    ReviewedAt = timestamp.AddDays(30),
                    ReviewNotes = "Reviewed during compliance audit",
                    ArchivedAt = timestamp.AddDays(60),
                });
            }

            createdCount++;
        }

        // Batch insert for performance
        const int batchSize = 2000;
        for (var batchStart = 0; batchStart < hotLogs.Count; batchStart += batchSize)
        {
            var batch = hotLogs.Skip(batchStart).Take(batchSize);
            _dbContext.AuditLogs.AddRange(batch);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        for (var batchStart = 0; batchStart < archivedLogs.Count; batchStart += batchSize)
        {
            var batch = archivedLogs.Skip(batchStart).Take(batchSize);
            _dbContext.ArchivedAuditLogs.AddRange(batch);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Seeded {HotCount} hot audit logs + {ArchivedCount} archived audit logs",
            hotLogs.Count, archivedLogs.Count);

        // Seed breach incidents
        await SeedBreachIncidentsAsync(cancellationToken);

        return (createdCount + 3, 0); // +3 for breach incidents
    }

    private async Task SeedBreachIncidentsAsync(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var incidents = new List<PHIBreachIncident>
        {
            new()
            {
                Id = Guid.NewGuid(),
                EventId = Guid.NewGuid(),
                DetectedAt = now.AddDays(-45),
                UserId = "aaaaaaaa-0001-0001-0001-000000000001",
                Username = "Dr. Robert Chen",
                PatientId = Guid.Parse("3c809908-310c-4263-8d61-ddcf468a7a1d"),
                Severity = "Medium",
                Description = "Unusual after-hours access pattern detected for patient records",
                PatientsAffected = 1,
                RequiresBreachNotification = false,
                Status = "Resolved",
                AssignedTo = "84fa971d-8e6d-4138-afcb-b572364d2d61",
                InvestigationNotes = "Doctor was on-call and needed to review patient history for ER consult.",
                Resolution = "Confirmed legitimate access during on-call shift.",
                ResolvedAt = now.AddDays(-43),
            },
            new()
            {
                Id = Guid.NewGuid(),
                EventId = Guid.NewGuid(),
                DetectedAt = now.AddDays(-90),
                UserId = "aaaaaaaa-0001-0001-0001-000000000004",
                Username = "Sarah Johnson",
                PatientId = Guid.Parse("60a56c53-43c2-4e14-a4bb-22559d7cd4bf"),
                Severity = "High",
                Description = "Receptionist accessed medical records outside standard workflow",
                PatientsAffected = 3,
                RequiresBreachNotification = false,
                Status = "Resolved",
                AssignedTo = "84fa971d-8e6d-4138-afcb-b572364d2d61",
                InvestigationNotes = "Staff accessed records through direct URL instead of standard search flow. Training deficiency identified.",
                Resolution = "Additional HIPAA training completed. Access workflow updated.",
                ResolvedAt = now.AddDays(-85),
            },
            new()
            {
                Id = Guid.NewGuid(),
                EventId = Guid.NewGuid(),
                DetectedAt = now.AddDays(-5),
                UserId = "aaaaaaaa-0001-0001-0001-000000000002",
                Username = "Dr. Emily Watson",
                PatientId = Guid.Parse("f9657deb-9bdb-40da-a73c-f2cb5179df65"),
                Severity = "Low",
                Description = "Bulk export of patient lab results detected",
                PatientsAffected = 1,
                RequiresBreachNotification = false,
                Status = "UnderInvestigation",
                AssignedTo = "84fa971d-8e6d-4138-afcb-b572364d2d61",
                InvestigationNotes = "Investigating whether the export was for a legitimate research purpose.",
            },
        };

        _dbContext.BreachIncidents.AddRange(incidents);
        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Seeded {Count} breach incidents", incidents.Count);
    }

    private static (string Action, string EventType)[] BuildWeightedActionIndex()
    {
        var weightedList = new List<(string Action, string EventType)>();
        foreach (var (action, eventType, weight) in Actions)
        {
            for (var weightIndex = 0; weightIndex < weight; weightIndex++)
            {
                weightedList.Add((action, eventType));
            }
        }
        return weightedList.ToArray();
    }
}
