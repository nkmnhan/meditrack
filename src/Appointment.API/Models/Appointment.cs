namespace Appointment.API.Models;

/// <summary>
/// Represents a scheduled appointment between a patient and a healthcare provider.
/// </summary>
public class Appointment
{
    /// <summary>
    /// Unique identifier for the appointment.
    /// </summary>
    public Guid Id { get; private set; }

    /// <summary>
    /// Reference to the patient. Links to Patient.API.
    /// </summary>
    public Guid PatientId { get; private set; }

    /// <summary>
    /// Reference to the healthcare provider.
    /// </summary>
    public Guid ProviderId { get; private set; }

    /// <summary>
    /// Provider's display name (denormalized for read performance).
    /// </summary>
    public string ProviderName { get; private set; } = string.Empty;

    /// <summary>
    /// Patient's display name (denormalized for read performance).
    /// </summary>
    public string PatientName { get; private set; } = string.Empty;

    /// <summary>
    /// Scheduled date and time of the appointment (UTC).
    /// </summary>
    public DateTime ScheduledDateTime { get; private set; }

    /// <summary>
    /// Duration of the appointment in minutes.
    /// </summary>
    public int DurationMinutes { get; private set; }

    /// <summary>
    /// Current status of the appointment.
    /// </summary>
    public AppointmentStatus Status { get; private set; }

    /// <summary>
    /// Type/category of the appointment.
    /// </summary>
    public AppointmentType Type { get; private set; }

    /// <summary>
    /// Reason for the visit or chief complaint.
    /// </summary>
    public string Reason { get; private set; } = string.Empty;

    /// <summary>
    /// Additional notes from the patient.
    /// </summary>
    public string? PatientNotes { get; private set; }

    /// <summary>
    /// Internal notes from provider or staff.
    /// </summary>
    public string? InternalNotes { get; private set; }

    /// <summary>
    /// Location or room for in-person appointments.
    /// </summary>
    public string? Location { get; private set; }

    /// <summary>
    /// Meeting link for telehealth appointments.
    /// </summary>
    public string? TelehealthLink { get; private set; }

    /// <summary>
    /// Reason for cancellation if the appointment was cancelled.
    /// </summary>
    public string? CancellationReason { get; private set; }

    /// <summary>
    /// Date and time when the appointment was cancelled.
    /// </summary>
    public DateTime? CancelledAt { get; private set; }

    /// <summary>
    /// Reference to the original appointment if this is a rescheduled appointment.
    /// </summary>
    public Guid? RescheduledFromId { get; private set; }

    /// <summary>
    /// Date and time when the record was created.
    /// </summary>
    public DateTime CreatedAt { get; private set; }

    /// <summary>
    /// Date and time when the record was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; private set; }

    /// <summary>
    /// EF Core constructor.
    /// </summary>
    private Appointment()
    {
    }

