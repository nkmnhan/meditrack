using Bogus;
using MediTrack.MedicalRecords.Domain.Aggregates;
using MediTrack.MedicalRecords.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace MediTrack.MedicalRecords.API.Application.Services;

/// <summary>
/// Generates realistic test data for medical records using Bogus library.
/// For development and testing purposes only.
/// </summary>
public sealed class MedicalRecordSeeder
{
    private readonly MedicalRecordsDbContext _dbContext;
    private readonly ILogger<MedicalRecordSeeder> _logger;

    public MedicalRecordSeeder(
        MedicalRecordsDbContext dbContext,
        ILogger<MedicalRecordSeeder> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Seeds the database with realistic medical record data.
    /// </summary>
    /// <param name="patientIds">Patient IDs to create records for</param>
    /// <param name="recordsPerPatient">Records per patient (default: 3, max: 20)</param>
    /// <param name="clearExisting">If true, deletes all existing records before seeding</param>
    public async Task<(int CreatedCount, int FailedCount)> SeedMedicalRecordsAsync(
        IReadOnlyList<Guid> patientIds,
        int recordsPerPatient = 3,
        bool clearExisting = false,
        CancellationToken cancellationToken = default)
    {
        recordsPerPatient = Math.Clamp(recordsPerPatient, 1, 20);

        if (clearExisting)
        {
            _logger.LogWarning("Clearing all existing medical records...");
            var deletedCount = await _dbContext.MedicalRecords.ExecuteDeleteAsync(cancellationToken);
            _logger.LogInformation("Cleared {Count} medical records", deletedCount);
        }

        var totalRecords = patientIds.Count * recordsPerPatient;
        _logger.LogInformation(
            "Generating {Total} medical records ({PerPatient} per patient, {PatientCount} patients)...",
            totalRecords, recordsPerPatient, patientIds.Count);

        var faker = new Faker { Random = new Randomizer(42) };
        var createdCount = 0;
        var failedCount = 0;

        foreach (var patientId in patientIds)
        {
            for (var recordIndex = 0; recordIndex < recordsPerPatient; recordIndex++)
            {
                try
                {
                    var record = CreateRealisticRecord(faker, patientId);
                    _dbContext.MedicalRecords.Add(record);
                    createdCount++;
                }
                catch (Exception exception)
                {
                    failedCount++;
                    _logger.LogWarning(exception, "Failed to create record for patient {PatientId}", patientId);
                }
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Medical record seeding complete: {CreatedCount} created, {FailedCount} failed",
            createdCount, failedCount);

        return (createdCount, failedCount);
    }

    private static MedicalRecord CreateRealisticRecord(Faker faker, Guid patientId)
    {
        var diagnosis = faker.PickRandom(CommonDiagnoses);
        var severity = faker.PickRandom<DiagnosisSeverity>();
        var doctorId = faker.PickRandom(SeedDoctorIds);
        var doctorName = faker.PickRandom(SeedDoctorNames);

        var record = MedicalRecord.Create(
            patientId,
            chiefComplaint: faker.PickRandom(CommonComplaints),
            diagnosisCode: diagnosis.Code,
            diagnosisDescription: diagnosis.Description,
            severity: severity,
            recordedByDoctorId: doctorId,
            recordedByDoctorName: doctorName);

        // Randomly assign a non-Active status to some records
        var statusRoll = faker.Random.Float();
        if (statusRoll < 0.15f) record.MarkRequiresFollowUp();
        else if (statusRoll < 0.35f) record.Resolve();

        // Add 1-3 clinical notes
        var noteCount = faker.Random.Int(1, 3);
        for (var noteIndex = 0; noteIndex < noteCount; noteIndex++)
        {
            var noteType = faker.PickRandom(ClinicalNoteTypes.AllValid.ToArray());
            record.AddClinicalNote(
                noteType,
                content: GenerateNoteContent(faker, noteType),
                authorId: doctorId,
                authorName: doctorName);
        }

        // Add 0-2 prescriptions (70% chance of at least one)
        if (faker.Random.Bool(0.7f))
        {
            var prescriptionCount = faker.Random.Int(1, 2);
            for (var prescriptionIndex = 0; prescriptionIndex < prescriptionCount; prescriptionIndex++)
            {
                var medication = faker.PickRandom(CommonMedications);
                record.AddPrescription(
                    medicationName: medication.Name,
                    dosage: medication.Dosage,
                    frequency: medication.Frequency,
                    durationDays: faker.PickRandom(7, 14, 30, 60, 90),
                    instructions: faker.Random.Bool(0.6f) ? medication.Instructions : null,
                    prescribedById: doctorId,
                    prescribedByName: doctorName);
            }
        }

        // Add vital signs (80% chance)
        if (faker.Random.Bool(0.8f))
        {
            record.RecordVitalSigns(
                bloodPressureSystolic: faker.Random.Decimal(90, 160),
                bloodPressureDiastolic: faker.Random.Decimal(60, 100),
                heartRate: faker.Random.Decimal(55, 110),
                temperature: faker.Random.Decimal(97.0m, 101.5m),
                respiratoryRate: faker.Random.Decimal(12, 22),
                oxygenSaturation: faker.Random.Decimal(94, 100),
                weight: faker.Random.Decimal(100, 280),
                height: faker.Random.Decimal(58, 76),
                recordedById: doctorId,
                recordedByName: doctorName);
        }

        return record;
    }

    private static string GenerateNoteContent(Faker faker, string noteType)
    {
        return noteType switch
        {
            ClinicalNoteTypes.SoapNote =>
                $"S: Patient reports {faker.PickRandom("improvement", "no change", "worsening")} of symptoms. " +
                $"{faker.PickRandom("Pain level 3/10", "Sleeping better", "Appetite improved", "Fatigue persists")}.\n" +
                $"O: Vitals stable. {faker.PickRandom("Alert and oriented", "No acute distress", "Well-nourished")}.\n" +
                $"A: {faker.PickRandom("Condition improving", "Stable condition", "Requires monitoring")}.\n" +
                $"P: {faker.PickRandom("Continue current medications", "Follow up in 2 weeks", "Order lab work", "Refer to specialist")}.",

            ClinicalNoteTypes.ProgressNote =>
                $"Patient seen for follow-up. {faker.PickRandom("Reports feeling better", "Symptoms persisting", "New symptoms reported")}. " +
                $"{faker.PickRandom("Medication adjusted", "Treatment plan continues", "Additional tests ordered")}. " +
                $"Next follow-up in {faker.PickRandom("1 week", "2 weeks", "1 month")}.",

            ClinicalNoteTypes.Assessment =>
                $"Assessment: {faker.PickRandom("Condition is well-controlled", "Moderate improvement noted", "Requires further evaluation")}. " +
                $"Risk factors: {faker.PickRandom("Low", "Moderate", "Elevated")}. " +
                $"Prognosis: {faker.PickRandom("Good", "Fair", "Guarded")}.",

            _ =>
                $"{faker.Lorem.Paragraph(3)}"
        };
    }

    // --- Seed Data Constants ---

    private static readonly Guid[] SeedDoctorIds =
    [
        Guid.Parse("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
        Guid.Parse("b2c3d4e5-f6a7-8901-bcde-f12345678901"),
        Guid.Parse("c3d4e5f6-a7b8-9012-cdef-123456789012"),
    ];

    private static readonly string[] SeedDoctorNames =
    [
        "Dr. Sarah Chen",
        "Dr. Michael Rodriguez",
        "Dr. Emily Williams",
    ];

    private static readonly string[] CommonComplaints =
    [
        "Persistent headache for 3 days",
        "Chest pain with exertion",
        "Chronic lower back pain",
        "Shortness of breath at rest",
        "Recurrent abdominal pain",
        "Fatigue and weight loss",
        "Joint pain and swelling",
        "Persistent cough for 2 weeks",
        "Dizziness and lightheadedness",
        "Skin rash on arms and torso",
        "Difficulty sleeping",
        "Numbness in hands and feet",
        "Frequent urination",
        "Anxiety and heart palpitations",
        "Sore throat and fever",
    ];

    private static readonly (string Code, string Description)[] CommonDiagnoses =
    [
        ("J06.9", "Acute upper respiratory infection"),
        ("M54.5", "Low back pain"),
        ("I10", "Essential hypertension"),
        ("E11.9", "Type 2 diabetes mellitus without complications"),
        ("J45.20", "Mild intermittent asthma"),
        ("K21.0", "Gastro-esophageal reflux disease with esophagitis"),
        ("M79.3", "Panniculitis, unspecified"),
        ("G43.909", "Migraine, unspecified"),
        ("F41.1", "Generalized anxiety disorder"),
        ("J02.9", "Acute pharyngitis"),
        ("L30.9", "Dermatitis, unspecified"),
        ("R51.9", "Headache, unspecified"),
        ("N39.0", "Urinary tract infection"),
        ("R10.9", "Unspecified abdominal pain"),
        ("M25.50", "Pain in unspecified joint"),
    ];

    private static readonly (string Name, string Dosage, string Frequency, string? Instructions)[] CommonMedications =
    [
        ("Amoxicillin", "500mg", "3 times daily", "Take with food. Complete entire course."),
        ("Lisinopril", "10mg", "Once daily", "Take in the morning. Monitor blood pressure."),
        ("Metformin", "500mg", "Twice daily", "Take with meals to reduce GI side effects."),
        ("Omeprazole", "20mg", "Once daily", "Take 30 minutes before breakfast."),
        ("Ibuprofen", "400mg", "Every 6 hours as needed", "Do not exceed 1200mg/day. Take with food."),
        ("Amlodipine", "5mg", "Once daily", null),
        ("Albuterol Inhaler", "2 puffs", "Every 4-6 hours as needed", "Shake well before use."),
        ("Sertraline", "50mg", "Once daily", "May cause drowsiness. Avoid alcohol."),
        ("Acetaminophen", "500mg", "Every 6 hours as needed", "Do not exceed 3000mg/day."),
        ("Azithromycin", "250mg", "Once daily for 5 days", "Take on empty stomach 1 hour before meals."),
    ];
}
