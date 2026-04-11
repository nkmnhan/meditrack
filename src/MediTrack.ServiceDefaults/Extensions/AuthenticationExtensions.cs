using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using MediTrack.Shared.Common;

namespace MediTrack.ServiceDefaults.Extensions;

public static class AuthenticationExtensions
{
    public static IServiceCollection AddDefaultAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        string identityUrl = configuration["IdentityUrl"]
            ?? throw new InvalidOperationException("IdentityUrl configuration is required.");

        services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.Authority = identityUrl;
                options.RequireHttpsMetadata = false;
                // Disable default claim type mapping so JWT claims keep their short names
                // (e.g. "role" stays "role", "sub" stays "sub") instead of being mapped to
                // long .NET URIs like "http://schemas.microsoft.com/ws/2008/06/identity/claims/role".
                // Without this, RoleClaimType = "role" doesn't match the mapped claim type and
                // user.IsInRole() always returns false.
                options.MapInboundClaims = false;
                // Issuer validation is off because the internal authority URL
                // (http://identity-api:8080) differs from the browser-facing issuer
                // (https://localhost:5001). Signature validation remains on.
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateAudience = false,
                    ValidateIssuer = false,
                    NameClaimType = "name",
                    RoleClaimType = "role"
                };
                // SignalR WebSocket and SSE connections cannot send an Authorization header,
                // so the client passes the token in the "access_token" query parameter.
                // The JWT middleware must be told to extract it from there for hub endpoints.
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) &&
                            path.StartsWithSegments("/sessionHub"))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorizationBuilder()
            .AddPolicy(AuthorizationPolicies.RequireAdminOrReceptionist, policy =>
                policy.RequireRole(UserRoles.Admin, UserRoles.Receptionist));

        return services;
    }
}
