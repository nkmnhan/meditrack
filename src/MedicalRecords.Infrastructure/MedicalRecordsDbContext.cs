using MediTrack.MedicalRecords.Domain.Aggregates;
using MediTrack.MedicalRecords.Domain.SeedWork;
using Microsoft.EntityFrameworkCore;

namespace MediTrack.MedicalRecords.Infrastructure;

/// <summary>
/// EF Core database context for the MedicalRecords service.
/// </summary>
public sealed class MedicalRecordsDbContext : DbContext, IUnitOfWork
{
    public MedicalRecordsDbContext(DbContextOptions<MedicalRecordsDbContext> options)
        : base(options)
    {
    }

    public DbSet<MedicalRecord> MedicalRecords => Set<MedicalRecord>();
    public DbSet<ClinicalNote> ClinicalNotes => Set<ClinicalNote>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<VitalSigns> VitalSigns => Set<VitalSigns>();
    public DbSet<Attachment> Attachments => Set<Attachment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(MedicalRecordsDbContext).Assembly);
    }

    public async Task<bool> SaveEntitiesAsync(CancellationToken cancellationToken = default)
    {
        // TODO: Dispatch domain events before saving
        await SaveChangesAsync(cancellationToken);
        return true;
    }
}
