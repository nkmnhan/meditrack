using Appointment.API.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Appointment.API.DesignTime;

/// <summary>
/// Design-time factory for AppointmentDbContext (EF Core migrations)
/// </summary>
public sealed class AppointmentDbContextFactory : IDesignTimeDbContextFactory<AppointmentDbContext>
{
    public AppointmentDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppointmentDbContext>();
        
        // Use a temporary connection string for migrations
        // The actual connection string comes from appsettings in runtime
        optionsBuilder.UseNpgsql("Host=localhost;Database=meditrack_appointments;Username=meditrack;Password=temp");
        
        return new AppointmentDbContext(optionsBuilder.Options);
    }
}
