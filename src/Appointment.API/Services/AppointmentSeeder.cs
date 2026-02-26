using Bogus;
using Appointment.API.Infrastructure;
using Appointment.API.Models;
using Microsoft.EntityFrameworkCore;
using AppointmentEntity = Appointment.API.Models.Appointment;

namespace Appointment.API.Services;

/// <summary>
/// Generates realistic test data for Appointment entities using Bogus library.
/// For development and testing purposes only.
/// </summary>
public sealed class AppointmentSeeder
{
    private readonly AppointmentDbContext _dbContext;
    private readonly ILogger<AppointmentSeeder> _logger;

    public AppointmentSeeder(
        AppointmentDbContext dbContext,
        ILogger<AppointmentSeeder> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Seeds the database with realistic appointment data.
    /// </summary>
    /// <param name="patients">Patient info (id, name, email) from Patient.API</param>
    /// <param name="appointmentsPerPatient">Number of appointments per patient (default: 3, max: 10)</param>
    /// <param name="clearExisting">If true, deletes all existing appointments before seeding</param>
    public async Task<(int CreatedCount, int FailedCount)> SeedAppointmentsAsync(
        IReadOnlyList<PatientSummary> patients,
        int appointmentsPerPatient = 3,
        bool clearExisting = false,
        CancellationToken cancellationToken = default)
    {
        appointmentsPerPatient = Math.Clamp(appointmentsPerPatient, 1, 10);

        if (clearExisting)
        {
            _logger.LogWarning("Clearing all existing appointments...");
            var deletedCount = await _dbContext.Appointments.ExecuteDeleteAsync(cancellationToken);
            _logger.LogInformation("Cleared {Count} appointments", deletedCount);
        }

        var totalAppointments = patients.Count * appointmentsPerPatient;
        _logger.LogInformation(
            "Generating {Total} appointments ({PerPatient} per patient, {PatientCount} patients)...",
            totalAppointments, appointmentsPerPatient, patients.Count);

        var faker = new Faker { Random = new Randomizer(42) };
        var createdCount = 0;
        var failedCount = 0;

        foreach (var patient in patients)
        {
            for (var appointmentIndex = 0; appointmentIndex < appointmentsPerPatient; appointmentIndex++)
            {
                try
                {
                    var appointment = CreateRealisticAppointment(faker, patient);
                    _dbContext.Appointments.Add(appointment);
                    createdCount++;
                }
                catch (Exception exception)
                {
                    failedCount++;
                    _logger.LogWarning(
                        exception,
                        "Failed to create appointment for patient {PatientId}",
                        patient.Id);
                }
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Appointment seeding complete: {CreatedCount} created, {FailedCount} failed",
            createdCount, failedCount);

        return (createdCount, failedCount);
    }

    private static AppointmentEntity CreateRealisticAppointment(Faker faker, PatientSummary patient)
    {
        var doctorIndex = faker.Random.Int(0, SeedDoctorIds.Length - 1);
        var doctorId = SeedDoctorIds[doctorIndex];
        var doctorName = SeedDoctorNames[doctorIndex];

        var appointmentType = faker.PickRandom<AppointmentType>();
        var durationMinutes = GetDurationForType(appointmentType, faker);
        var reason = GetReasonForType(appointmentType, faker);
        var location = GetLocationForType(appointmentType, faker);

        // Spread appointments across past 6 months to future 3 months
        var daysOffset = faker.Random.Int(-180, 90);
        var hour = faker.Random.Int(8, 16);
        var minute = faker.PickRandom(0, 15, 30, 45);
        var scheduledDateTime = DateTime.UtcNow.Date
            .AddDays(daysOffset)
            .AddHours(hour)
            .AddMinutes(minute);

        var patientNotes = faker.Random.Bool(0.4f)
            ? faker.PickRandom(PatientNoteExamples)
            : null;

        var appointment = new AppointmentEntity(
            patientId: patient.Id,
            patientName: $"{patient.FirstName} {patient.LastName}",
            patientEmail: patient.Email,
            providerId: doctorId,
            providerName: doctorName,
            scheduledDateTime: scheduledDateTime,
            durationMinutes: durationMinutes,
            type: appointmentType,
            reason: reason,
            patientNotes: patientNotes,
            location: location);

        // Apply realistic status transitions based on whether the appointment is past or future
        ApplyRealisticStatus(appointment, scheduledDateTime, faker);

        return appointment;
    }

    private static void ApplyRealisticStatus(
        AppointmentEntity appointment,
        DateTime scheduledDateTime,
        Faker faker)
    {
        var isPast = scheduledDateTime < DateTime.UtcNow;

        if (!isPast)
        {
            // Future appointments: mostly Scheduled, some Confirmed
            if (faker.Random.Bool(0.4f))
            {
                appointment.Confirm();
            }
            // Small chance of cancellation for future appointments
            if (faker.Random.Bool(0.08f))
            {
                appointment.Cancel(faker.PickRandom(CancellationReasons));
            }
            return;
        }

        // Past appointments: simulate the full lifecycle
        var outcomeRoll = faker.Random.Float();

        if (outcomeRoll < 0.65f)
        {
            // 65% — Completed (normal flow: Scheduled → Confirmed → CheckedIn → InProgress → Completed)
            appointment.Confirm();
            appointment.CheckIn();
            appointment.Start();
            appointment.Complete(faker.Random.Bool(0.5f)
                ? faker.PickRandom(CompletionNotes)
                : null);
        }
        else if (outcomeRoll < 0.80f)
        {
            // 15% — Cancelled
            if (faker.Random.Bool(0.5f))
            {
                appointment.Confirm();
            }
            appointment.Cancel(faker.PickRandom(CancellationReasons));
        }
        else if (outcomeRoll < 0.90f)
        {
            // 10% — No-show
            if (faker.Random.Bool(0.5f))
            {
                appointment.Confirm();
            }
            appointment.MarkNoShow();
        }
        else
        {
            // 10% — Still in Confirmed/Scheduled (recently past, not yet processed)
            if (faker.Random.Bool(0.6f))
            {
                appointment.Confirm();
            }
        }
    }

    private static int GetDurationForType(AppointmentType type, Faker faker)
    {
        return type switch
        {
            AppointmentType.Consultation => faker.PickRandom(30, 45, 60),
            AppointmentType.FollowUp => faker.PickRandom(15, 20, 30),
            AppointmentType.AnnualPhysical => faker.PickRandom(45, 60),
            AppointmentType.UrgentCare => faker.PickRandom(30, 45),
            AppointmentType.Specialist => faker.PickRandom(30, 45, 60),
            AppointmentType.LabWork => faker.PickRandom(15, 30),
            AppointmentType.Imaging => faker.PickRandom(30, 45, 60),
            AppointmentType.Vaccination => faker.PickRandom(15, 20),
            AppointmentType.Telehealth => faker.PickRandom(20, 30, 45),
            AppointmentType.Procedure => faker.PickRandom(60, 90, 120),
            _ => 30
        };
    }

    private static string GetReasonForType(AppointmentType type, Faker faker)
    {
        return type switch
        {
            AppointmentType.Consultation => faker.PickRandom(
                "General health consultation",
                "New patient evaluation",
                "Second opinion on diagnosis",
                "Pre-surgical consultation",
                "Health concern discussion"),
            AppointmentType.FollowUp => faker.PickRandom(
                "Follow-up on blood work results",
                "Medication adjustment review",
                "Post-treatment check",
                "Chronic condition monitoring",
                "Recovery progress assessment"),
            AppointmentType.AnnualPhysical => faker.PickRandom(
                "Annual physical examination",
                "Yearly wellness check",
                "Preventive health screening"),
            AppointmentType.UrgentCare => faker.PickRandom(
                "Persistent fever and body aches",
                "Severe headache for 2 days",
                "Acute abdominal pain",
                "Breathing difficulty",
                "Chest tightness with exertion"),
            AppointmentType.Specialist => faker.PickRandom(
                "Cardiology referral - heart palpitations",
                "Dermatology referral - persistent rash",
                "Orthopedic evaluation - knee pain",
                "Endocrinology referral - thyroid concerns",
                "Neurology referral - recurring migraines"),
            AppointmentType.LabWork => faker.PickRandom(
                "Routine blood panel",
                "Comprehensive metabolic panel",
                "HbA1c monitoring",
                "Lipid panel and thyroid function",
                "Pre-operative lab work"),
            AppointmentType.Imaging => faker.PickRandom(
                "Chest X-ray - persistent cough",
                "MRI - lower back pain",
                "Ultrasound - abdominal assessment",
                "CT scan - head trauma follow-up",
                "Mammography - annual screening"),
            AppointmentType.Vaccination => faker.PickRandom(
                "Annual flu vaccination",
                "COVID-19 booster",
                "Tetanus booster (Tdap)",
                "Hepatitis B series",
                "Shingles vaccination"),
            AppointmentType.Telehealth => faker.PickRandom(
                "Remote medication review",
                "Virtual follow-up consultation",
                "Telehealth mental health check-in",
                "Remote chronic disease management",
                "Virtual skin condition assessment"),
            AppointmentType.Procedure => faker.PickRandom(
                "Skin biopsy",
                "Joint injection - corticosteroid",
                "Minor laceration repair",
                "Mole removal",
                "Endoscopy"),
            _ => "General appointment"
        };
    }

    private static string? GetLocationForType(AppointmentType type, Faker faker)
    {
        if (type == AppointmentType.Telehealth)
        {
            return null; // Telehealth uses link, not physical location
        }

        return type switch
        {
            AppointmentType.LabWork => faker.PickRandom(
                "Lab - Building A, Room 101",
                "Lab - Building B, Room 205",
                "Outpatient Lab Center"),
            AppointmentType.Imaging => faker.PickRandom(
                "Radiology - Building A, Room 301",
                "Imaging Center - 2nd Floor",
                "MRI Suite - Building C"),
            AppointmentType.Procedure => faker.PickRandom(
                "Procedure Room 1",
                "Procedure Room 2",
                "Minor Surgery Suite"),
            _ => faker.PickRandom(
                "Exam Room 1",
                "Exam Room 2",
                "Exam Room 3",
                "Exam Room 4",
                "Exam Room 5",
                "Clinic A - Room 201",
                "Clinic B - Room 102",
                "Primary Care - Suite 300")
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

    private static readonly string[] CancellationReasons =
    [
        "Patient requested cancellation",
        "Schedule conflict",
        "Patient feeling better, no longer needs visit",
        "Insurance issue - needs pre-authorization",
        "Provider unavailable due to emergency",
        "Weather-related cancellation",
        "Patient transportation issue",
    ];

    private static readonly string[] CompletionNotes =
    [
        "Patient seen and evaluated. Plan discussed. Follow-up in 2 weeks.",
        "Examination complete. Vitals stable. Prescription provided.",
        "Routine visit. No new concerns. Continue current treatment plan.",
        "Patient responding well to treatment. Medication dose maintained.",
        "Lab results reviewed with patient. All within normal range.",
        "Discussed lifestyle modifications. Patient agrees to dietary changes.",
        "Referred to specialist for further evaluation.",
        "Imaging ordered for further assessment. Results pending.",
    ];

    private static readonly string[] PatientNoteExamples =
    [
        "Please have someone available to translate (Spanish preferred)",
        "Running late, will arrive 10 minutes after scheduled time",
        "Need to discuss recent medication side effects",
        "First visit after hospital discharge",
        "Would like to discuss test results from last visit",
        "Wheelchair accessible room needed",
        "Prefer morning appointments in the future",
        "Bringing medical records from previous provider",
    ];
}

/// <summary>
/// Lightweight patient summary used for seeding appointments.
/// </summary>
public sealed record PatientSummary(Guid Id, string FirstName, string LastName, string Email);
