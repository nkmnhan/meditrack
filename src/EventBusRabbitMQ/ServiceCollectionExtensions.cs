using MediTrack.EventBus;
using MediTrack.EventBus.Abstractions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;

namespace MediTrack.EventBusRabbitMQ;

/// <summary>
/// Configuration key constants for RabbitMQ settings.
/// </summary>
public static class RabbitMQConfigKeys
{
    public const string Section = "RabbitMQ";
    public const string HostName = "HostName";
    public const string Port = "Port";
    public const string UserName = "UserName";
    public const string Password = "Password";
    public const string VirtualHost = "VirtualHost";
    public const string SubscriptionQueueName = "SubscriptionQueueName";
    public const string MaxRetryAttempts = "MaxRetryAttempts";
}

public sealed record RabbitMQEventBusOptions
{
    public string HostName { get; init; } = "localhost";
    public int Port { get; init; } = 5672;
    public string UserName { get; init; } = "guest";
    public string Password { get; init; } = "guest";
    public string VirtualHost { get; init; } = "/";
    public string SubscriptionQueueName { get; init; } = "meditrack_queue";
    public int MaxRetryAttempts { get; init; } = 5;
}

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds RabbitMQ EventBus using IConfiguration.
    /// Reads from "RabbitMQ" section in configuration.
    /// </summary>
    public static IServiceCollection AddRabbitMQEventBus(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var section = configuration.GetSection(RabbitMQConfigKeys.Section);
        
        var options = new RabbitMQEventBusOptions
        {
            HostName = section[RabbitMQConfigKeys.HostName] ?? "localhost",
            Port = int.TryParse(section[RabbitMQConfigKeys.Port], out var port) ? port : 5672,
            UserName = section[RabbitMQConfigKeys.UserName] ?? "guest",
            Password = section[RabbitMQConfigKeys.Password] ?? "guest",
            VirtualHost = section[RabbitMQConfigKeys.VirtualHost] ?? "/",
            SubscriptionQueueName = section[RabbitMQConfigKeys.SubscriptionQueueName] ?? "meditrack_queue",
            MaxRetryAttempts = int.TryParse(section[RabbitMQConfigKeys.MaxRetryAttempts], out var retries) ? retries : 5
        };

        return services.AddRabbitMQEventBusCore(options);
    }

    /// <summary>
    /// Adds RabbitMQ EventBus using an options configuration action.
    /// </summary>
    public static IServiceCollection AddRabbitMQEventBus(
        this IServiceCollection services,
        Action<RabbitMQEventBusOptions> configureOptions)
    {
        var options = new RabbitMQEventBusOptions();
        configureOptions(options);
        return services.AddRabbitMQEventBusCore(options);
    }

    /// <summary>
    /// Core method that registers the EventBus services.
    /// </summary>
    private static IServiceCollection AddRabbitMQEventBusCore(
        this IServiceCollection services,
        RabbitMQEventBusOptions options)
    {
        services.AddSingleton<IConnectionFactory>(_ => new ConnectionFactory
        {
            HostName = options.HostName,
            Port = options.Port,
            UserName = options.UserName,
            Password = options.Password,
            VirtualHost = options.VirtualHost
        });

        services.AddSingleton<RabbitMQPersistentConnection>(serviceProvider =>
            new RabbitMQPersistentConnection(
                serviceProvider.GetRequiredService<IConnectionFactory>(),
                serviceProvider.GetRequiredService<ILogger<RabbitMQPersistentConnection>>(),
                options.MaxRetryAttempts));

        services.AddSingleton<IEventBusSubscriptionsManager, InMemoryEventBusSubscriptionsManager>();

        services.AddSingleton<IEventBus, EventBusRabbitMQ>(serviceProvider =>
            new EventBusRabbitMQ(
                serviceProvider.GetRequiredService<RabbitMQPersistentConnection>(),
                serviceProvider.GetRequiredService<ILogger<EventBusRabbitMQ>>(),
                serviceProvider.GetRequiredService<IEventBusSubscriptionsManager>(),
                serviceProvider,
                options.SubscriptionQueueName));

        return services;
    }
}
