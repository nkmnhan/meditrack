using MediTrack.MedicalRecords.Domain.SeedWork;

namespace MediTrack.MedicalRecords.Domain.Aggregates;

public sealed class VitalSigns : Entity
{
    public Guid MedicalRecordId { get; private set; }
    public decimal? BloodPressureSystolic { get; private set; }
    public decimal? BloodPressureDiastolic { get; private set; }
    public decimal? HeartRate { get; private set; }
    public decimal? Temperature { get; private set; }
    public decimal? RespiratoryRate { get; private set; }
    public decimal? OxygenSaturation { get; private set; }
    public decimal? Weight { get; private set; }
    public decimal? Height { get; private set; }
    public decimal? Bmi { get; private set; }
    public Guid RecordedById { get; private set; }
    public string RecordedByName { get; private set; } = string.Empty;
    public DateTimeOffset RecordedAt { get; private set; }

    /// <summary>
    /// Computed property for formatted blood pressure (e.g., "120/80").
    /// </summary>
    public string? BloodPressureFormatted =>
        BloodPressureSystolic.HasValue && BloodPressureDiastolic.HasValue
            ? $"{BloodPressureSystolic:0}/{BloodPressureDiastolic:0}"
            : null;

    private VitalSigns() { }

    internal VitalSigns(
        Guid medicalRecordId,
        decimal? bloodPressureSystolic,
        decimal? bloodPressureDiastolic,
        decimal? heartRate,
        decimal? temperature,
        decimal? respiratoryRate,
        decimal? oxygenSaturation,
        decimal? weight,
        decimal? height,
        Guid recordedById,
        string recordedByName)
    {
        Id = Guid.NewGuid();
        MedicalRecordId = medicalRecordId;
        BloodPressureSystolic = bloodPressureSystolic;
        BloodPressureDiastolic = bloodPressureDiastolic;
        HeartRate = heartRate;
        Temperature = temperature;
        RespiratoryRate = respiratoryRate;
        OxygenSaturation = oxygenSaturation;
        Weight = weight;
        Height = height;
        Bmi = CalculateBmi(weight, height);
        RecordedById = recordedById;
        RecordedByName = recordedByName;
        RecordedAt = DateTimeOffset.UtcNow;
    }

    private static decimal? CalculateBmi(decimal? weight, decimal? height)
    {
        if (!weight.HasValue || !height.HasValue || height.Value == 0)
            return null;

        // Height in inches, weight in lbs — imperial BMI formula
        // Imperial BMI: 703 × weight(lbs) / height(inches)²
        var bmi = 703m * weight.Value / (height.Value * height.Value);
        return Math.Round(bmi, 1);
    }
}
