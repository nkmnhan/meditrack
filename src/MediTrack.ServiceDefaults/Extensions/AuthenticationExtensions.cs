using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

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
            });

        services.AddAuthorization();

        return services;
    }
}
