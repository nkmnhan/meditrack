using Appointment.API.Models;

namespace Appointment.API.Dtos;

#region Request DTOs

/// <summary>
/// Request DTO for creating a new appointment.
/// </summary>
public sealed record CreateAppointmentRequest(
    Guid PatientId,
    string PatientName,
    string PatientEmail,
    Guid ProviderId,
    string ProviderName,
    DateTime ScheduledDateTime,
    int DurationMinutes,
    AppointmentType Type,
    string Reason,
    string? PatientNotes = null,
    string? Location = null);

/// <summary>
/// Request DTO for updating an existing appointment.
/// </summary>
public sealed record UpdateAppointmentRequest(
    DateTime? ScheduledDateTime,
    int? DurationMinutes,
    AppointmentType? Type,
    string? Reason,
    string? PatientNotes,
    string? Location);

/// <summary>
/// Request DTO for rescheduling an appointment.
/// </summary>
public sealed record RescheduleAppointmentRequest(
    DateTime NewDateTime,
    string? NewLocation = null);

/// <summary>
/// Request DTO for cancelling an appointment.
/// </summary>
public sealed record CancelAppointmentRequest(
    string Reason);

/// <summary>
/// Request DTO for completing an appointment.
/// </summary>
public sealed record CompleteAppointmentRequest(
    string? Notes = null);

/// <summary>
/// Request DTO for adding internal notes.
/// </summary>
public sealed record AddNotesRequest(
    string Notes);

/// <summary>
/// Request DTO for setting telehealth link.
/// </summary>
public sealed record SetTelehealthLinkRequest(
    string Link);

/// <summary>
/// Query parameters for searching appointments.
/// </summary>
public sealed record AppointmentSearchQuery(
    Guid? PatientId = null,
    Guid? ProviderId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    AppointmentStatus? Status = null,
    AppointmentType? Type = null);

#endregion

#region Response DTOs

/// <summary>
/// Full appointment details response.
/// </summary>
public sealed record AppointmentResponse(
    Guid Id,
    Guid PatientId,
    string PatientName,
    Guid ProviderId,
    string ProviderName,
    DateTime ScheduledDateTime,
    DateTime ScheduledEndDateTime,
    int DurationMinutes,
    string Status,
    string Type,
    string Reason,
    string? PatientNotes,
    string? InternalNotes,
    string? Location,
    string? TelehealthLink,
    string? CancellationReason,
    DateTime? CancelledAt,
    Guid? RescheduledFromId,
    bool CanBeModified,
    bool CanBeCancelled,
    DateTime CreatedAt,
    DateTime UpdatedAt);

/// <summary>
/// Simplified appointment for list views.
/// </summary>
public sealed record AppointmentListItemResponse(
    Guid Id,
    Guid PatientId,
    string PatientName,
    Guid ProviderId,
    string ProviderName,
    DateTime ScheduledDateTime,
    int DurationMinutes,
    string Status,
    string Type,
    string Reason,
    string? Location);

/// <summary>
/// Available time slot for scheduling.
/// </summary>
public sealed record TimeSlotResponse(
    DateTime StartTime,
    DateTime EndTime,
    bool IsAvailable);

/// <summary>
/// Provider availability for a given date range.
/// </summary>
public sealed record ProviderAvailabilityResponse(
    Guid ProviderId,
    string ProviderName,
    DateTime Date,
    IReadOnlyList<TimeSlotResponse> TimeSlots);

/// <summary>
/// Distinct provider summary for search/filter dropdowns.
/// </summary>
public sealed record ProviderSummaryResponse(
    Guid ProviderId,
    string ProviderName);

/// <summary>
/// Dashboard statistics for a provider on a given date.
/// </summary>
public sealed record DashboardStatsResponse(
    int TodayAppointmentCount,
    int PatientsSeen,
    int[] AppointmentCountsByDay);

/// <summary>
/// Query parameters for dashboard stats.
/// </summary>
public sealed record DashboardStatsQuery(
    Guid? ProviderId = null,
    DateTime? Date = null);

#endregion
