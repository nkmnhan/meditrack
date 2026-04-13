using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Npgsql;
using Pgvector; // Only Pgvector here — NOT Pgvector.EntityFrameworkCore (UseVector() conflict)

namespace Clara.API.Data;

/// <summary>
/// Builds an NpgsqlDataSource with EnableDynamicJson + pgvector support.
/// Isolated here because Pgvector and Pgvector.EntityFrameworkCore both define UseVector()
/// on NpgsqlDataSourceBuilder — this file only imports Pgvector to get the correct overload.
/// </summary>
public static class ClaraDataSourceFactory
{
    public static NpgsqlDataSource Build(string connectionString)
    {
        var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
        dataSourceBuilder.EnableDynamicJson();
        dataSourceBuilder.UseVector(); // returns INpgsqlTypeMapper — don't chain
        return dataSourceBuilder.Build();
    }
}


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