    /// <summary>
    /// Creates a new appointment.
    /// </summary>
    public Appointment(
        Guid patientId,
        string patientName,
        Guid providerId,
        string providerName,
        DateTime scheduledDateTime,
        int durationMinutes,
        AppointmentType type,
        string reason,
        string? patientNotes = null,
        string? location = null)
    {
        Id = Guid.NewGuid();
        PatientId = patientId;
        PatientName = patientName;
        ProviderId = providerId;
        ProviderName = providerName;
        ScheduledDateTime = scheduledDateTime;
        DurationMinutes = durationMinutes;
        Type = type;
        Reason = reason;
        PatientNotes = patientNotes;
        Location = location;
        Status = AppointmentStatus.Scheduled;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Gets the scheduled end time of the appointment.
    /// </summary>
    public DateTime ScheduledEndDateTime => ScheduledDateTime.AddMinutes(DurationMinutes);

    /// <summary>
    /// Indicates whether the appointment can be modified.
    /// </summary>
    public bool CanBeModified => Status is AppointmentStatus.Scheduled or AppointmentStatus.Confirmed;

    /// <summary>
    /// Indicates whether the appointment can be cancelled.
    /// </summary>
    public bool CanBeCancelled => Status is AppointmentStatus.Scheduled
        or AppointmentStatus.Confirmed
        or AppointmentStatus.CheckedIn;

    /// <summary>
    /// Confirms the appointment.
    /// </summary>
    public void Confirm()
    {
        if (Status != AppointmentStatus.Scheduled)
        {
            throw new InvalidOperationException($"Cannot confirm appointment with status {Status}.");
        }

        Status = AppointmentStatus.Confirmed;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Records patient check-in.
    /// </summary>
    public void CheckIn()
    {
        if (Status is not (AppointmentStatus.Scheduled or AppointmentStatus.Confirmed))
        {
            throw new InvalidOperationException($"Cannot check in with status {Status}.");
        }

        Status = AppointmentStatus.CheckedIn;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Starts the appointment.
    /// </summary>
    public void Start()
    {
        if (Status != AppointmentStatus.CheckedIn)
        {
            throw new InvalidOperationException($"Cannot start appointment with status {Status}.");
        }

        Status = AppointmentStatus.InProgress;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Completes the appointment.
    /// </summary>
    public void Complete(string? notes = null)
    {
        if (Status != AppointmentStatus.InProgress)
        {
            throw new InvalidOperationException($"Cannot complete appointment with status {Status}.");
        }

        Status = AppointmentStatus.Completed;
        if (notes is not null)
        {
            InternalNotes = notes;
        }

        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Cancels the appointment.
    /// </summary>
    public void Cancel(string reason)
    {
        if (!CanBeCancelled)
        {
            throw new InvalidOperationException($"Cannot cancel appointment with status {Status}.");
        }

        Status = AppointmentStatus.Cancelled;
        CancellationReason = reason;
        CancelledAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Marks the appointment as no-show.
    /// </summary>
    public void MarkNoShow()
    {
        if (Status is not (AppointmentStatus.Scheduled or AppointmentStatus.Confirmed))
        {
            throw new InvalidOperationException($"Cannot mark as no-show with status {Status}.");
        }

        Status = AppointmentStatus.NoShow;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Reschedules the appointment to a new time.
    /// Returns a new appointment instance linked to this one.
    /// </summary>
    public Appointment Reschedule(DateTime newDateTime, string? newLocation = null)
    {
        if (!CanBeModified)
        {
            throw new InvalidOperationException($"Cannot reschedule appointment with status {Status}.");
        }

        // Mark current appointment as rescheduled
        Status = AppointmentStatus.Rescheduled;
        UpdatedAt = DateTime.UtcNow;

        // Create new appointment linked to this one
        var newAppointment = new Appointment(
            PatientId,
            PatientName,
            ProviderId,
            ProviderName,
            newDateTime,
            DurationMinutes,
            Type,
            Reason,
            PatientNotes,
            newLocation ?? Location)
        {
            RescheduledFromId = Id
        };

        return newAppointment;
    }

    /// <summary>
    /// Updates the appointment time and duration.
    /// </summary>
    public void UpdateSchedule(DateTime scheduledDateTime, int durationMinutes)
    {
        if (!CanBeModified)
        {
            throw new InvalidOperationException($"Cannot modify appointment with status {Status}.");
        }

        ScheduledDateTime = scheduledDateTime;
        DurationMinutes = durationMinutes;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Updates appointment details.
    /// </summary>
    public void UpdateDetails(
        AppointmentType type,
        string reason,
        string? patientNotes,
        string? location)
    {
        if (!CanBeModified)
        {
            throw new InvalidOperationException($"Cannot modify appointment with status {Status}.");
        }

        Type = type;
        Reason = reason;
        PatientNotes = patientNotes;
        Location = location;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Sets the telehealth link for virtual appointments.
    /// </summary>
    public void SetTelehealthLink(string link)
    {
        TelehealthLink = link;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Adds internal notes.
    /// </summary>
    public void AddInternalNotes(string notes)
    {
        InternalNotes = string.IsNullOrEmpty(InternalNotes)
            ? notes
            : $"{InternalNotes}\n{notes}";
        UpdatedAt = DateTime.UtcNow;
    }
}
