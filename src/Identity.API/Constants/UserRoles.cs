namespace MediTrack.Identity.Constants;

/// <summary>
/// Centralized role constants. Keep in sync with frontend roles.ts.
/// </summary>
public static class UserRoles
{
    public const string Admin = "Admin";
    public const string Doctor = "Doctor";
    public const string Nurse = "Nurse";
    public const string Receptionist = "Receptionist";
    public const string Patient = "Patient";

    public static readonly string[] All = [Admin, Doctor, Nurse, Receptionist, Patient];

    public static readonly string[] Staff = [Admin, Doctor, Nurse, Receptionist];

    public static readonly string[] Medical = [Admin, Doctor, Nurse];
}
