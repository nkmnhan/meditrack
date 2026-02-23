using MediTrack.MedicalRecords.Domain.Aggregates;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MediTrack.MedicalRecords.Infrastructure.EntityConfigurations;

/// <summary>
/// EF Core configuration for the MedicalRecord entity.
/// </summary>
public sealed class MedicalRecordConfiguration : IEntityTypeConfiguration<MedicalRecord>
{
    public void Configure(EntityTypeBuilder<MedicalRecord> builder)
    {
        builder.ToTable("MedicalRecords");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Id)
            .ValueGeneratedNever();

        builder.Property(r => r.PatientId)
            .IsRequired();

        builder.Property(r => r.DiagnosisCode)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(r => r.DiagnosisDescription)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(r => r.Severity)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(r => r.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(r => r.ChiefComplaint)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(r => r.RecordedByDoctorId)
            .IsRequired();

        builder.Property(r => r.RecordedByDoctorName)
            .IsRequired()
            .HasMaxLength(200);

        // Navigation properties
        builder.HasMany(r => r.ClinicalNotes)
            .WithOne()
            .HasForeignKey(n => n.MedicalRecordId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(r => r.Prescriptions)
            .WithOne()
            .HasForeignKey(p => p.MedicalRecordId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(r => r.VitalSigns)
            .WithOne()
            .HasForeignKey(v => v.MedicalRecordId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(r => r.Attachments)
            .WithOne()
            .HasForeignKey(a => a.MedicalRecordId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes
        builder.HasIndex(r => r.PatientId);
        builder.HasIndex(r => r.DiagnosisCode);
        builder.HasIndex(r => r.RecordedAt);
        builder.HasIndex(r => r.Status);
        builder.HasIndex(r => r.AppointmentId)
            .HasFilter("[AppointmentId] IS NOT NULL");

        // Ignore domain events collection
        builder.Ignore(r => r.DomainEvents);
    }
}

/// <summary>
/// EF Core configuration for the ClinicalNote entity.
/// </summary>
public sealed class ClinicalNoteConfiguration : IEntityTypeConfiguration<ClinicalNote>
{
    public void Configure(EntityTypeBuilder<ClinicalNote> builder)
    {
        builder.ToTable("ClinicalNotes");

        builder.HasKey(n => n.Id);

        builder.Property(n => n.Id)
            .ValueGeneratedNever();

        builder.Property(n => n.NoteType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(n => n.Content)
            .IsRequired()
            .HasMaxLength(10000);

        builder.Property(n => n.AuthorId)
            .IsRequired();

        builder.Property(n => n.AuthorName)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasIndex(n => n.MedicalRecordId);

        // Ignore domain events
        builder.Ignore(n => n.DomainEvents);
    }
}

/// <summary>
/// EF Core configuration for the Prescription entity.
/// </summary>
public sealed class PrescriptionConfiguration : IEntityTypeConfiguration<Prescription>
{
    public void Configure(EntityTypeBuilder<Prescription> builder)
    {
        builder.ToTable("Prescriptions");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Id)
            .ValueGeneratedNever();

        builder.Property(p => p.MedicationName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(p => p.Dosage)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.Frequency)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.Instructions)
            .HasMaxLength(1000);

        builder.Property(p => p.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(p => p.PrescribedById)
            .IsRequired();

        builder.Property(p => p.PrescribedByName)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasIndex(p => p.MedicalRecordId);
        builder.HasIndex(p => p.Status);

        // Ignore domain events
        builder.Ignore(p => p.DomainEvents);
    }
}

/// <summary>
/// EF Core configuration for the VitalSigns entity.
/// </summary>
public sealed class VitalSignsConfiguration : IEntityTypeConfiguration<VitalSigns>
{
    public void Configure(EntityTypeBuilder<VitalSigns> builder)
    {
        builder.ToTable("VitalSigns");

        builder.HasKey(v => v.Id);

        builder.Property(v => v.Id)
            .ValueGeneratedNever();

        builder.Property(v => v.BloodPressureSystolic)
            .HasPrecision(5, 1);

        builder.Property(v => v.BloodPressureDiastolic)
            .HasPrecision(5, 1);

        builder.Property(v => v.HeartRate)
            .HasPrecision(5, 1);

        builder.Property(v => v.Temperature)
            .HasPrecision(5, 2);

        builder.Property(v => v.RespiratoryRate)
            .HasPrecision(5, 1);

        builder.Property(v => v.OxygenSaturation)
            .HasPrecision(5, 2);

        builder.Property(v => v.Weight)
            .HasPrecision(6, 2);

        builder.Property(v => v.Height)
            .HasPrecision(5, 2);

        builder.Property(v => v.Bmi)
            .HasPrecision(5, 1);

        builder.Property(v => v.RecordedById)
            .IsRequired();

        builder.Property(v => v.RecordedByName)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasIndex(v => v.MedicalRecordId);
        builder.HasIndex(v => v.RecordedAt);

        // Ignore computed and domain event properties
        builder.Ignore(v => v.BloodPressureFormatted);
        builder.Ignore(v => v.DomainEvents);
    }
}

/// <summary>
/// EF Core configuration for the Attachment entity.
/// </summary>
public sealed class AttachmentConfiguration : IEntityTypeConfiguration<Attachment>
{
    public void Configure(EntityTypeBuilder<Attachment> builder)
    {
        builder.ToTable("Attachments");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id)
            .ValueGeneratedNever();

        builder.Property(a => a.FileName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(a => a.ContentType)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.StorageUrl)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(a => a.Description)
            .HasMaxLength(500);

        builder.Property(a => a.UploadedById)
            .IsRequired();

        builder.Property(a => a.UploadedByName)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasIndex(a => a.MedicalRecordId);

        // Ignore computed and domain event properties
        builder.Ignore(a => a.FileSizeFormatted);
        builder.Ignore(a => a.DomainEvents);
    }
}
