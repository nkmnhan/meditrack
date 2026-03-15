using Microsoft.Extensions.DependencyInjection;

namespace MediTrack.ServiceDefaults.Extensions;

public static class ResilienceExtensions
{
    public static IHttpClientBuilder AddDefaultHttpResilience(this IHttpClientBuilder httpClientBuilder)
    {
        httpClientBuilder.AddStandardResilienceHandler();
        return httpClientBuilder;
    }
}
