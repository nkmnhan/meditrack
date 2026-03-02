using Clara.API.Application.Models;
using Microsoft.EntityFrameworkCore;

namespace Clara.API.Data;

/// <summary>
/// Read-only DbContext for querying PHI audit logs.
/// Cross-boundary read access to the audit database managed by Notification.Worker.
/// </summary>
public sealed class AuditReadContext : DbContext
{
    public AuditReadContext(DbContextOptions<AuditReadContext> options) : base(options)
    {
    }

    public DbSet<AuditLogEntry> AuditLogs => Set<AuditLogEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AuditLogEntry>(entity =>
        {
            entity.ToTable("PHIAuditLogs");
            entity.HasKey(log => log.Id);

            entity.Property(log => log.Timestamp).IsRequired();
            entity.Property(log => log.Username).HasMaxLength(255);
            entity.Property(log => log.UserRole).HasMaxLength(100);
            entity.Property(log => log.Action).HasMaxLength(50);
            entity.Property(log => log.ResourceType).HasMaxLength(100);
            entity.Property(log => log.ResourceId).HasMaxLength(255);
            entity.Property(log => log.Severity).HasMaxLength(50);
            entity.Property(log => log.Success).IsRequired();
            entity.Property(log => log.ErrorMessage).HasMaxLength(1000);
        });
    }
}
