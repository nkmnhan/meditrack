namespace Appointment.API.Models;

/// <summary>
/// Represents the lifecycle status of an appointment.
/// </summary>
public enum AppointmentStatus
{
    /// <summary>
    /// Appointment has been scheduled but not yet confirmed.
    /// </summary>
    Scheduled = 0,

    /// <summary>
    /// Appointment has been confirmed by the provider or system.
    /// </summary>
    Confirmed = 1,

    /// <summary>
    /// Patient has checked in for the appointment.
    /// </summary>
    CheckedIn = 2,

    /// <summary>
    /// Appointment is currently in progress.
    /// </summary>
    InProgress = 3,

    /// <summary>
    /// Appointment has been completed successfully.
    /// </summary>
    Completed = 4,

    /// <summary>
    /// Appointment was cancelled by patient or provider.
    /// </summary>
    Cancelled = 5,

    /// <summary>
    /// Patient did not show up for the appointment.
    /// </summary>
    NoShow = 6,

    /// <summary>
    /// Appointment has been rescheduled to a different time.
    /// </summary>
    Rescheduled = 7
}
