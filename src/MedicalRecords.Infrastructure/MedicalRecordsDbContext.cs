using MediTrack.MedicalRecords.Domain.Aggregates;
using Microsoft.EntityFrameworkCore;

namespace MediTrack.MedicalRecords.Infrastructure;

public sealed class MedicalRecordsDbContext : DbContext
{
    public MedicalRecordsDbContext(DbContextOptions<MedicalRecordsDbContext> options)
        : base(options)
    {
    }

    public DbSet<MedicalRecord> MedicalRecords => Set<MedicalRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MedicalRecord>(entity =>
        {
            entity.ToTable("MedicalRecords");
            entity.HasKey(record => record.Id);
            entity.Property(record => record.DiagnosisCode).IsRequired().HasMaxLength(20);
            entity.Property(record => record.DiagnosisDescription).IsRequired().HasMaxLength(1000);
            entity.Property(record => record.RecordedByDoctorId).IsRequired().HasMaxLength(100);
        });
    }
}
