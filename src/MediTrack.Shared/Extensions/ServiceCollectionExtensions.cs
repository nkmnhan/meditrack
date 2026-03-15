using MediTrack.Shared.Services;
using Microsoft.Extensions.DependencyInjection;

namespace MediTrack.Shared.Extensions;

/// <summary>
/// Extension methods for registering shared services in the DI container.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds PHI audit logging services to the service collection.
    /// Requires IHttpContextAccessor and IEventBus to be registered.
    /// </summary>
    public static IServiceCollection AddPHIAuditLogging(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<IPHIAuditService, PHIAuditService>();
        
        return services;
    }
}
