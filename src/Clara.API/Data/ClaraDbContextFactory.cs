using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Clara.API.Data;

/// <summary>
/// Design-time factory for EF Core migrations.
/// Used by `dotnet ef migrations add` when the app can't start (missing RabbitMQ, etc.).
/// </summary>
public sealed class ClaraDbContextFactory : IDesignTimeDbContextFactory<ClaraDbContext>
{
    public ClaraDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ClaraDbContext>();
        optionsBuilder.UseNpgsql(
            "Host=localhost;Database=meditrack_clara;Username=postgres;Password=dummy",
            npgsqlOptions => npgsqlOptions.UseVector());

        return new ClaraDbContext(optionsBuilder.Options);
    }
}
