using Duende.IdentityServer.EntityFramework.DbContexts;
using Duende.IdentityServer.EntityFramework.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.DependencyInjection;

namespace MediTrack.Identity.Data;

/// <summary>
/// Design-time factory for ConfigurationDbContext (IdentityServer clients, scopes, resources).
/// Used by EF migrations tooling — not instantiated at runtime.
/// </summary>
public sealed class ConfigurationDbContextFactory : IDesignTimeDbContextFactory<ConfigurationDbContext>
{
    public ConfigurationDbContext CreateDbContext(string[] args)
    {
        const string connectionString =
            "Host=localhost;Database=identity;Username=postgres;Password=postgres";

        var services = new ServiceCollection();
        services.AddSingleton(new ConfigurationStoreOptions());
        services.AddDbContext<ConfigurationDbContext>(options =>
            options.UseNpgsql(
                connectionString,
                npgsqlOptions => npgsqlOptions.MigrationsAssembly("Identity.API")));

        var serviceProvider = services.BuildServiceProvider();
        return serviceProvider.GetRequiredService<ConfigurationDbContext>();
    }
}

/// <summary>
/// Design-time factory for PersistedGrantDbContext (IdentityServer tokens, grants).
/// Used by EF migrations tooling — not instantiated at runtime.
/// </summary>
public sealed class PersistedGrantDbContextFactory : IDesignTimeDbContextFactory<PersistedGrantDbContext>
{
    public PersistedGrantDbContext CreateDbContext(string[] args)
    {
        const string connectionString =
            "Host=localhost;Database=identity;Username=postgres;Password=postgres";

        var services = new ServiceCollection();
        services.AddSingleton(new OperationalStoreOptions());
        services.AddDbContext<PersistedGrantDbContext>(options =>
            options.UseNpgsql(
                connectionString,
                npgsqlOptions => npgsqlOptions.MigrationsAssembly("Identity.API")));

        var serviceProvider = services.BuildServiceProvider();
        return serviceProvider.GetRequiredService<PersistedGrantDbContext>();
    }
}
