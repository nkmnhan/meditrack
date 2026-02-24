namespace MediTrack.ServiceDefaults;

/// <summary>
/// Centralized authorization policy names used across all microservices.
/// Policies are registered in <see cref="Extensions.AuthenticationExtensions.AddDefaultAuthentication"/>.
/// </summary>
public static class AuthorizationPolicies
{
    /// <summary>
    /// Requires the user to have the Admin or Receptionist role.
    /// Used for patient administration actions (deactivate/activate).
    /// </summary>
    public const string RequireAdminOrReceptionist = nameof(RequireAdminOrReceptionist);
}
