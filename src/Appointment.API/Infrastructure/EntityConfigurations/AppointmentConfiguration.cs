using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppointmentEntity = Appointment.API.Models.Appointment;

namespace Appointment.API.Infrastructure.EntityConfigurations;

/// <summary>
/// EF Core configuration for the Appointment entity.
/// </summary>
public sealed class AppointmentConfiguration : IEntityTypeConfiguration<AppointmentEntity>
{
    public void Configure(EntityTypeBuilder<AppointmentEntity> builder)
    {
        builder.ToTable("Appointments");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id)
            .ValueGeneratedNever();

        builder.Property(a => a.PatientId)
            .IsRequired();

        builder.Property(a => a.ProviderId)
            .IsRequired();

        builder.Property(a => a.PatientName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(a => a.PatientEmail)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(a => a.ProviderName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(a => a.ScheduledDateTime)
            .IsRequired();

        builder.Property(a => a.DurationMinutes)
            .IsRequired();

        builder.Property(a => a.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(a => a.Type)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(a => a.Reason)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(a => a.PatientNotes)
            .HasMaxLength(2000);

        builder.Property(a => a.InternalNotes)
            .HasMaxLength(4000);

        builder.Property(a => a.Location)
            .HasMaxLength(200);

        builder.Property(a => a.TelehealthLink)
            .HasMaxLength(500);

        builder.Property(a => a.CancellationReason)
            .HasMaxLength(500);

        // Indexes for common queries
        builder.HasIndex(a => a.PatientId);
        builder.HasIndex(a => a.ProviderId);
        builder.HasIndex(a => a.ScheduledDateTime);
        builder.HasIndex(a => a.Status);
        builder.HasIndex(a => new { a.ProviderId, a.ScheduledDateTime });
        builder.HasIndex(a => new { a.PatientId, a.ScheduledDateTime });

        // Ignore computed properties
        builder.Ignore(a => a.ScheduledEndDateTime);
        builder.Ignore(a => a.CanBeModified);
        builder.Ignore(a => a.CanBeCancelled);
    }
}
