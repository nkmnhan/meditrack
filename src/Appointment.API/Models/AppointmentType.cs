namespace Appointment.API.Models;

/// <summary>
/// Represents the type/category of an appointment.
/// </summary>
public enum AppointmentType
{
    /// <summary>
    /// General consultation or check-up.
    /// </summary>
    Consultation = 0,

    /// <summary>
    /// Follow-up visit for ongoing treatment.
    /// </summary>
    FollowUp = 1,

    /// <summary>
    /// Annual physical examination.
    /// </summary>
    AnnualPhysical = 2,

    /// <summary>
    /// Urgent care visit.
    /// </summary>
    UrgentCare = 3,

    /// <summary>
    /// Specialist referral appointment.
    /// </summary>
    Specialist = 4,

    /// <summary>
    /// Lab work or diagnostic testing.
    /// </summary>
    LabWork = 5,

    /// <summary>
    /// Imaging services (X-ray, MRI, etc.).
    /// </summary>
    Imaging = 6,

    /// <summary>
    /// Vaccination or immunization.
    /// </summary>
    Vaccination = 7,

    /// <summary>
    /// Telehealth/virtual appointment.
    /// </summary>
    Telehealth = 8,

    /// <summary>
    /// Procedure or minor surgery.
    /// </summary>
    Procedure = 9
}
