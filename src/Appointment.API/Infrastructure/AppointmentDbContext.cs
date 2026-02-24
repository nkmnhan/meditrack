using Microsoft.EntityFrameworkCore;
using AppointmentEntity = Appointment.API.Models.Appointment;

namespace Appointment.API.Infrastructure;

/// <summary>
/// EF Core database context for the Appointment service.
/// </summary>
public class AppointmentDbContext : DbContext
{
    public AppointmentDbContext(DbContextOptions<AppointmentDbContext> options)
        : base(options)
    {
    }

    /// <summary>
    /// Appointments table.
    /// </summary>
    public DbSet<AppointmentEntity> Appointments => Set<AppointmentEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppointmentDbContext).Assembly);
    }
}
