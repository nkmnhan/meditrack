using Microsoft.EntityFrameworkCore;
using Notification.Worker.Models;

namespace Notification.Worker.Data;

/// <summary>
/// Database context for PHI audit logging and compliance tracking.
/// Separates audit data from operational data for security and compliance.
/// </summary>
public class AuditDbContext : DbContext
{
    public AuditDbContext(DbContextOptions<AuditDbContext> options) : base(options)
    {
    }

    public DbSet<PHIAuditLog> AuditLogs => Set<PHIAuditLog>();
    public DbSet<PHIBreachIncident> BreachIncidents => Set<PHIBreachIncident>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure PHIAuditLog entity
        modelBuilder.Entity<PHIAuditLog>(entity =>
        {
            entity.ToTable("PHIAuditLogs");
            
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.EventId).IsRequired();
            entity.Property(e => e.Timestamp).IsRequired();
            entity.Property(e => e.UserId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Username).IsRequired().HasMaxLength(255);
            entity.Property(e => e.UserRole).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Action).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ResourceType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ResourceId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.PatientId).IsRequired();
            entity.Property(e => e.IpAddress).HasMaxLength(45); // IPv6 max length
            entity.Property(e => e.UserAgent).HasMaxLength(500);
            entity.Property(e => e.Success).IsRequired();
            entity.Property(e => e.ErrorMessage).HasMaxLength(1000);
            entity.Property(e => e.EventType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.AdditionalContext); // Unlimited length for JSON
            entity.Property(e => e.Severity).IsRequired().HasMaxLength(50);
            entity.Property(e => e.AlertTriggered).IsRequired();
            entity.Property(e => e.Reviewed).IsRequired();
            entity.Property(e => e.ReviewedBy).HasMaxLength(255);
            entity.Property(e => e.ReviewNotes).HasMaxLength(2000);

            // Indexes for common queries
            entity.HasIndex(e => e.Timestamp).HasDatabaseName("IX_PHIAuditLogs_Timestamp");
            entity.HasIndex(e => e.UserId).HasDatabaseName("IX_PHIAuditLogs_UserId");
            entity.HasIndex(e => e.PatientId).HasDatabaseName("IX_PHIAuditLogs_PatientId");
            entity.HasIndex(e => e.ResourceType).HasDatabaseName("IX_PHIAuditLogs_ResourceType");
            entity.HasIndex(e => e.EventType).HasDatabaseName("IX_PHIAuditLogs_EventType");
            entity.HasIndex(e => e.Success).HasDatabaseName("IX_PHIAuditLogs_Success");
            entity.HasIndex(e => e.Severity).HasDatabaseName("IX_PHIAuditLogs_Severity");
            entity.HasIndex(e => e.AlertTriggered).HasDatabaseName("IX_PHIAuditLogs_AlertTriggered");
            entity.HasIndex(e => e.Reviewed).HasDatabaseName("IX_PHIAuditLogs_Reviewed");
            
            // Composite indexes for common queries
            entity.HasIndex(e => new { e.UserId, e.Timestamp })
                .HasDatabaseName("IX_PHIAuditLogs_UserId_Timestamp");
            entity.HasIndex(e => new { e.PatientId, e.Timestamp })
                .HasDatabaseName("IX_PHIAuditLogs_PatientId_Timestamp");
        });

        // Configure PHIBreachIncident entity
        modelBuilder.Entity<PHIBreachIncident>(entity =>
        {
            entity.ToTable("PHIBreachIncidents");
            
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.EventId).IsRequired();
            entity.Property(e => e.DetectedAt).IsRequired();
            entity.Property(e => e.UserId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Username).IsRequired().HasMaxLength(255);
            entity.Property(e => e.PatientId).IsRequired();
            entity.Property(e => e.Severity).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.PatientsAffected).IsRequired();
            entity.Property(e => e.RequiresBreachNotification).IsRequired();
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.Property(e => e.AssignedTo).HasMaxLength(255);
            entity.Property(e => e.InvestigationNotes);
            entity.Property(e => e.Resolution).HasMaxLength(2000);
            entity.Property(e => e.NotificationSent).IsRequired();

            // Indexes
            entity.HasIndex(e => e.DetectedAt).HasDatabaseName("IX_PHIBreachIncidents_DetectedAt");
            entity.HasIndex(e => e.Status).HasDatabaseName("IX_PHIBreachIncidents_Status");
            entity.HasIndex(e => e.Severity).HasDatabaseName("IX_PHIBreachIncidents_Severity");
            entity.HasIndex(e => e.RequiresBreachNotification)
                .HasDatabaseName("IX_PHIBreachIncidents_RequiresBreachNotification");
        });
    }
}
