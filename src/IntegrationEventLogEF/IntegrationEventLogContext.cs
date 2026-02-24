using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MediTrack.IntegrationEventLogEF;

public sealed class IntegrationEventLogContext : DbContext
{
    public IntegrationEventLogContext(DbContextOptions<IntegrationEventLogContext> options)
        : base(options)
    {
    }

    public DbSet<IntegrationEventLogEntry> IntegrationEventLogs => Set<IntegrationEventLogEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<IntegrationEventLogEntry>(ConfigureIntegrationEventLogEntry);
    }

    private static void ConfigureIntegrationEventLogEntry(EntityTypeBuilder<IntegrationEventLogEntry> builder)
    {
        builder.ToTable("IntegrationEventLog");

        builder.HasKey(entry => entry.EventId);

        builder.Property(entry => entry.EventId)
            .IsRequired();

        builder.Property(entry => entry.EventTypeName)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(entry => entry.State)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(entry => entry.TimesSent)
            .IsRequired();

        builder.Property(entry => entry.CreationTime)
            .IsRequired();

        builder.Property(entry => entry.Content)
            .IsRequired();

        builder.Property(entry => entry.TransactionId)
            .IsRequired();

        builder.Ignore(entry => entry.EventTypeShortName);
        builder.Ignore(entry => entry.IntegrationEvent);
    }
}
