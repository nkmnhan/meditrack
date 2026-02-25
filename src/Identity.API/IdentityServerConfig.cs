using Duende.IdentityServer;
using Duende.IdentityServer.Models;
using IdentityModel;

namespace MediTrack.Identity;

public static class IdentityServerConfig
{
    public static IEnumerable<IdentityResource> GetIdentityResources() =>
    [
        new IdentityResources.OpenId(),
        new IdentityResources.Profile(),
        new IdentityResource("roles", "User roles", [JwtClaimTypes.Role])
    ];

    public static IEnumerable<ApiScope> GetApiScopes() =>
    [
        new ApiScope("patient-api", "Patient API") { UserClaims = { JwtClaimTypes.Role } },
        new ApiScope("appointment-api", "Appointment API") { UserClaims = { JwtClaimTypes.Role } },
        new ApiScope("medicalrecords-api", "Medical Records API") { UserClaims = { JwtClaimTypes.Role } }
    ];

    public static IEnumerable<Client> GetClients(IConfiguration configuration)
    {
        string webClientUrl = configuration["WebClientUrl"] ?? "https://localhost:3000";

        return
        [
            // Interactive SPA client (Authorization Code + PKCE)
            new Client
            {
                ClientId = "meditrack-web",
                ClientName = "MediTrack Web App",
                AllowedGrantTypes = GrantTypes.Code,
                RequirePkce = true,
                RequireClientSecret = false,
                RedirectUris = [$"{webClientUrl}/callback"],
                PostLogoutRedirectUris = [webClientUrl],
                AllowedCorsOrigins = [webClientUrl],
                AllowOfflineAccess = true,
                AlwaysIncludeUserClaimsInIdToken = true,
                AccessTokenLifetime = 1800, // 30 minutes
                AllowedScopes =
                [
                    IdentityServerConstants.StandardScopes.OpenId,
                    IdentityServerConstants.StandardScopes.Profile,
                    IdentityServerConstants.StandardScopes.OfflineAccess,
                    "roles",
                    "patient-api",
                    "appointment-api",
                    "medicalrecords-api"
                ]
            },

            // Service-to-service client (Client Credentials)
            new Client
            {
                ClientId = "meditrack-service",
                ClientName = "MediTrack Service-to-Service",
                AllowedGrantTypes = GrantTypes.ClientCredentials,
                ClientSecrets = [new Secret((configuration["ServiceClientSecret"] ?? throw new InvalidOperationException("ServiceClientSecret is not configured")).Sha256())],
                AccessTokenLifetime = 1800,
                AllowedScopes =
                [
                    "patient-api",
                    "appointment-api",
                    "medicalrecords-api"
                ]
            }
        ];
    }
}
