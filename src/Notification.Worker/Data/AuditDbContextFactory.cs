using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Notification.Worker.Data;

namespace Notification.Worker.DesignTime;

/// <summary>
/// Design-time factory for AuditDbContext (EF Core migrations)
/// </summary>
public sealed class AuditDbContextFactory : IDesignTimeDbContextFactory<AuditDbContext>
{
    public AuditDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AuditDbContext>();
        
        // Use a temporary connection string for migrations
        // The actual connection string comes from appsettings in runtime
        optionsBuilder.UseNpgsql("Host=localhost;Database=meditrack_audit;Username=meditrack;Password=temp");
        
        return new AuditDbContext(optionsBuilder.Options);
    }
}
