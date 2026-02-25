using MediTrack.Identity.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace MediTrack.Identity.DesignTime;

/// <summary>
/// Design-time factory for ApplicationDbContext (EF Core migrations)
/// </summary>
public sealed class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        
        // Use a temporary connection string for migrations
        // The actual connection string comes from appsettings in runtime
        optionsBuilder.UseNpgsql("Host=localhost;Database=meditrack_identity;Username=meditrack;Password=temp");
        
        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
