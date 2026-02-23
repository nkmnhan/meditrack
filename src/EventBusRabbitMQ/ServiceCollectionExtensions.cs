using MediTrack.EventBus;
using MediTrack.EventBus.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;

namespace MediTrack.EventBusRabbitMQ;

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
    public static IServiceCollection AddRabbitMQEventBus(
        this IServiceCollection services,
        Action<RabbitMQEventBusOptions> configureOptions)
    {
        RabbitMQEventBusOptions options = new();
        configureOptions(options);

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
