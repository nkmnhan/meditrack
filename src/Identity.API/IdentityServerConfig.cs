using Duende.IdentityServer.Models;

namespace MediTrack.Identity;

public static class IdentityServerConfig
{
    public static IEnumerable<IdentityResource> IdentityResources =>
    [
        new IdentityResources.OpenId(),
        new IdentityResources.Profile()
    ];

    public static IEnumerable<ApiScope> ApiScopes =>
    [
        new ApiScope("patient-api", "Patient API"),
        new ApiScope("appointment-api", "Appointment API"),
        new ApiScope("medicalrecords-api", "Medical Records API")
    ];

    public static IEnumerable<Client> Clients =>
    [
        new Client
        {
            ClientId = "meditrack-web",
            ClientName = "MediTrack Web App",
            AllowedGrantTypes = GrantTypes.Code,
            RequirePkce = true,
            RequireClientSecret = false,
            RedirectUris = ["http://localhost:3000/callback"],
            PostLogoutRedirectUris = ["http://localhost:3000"],
            AllowedCorsOrigins = ["http://localhost:3000"],
            AllowedScopes = ["openid", "profile", "patient-api", "appointment-api", "medicalrecords-api"]
        }
    ];
}
