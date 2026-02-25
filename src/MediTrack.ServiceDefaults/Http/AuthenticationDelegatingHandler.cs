using System.Net.Http.Headers;
using Microsoft.AspNetCore.Http;

namespace MediTrack.ServiceDefaults.Http;

/// <summary>
/// DelegatingHandler that forwards the Authorization header from the current HTTP context
/// to outgoing HttpClient requests for service-to-service authentication.
/// </summary>
public class AuthenticationDelegatingHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuthenticationDelegatingHandler(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var httpContext = _httpContextAccessor.HttpContext;

        // Forward the Authorization header from the incoming request to the outgoing request
        if (httpContext?.Request.Headers.Authorization.Count > 0)
        {
            var authHeader = httpContext.Request.Headers.Authorization.ToString();
            if (!string.IsNullOrEmpty(authHeader))
            {
                request.Headers.Authorization = AuthenticationHeaderValue.Parse(authHeader);
            }
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
