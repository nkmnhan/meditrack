using Clara.API.Data;
using Clara.API.Domain;
using Microsoft.EntityFrameworkCore;

namespace MediTrack.Simulator.Seeders;

/// <summary>
/// Seeds realistic Clara AI session data.
/// Moved from Clara.API/Services/SessionSeeder.cs — minimal changes.
/// </summary>
public sealed class SessionSeeder
{
    private readonly ClaraDbContext _dbContext;
    private readonly ILogger<SessionSeeder> _logger;

    private static readonly (string DoctorId, string DoctorName)[] Doctors =
    [
        ("94f22653-ddce-43d3-951b-4d903c31de5d", "Dr. Jane Smith"),
        ("aaaaaaaa-0001-0001-0001-000000000001", "Dr. Robert Chen"),
        ("aaaaaaaa-0001-0001-0001-000000000002", "Dr. Emily Watson"),
        ("aaaaaaaa-0001-0001-0001-000000000003", "Dr. Michael Park"),
    ];

    private static readonly string[] PatientIds =
    [
        "3c809908-310c-4263-8d61-ddcf468a7a1d",
        "60a56c53-43c2-4e14-a4bb-22559d7cd4bf",
        "2675dc04-d48a-48ad-ae73-661f77fb01ef",
        "f9657deb-9bdb-40da-a73c-f2cb5179df65",
        "070437e4-f89d-467e-b496-24708d60ee37",
        "ee52f53e-996e-4574-9595-72de0a19a885",
        "dda0438a-4093-4535-be2e-745428da9183",
        "f0512219-c483-479c-877a-645596e56009",
        "0d87cbdf-ab0f-421e-9b9f-96032fa1bf69",
        "15b371c7-330c-45fe-a4e2-f5ca1c3def1d",
    ];

    private static readonly string[] SessionTypes = ["Consultation", "Follow-up", "Review"];

    private static readonly string[] SuggestionTypes = ["clinical", "medication", "follow_up", "differential"];

    private static readonly Dictionary<string, string[]> SuggestionContentByType = new()
    {
        ["clinical"] =
        [
            "Consider differential diagnosis: Type 2 Diabetes",
            "Consider differential diagnosis: Hypertension Stage 2",
            "Consider differential diagnosis: Iron deficiency anemia",
            "Consider differential diagnosis: Acute bronchitis",
            "Consider differential diagnosis: Generalized anxiety disorder",
        ],
        ["medication"] =
        [
            "Medication suggestion: Metformin 500mg BID",
            "Medication suggestion: Lisinopril 10mg QD",
            "Medication suggestion: Sertraline 50mg QD",
            "Medication suggestion: Amoxicillin 500mg TID x10d",
            "Medication suggestion: Omeprazole 20mg QD",
        ],
        ["follow_up"] =
        [
            "Follow-up recommended: 2-week follow-up for medication titration",
            "Follow-up recommended: 1-month follow-up for lab results review",
            "Follow-up recommended: 3-month routine check",
            "Follow-up recommended: 6-month wellness visit",
            "Follow-up recommended: PRN if symptoms worsen",
        ],
        ["differential"] =
        [
            "Suggested lab order: CBC with differential",
            "Suggested lab order: Comprehensive metabolic panel",
            "Suggested lab order: HbA1c",
            "Suggested lab order: Thyroid panel (TSH, Free T4)",
            "Suggested lab order: Lipid panel",
        ],
    };

    public SessionSeeder(ClaraDbContext dbContext, ILogger<SessionSeeder> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<(int SessionsCreated, int SuggestionsCreated)> SeedAsync(
        int targetSessions,
        bool clearExisting,
        CancellationToken cancellationToken)
    {
        if (clearExisting)
        {
            _logger.LogInformation("Clearing existing Clara session data...");
            await _dbContext.Suggestions.ExecuteDeleteAsync(cancellationToken);
            await _dbContext.TranscriptLines.ExecuteDeleteAsync(cancellationToken);
            await _dbContext.Sessions.ExecuteDeleteAsync(cancellationToken);
        }

        var random = new Random(42);
        var now = DateTimeOffset.UtcNow;
        var sessions = new List<Session>();
        var suggestions = new List<Suggestion>();
        var sessionCount = 0;

        while (sessionCount < targetSessions)
        {
            var daysAgo = (int)(random.NextDouble() * random.NextDouble() * 180);
            var businessHour = 7 + random.Next(0, 10);
            var minutesOffset = random.Next(0, 60);
            var timestamp = now
                .AddDays(-daysAgo)
                .Date
                .AddHours(businessHour)
                .AddMinutes(minutesOffset);

            var timestampOffset = new DateTimeOffset(timestamp, TimeSpan.Zero);

            if (timestampOffset.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
                continue;

            var durationMinutes = 5 + random.Next(0, 40);
            var endTimestamp = timestampOffset.AddMinutes(durationMinutes);

            var doctor = Doctors[random.Next(Doctors.Length)];
            var patientId = PatientIds[random.Next(PatientIds.Length)];
            var sessionType = SessionTypes[random.Next(SessionTypes.Length)];

            var statusRoll = random.NextDouble();
            var status = statusRoll < 0.90 ? "Completed"
                : statusRoll < 0.95 ? "Active"
                : "Cancelled";

            var sessionId = Guid.NewGuid();
            sessions.Add(new Session
            {
                Id = sessionId,
                DoctorId = doctor.DoctorId,
                PatientId = patientId,
                StartedAt = timestampOffset,
                EndedAt = status != "Active" ? endTimestamp : null,
                Status = status,
                AudioRecorded = random.NextDouble() < 0.85,
                SessionType = sessionType,
            });

            var suggestionCount = 1 + random.Next(0, 5);
            for (var suggestionIndex = 0; suggestionIndex < suggestionCount; suggestionIndex++)
            {
                var suggestionType = SuggestionTypes[random.Next(SuggestionTypes.Length)];
                var contentOptions = SuggestionContentByType[suggestionType];
                var content = contentOptions[random.Next(contentOptions.Length)];

                var urgencyRoll = random.NextDouble();
                var urgency = urgencyRoll < 0.1 ? "high"
                    : urgencyRoll < 0.4 ? "medium"
                    : "low";

                suggestions.Add(new Suggestion
                {
                    Id = Guid.NewGuid(),
                    SessionId = sessionId,
                    Content = content,
                    TriggeredAt = timestampOffset.AddMinutes(random.Next(0, durationMinutes)),
                    Type = suggestionType,
                    Source = random.NextDouble() < 0.7 ? "batch" : "on_demand",
                    Urgency = urgency,
                    Confidence = (float)(0.5 + random.NextDouble() * 0.5),
                });
            }

            sessionCount++;
        }

        // Batch insert for performance
        const int batchSize = 500;
        for (var batchStart = 0; batchStart < sessions.Count; batchStart += batchSize)
        {
            var batch = sessions.Skip(batchStart).Take(batchSize);
            _dbContext.Sessions.AddRange(batch);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        for (var batchStart = 0; batchStart < suggestions.Count; batchStart += batchSize)
        {
            var batch = suggestions.Skip(batchStart).Take(batchSize);
            _dbContext.Suggestions.AddRange(batch);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Seeded {SessionCount} sessions with {SuggestionCount} suggestions",
            sessions.Count, suggestions.Count);

        return (sessions.Count, suggestions.Count);
    }
}
