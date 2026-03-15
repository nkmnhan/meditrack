using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Patient.API.Infrastructure;

namespace Patient.API.DesignTime;

/// <summary>
/// Design-time factory for PatientDbContext (EF Core migrations)
/// </summary>
public sealed class PatientDbContextFactory : IDesignTimeDbContextFactory<PatientDbContext>
{
    public PatientDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<PatientDbContext>();
        
        // Use a temporary connection string for migrations
        // The actual connection string comes from appsettings in runtime
        optionsBuilder.UseNpgsql("Host=localhost;Database=meditrack_patients;Username=meditrack;Password=temp");
        
        return new PatientDbContext(optionsBuilder.Options);
    }
}
