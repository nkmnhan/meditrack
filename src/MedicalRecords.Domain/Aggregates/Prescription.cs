using MediTrack.MedicalRecords.Domain.SeedWork;

namespace MediTrack.MedicalRecords.Domain.Aggregates;

/// <summary>
/// Prescription issued as part of a medical record.
/// </summary>
public sealed class Prescription : Entity
{
    /// <summary>
    /// Parent medical record ID.
    /// </summary>
    public Guid MedicalRecordId { get; private set; }

    /// <summary>
    /// Name of the medication.
    /// </summary>
    public string MedicationName { get; private set; } = string.Empty;

    /// <summary>
    /// Dosage (e.g., "500mg", "10ml").
    /// </summary>
    public string Dosage { get; private set; } = string.Empty;

    /// <summary>
    /// Frequency (e.g., "Twice daily", "Every 8 hours").
    /// </summary>
    public string Frequency { get; private set; } = string.Empty;

    /// <summary>
    /// Duration in days.
    /// </summary>
    public int DurationDays { get; private set; }

    /// <summary>
    /// Additional instructions for the patient.
    /// </summary>
    public string? Instructions { get; private set; }

    /// <summary>
    /// Current status of the prescription.
    /// </summary>
    public PrescriptionStatus Status { get; private set; }

    /// <summary>
    /// ID of the prescribing provider.
    /// </summary>
    public Guid PrescribedById { get; private set; }

    /// <summary>
    /// Name of the prescribing provider (denormalized).
    /// </summary>
    public string PrescribedByName { get; private set; } = string.Empty;

    /// <summary>
    /// When the prescription was issued.
    /// </summary>
    public DateTimeOffset PrescribedAt { get; private set; }

    /// <summary>
    /// When the prescription was filled (if applicable).
    /// </summary>
    public DateTimeOffset? FilledAt { get; private set; }

    /// <summary>
    /// When the prescription expires.
    /// </summary>
    public DateTimeOffset ExpiresAt { get; private set; }

    /// <summary>
    /// EF Core constructor.
    /// </summary>
    private Prescription()
    {
    }

    /// <summary>
    /// Creates a new prescription.
    /// </summary>
    internal static Prescription Create(
        Guid medicalRecordId,
        string medicationName,
        string dosage,
        string frequency,
        int durationDays,
        string? instructions,
        Guid prescribedById,
        string prescribedByName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(medicationName);
        ArgumentException.ThrowIfNullOrWhiteSpace(dosage);
        ArgumentException.ThrowIfNullOrWhiteSpace(frequency);
        ArgumentException.ThrowIfNullOrWhiteSpace(prescribedByName);

        if (durationDays <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(durationDays), "Duration must be positive.");
        }

        var now = DateTimeOffset.UtcNow;

        return new Prescription
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = medicalRecordId,
            MedicationName = medicationName,
            Dosage = dosage,
            Frequency = frequency,
            DurationDays = durationDays,
            Instructions = instructions,
            Status = PrescriptionStatus.Active,
            PrescribedById = prescribedById,
            PrescribedByName = prescribedByName,
            PrescribedAt = now,
            ExpiresAt = now.AddDays(durationDays + 30) // Add 30-day grace period
        };
    }

    /// <summary>
    /// Marks the prescription as filled.
    /// </summary>
    public void MarkFilled()
    {
        if (Status != PrescriptionStatus.Active)
        {
            throw new InvalidOperationException($"Cannot fill prescription with status {Status}.");
        }

        Status = PrescriptionStatus.Filled;
        FilledAt = DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// Cancels the prescription.
    /// </summary>
    public void Cancel()
    {
        if (Status is PrescriptionStatus.Filled or PrescriptionStatus.Completed)
        {
            throw new InvalidOperationException($"Cannot cancel prescription with status {Status}.");
        }

        Status = PrescriptionStatus.Cancelled;
    }

    /// <summary>
    /// Marks the prescription as completed.
    /// </summary>
    public void MarkCompleted()
    {
        if (Status != PrescriptionStatus.Filled)
        {
            throw new InvalidOperationException($"Cannot complete prescription with status {Status}.");
        }

        Status = PrescriptionStatus.Completed;
    }
}

/// <summary>
/// Status of a prescription.
/// </summary>
public enum PrescriptionStatus
{
    Active = 0,
    Filled = 1,
    Completed = 2,
    Cancelled = 3,
    Expired = 4
}
