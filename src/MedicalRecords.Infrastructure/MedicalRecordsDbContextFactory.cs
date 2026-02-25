using MediTrack.MedicalRecords.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace MediTrack.MedicalRecords.Infrastructure.DesignTime;

/// <summary>
/// Design-time factory for MedicalRecordsDbContext (EF Core migrations)
/// </summary>
public sealed class MedicalRecordsDbContextFactory : IDesignTimeDbContextFactory<MedicalRecordsDbContext>
{
    public MedicalRecordsDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<MedicalRecordsDbContext>();
        
        // Use a temporary connection string for migrations
        // The actual connection string comes from appsettings in runtime
        optionsBuilder.UseNpgsql("Host=localhost;Database=meditrack_records;Username=meditrack;Password=temp");
        
        return new MedicalRecordsDbContext(optionsBuilder.Options);
    }
}
