using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using RabbitMQ.Client;

namespace MediTrack.ServiceDefaults.Extensions;

public static class HealthCheckExtensions
{
    public static IServiceCollection AddDefaultHealthChecks(this IServiceCollection services)
    {
        services.AddHealthChecks()
            .AddCheck("self", () => HealthCheckResult.Healthy(), ["live"]);

        return services;
    }

    /// <summary>
    /// Adds a PostgreSQL health check using the specified connection string key.
    /// </summary>
    public static IHealthChecksBuilder AddNpgsqlHealthCheck(
        this IHealthChecksBuilder builder,
        IConfiguration configuration,
        string connectionStringKey)
    {
        var connectionString = configuration.GetConnectionString(connectionStringKey);

        if (string.IsNullOrEmpty(connectionString))
        {
            return builder;
        }

        return builder.AddNpgSql(
            connectionString,
            name: $"postgresql-{connectionStringKey.ToLowerInvariant()}",
            tags: ["ready", "db"]);
    }

    /// <summary>
    /// Adds a RabbitMQ health check. Resolves IConnectionFactory from DI
    /// (registered by AddRabbitMQEventBus) and creates a connection for the check.
    /// </summary>
    public static IHealthChecksBuilder AddRabbitMQHealthCheck(
        this IHealthChecksBuilder builder,
        IConfiguration configuration)
    {
        return builder.AddRabbitMQ(
            async serviceProvider =>
            {
                var connectionFactory = serviceProvider.GetRequiredService<IConnectionFactory>();
                return await connectionFactory.CreateConnectionAsync();
            },
            name: "rabbitmq",
            tags: ["ready", "messaging"]);
    }
}
