using Appointment.API.Dtos;
using Appointment.API.Models;

namespace Appointment.API.Services;

/// <summary>
/// Service interface for managing appointments.
/// </summary>
public interface IAppointmentService
{
    /// <summary>
    /// Gets an appointment by its unique identifier.
    /// </summary>
    Task<AppointmentResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all appointments with optional filtering.
    /// </summary>
    Task<IReadOnlyList<AppointmentListItemResponse>> GetAllAsync(
        AppointmentSearchQuery? query = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets appointments for a specific patient.
    /// </summary>
    Task<IReadOnlyList<AppointmentListItemResponse>> GetByPatientIdAsync(
        Guid patientId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets appointments for a specific provider.
    /// </summary>
    Task<IReadOnlyList<AppointmentListItemResponse>> GetByProviderIdAsync(
        Guid providerId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets upcoming appointments for a patient.
    /// </summary>
    Task<IReadOnlyList<AppointmentListItemResponse>> GetUpcomingByPatientIdAsync(
        Guid patientId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new appointment.
    /// </summary>
    Task<AppointmentResponse> CreateAsync(
        CreateAppointmentRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing appointment.
    /// </summary>
    Task<AppointmentResponse?> UpdateAsync(
        Guid id,
        UpdateAppointmentRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Reschedules an appointment to a new date/time.
    /// </summary>
    Task<AppointmentResponse?> RescheduleAsync(
        Guid id,
        RescheduleAppointmentRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Confirms an appointment.
    /// </summary>
    Task<AppointmentResponse?> ConfirmAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Records patient check-in.
    /// </summary>
    Task<AppointmentResponse?> CheckInAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Starts an appointment.
    /// </summary>
    Task<AppointmentResponse?> StartAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Completes an appointment.
    /// </summary>
    Task<AppointmentResponse?> CompleteAsync(
        Guid id,
        CompleteAppointmentRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Cancels an appointment.
    /// </summary>
    Task<AppointmentResponse?> CancelAsync(
        Guid id,
        CancelAppointmentRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Marks an appointment as no-show.
    /// </summary>
    Task<AppointmentResponse?> MarkNoShowAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Sets telehealth link for an appointment.
    /// </summary>
    Task<AppointmentResponse?> SetTelehealthLinkAsync(
        Guid id,
        SetTelehealthLinkRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds internal notes to an appointment.
    /// </summary>
    Task<AppointmentResponse?> AddNotesAsync(
        Guid id,
        AddNotesRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets distinct providers from existing appointments for search/filter UI.
    /// </summary>
    Task<IReadOnlyList<ProviderSummaryResponse>> GetDistinctProvidersAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if an appointment exists.
    /// </summary>
    Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks for scheduling conflicts for a provider.
    /// </summary>
    Task<bool> HasConflictAsync(
        Guid providerId,
        DateTime startTime,
        DateTime endTime,
        Guid? excludeAppointmentId = null,
        CancellationToken cancellationToken = default);
}
