using Appointment.API.Dtos;
using Appointment.API.Models;
using Appointment.API.Services;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using MediTrack.Shared.Common;
using System.Security.Claims;

namespace Appointment.API.Apis;

/// <summary>
/// Minimal API endpoints for appointment management.
/// </summary>
public static class AppointmentsApi
{
    /// <summary>
    /// Maps all appointment endpoints.
    /// </summary>
    public static void MapAppointmentsApi(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/appointments")
            .WithTags("Appointments")
            .RequireAuthorization();

        // Query endpoints
        group.MapGet("/", GetAllAppointments)
            .WithName("GetAllAppointments")
            .WithSummary("Get all appointments with optional filtering");

        group.MapGet("/{id:guid}", GetAppointmentById)
            .WithName("GetAppointmentById")
            .WithSummary("Get an appointment by ID");

        group.MapGet("/patient/{patientId:guid}", GetByPatientId)
            .WithName("GetAppointmentsByPatientId")
            .WithSummary("Get all appointments for a patient");

        group.MapGet("/patient/{patientId:guid}/upcoming", GetUpcomingByPatientId)
            .WithName("GetUpcomingAppointmentsByPatientId")
            .WithSummary("Get upcoming appointments for a patient");

        group.MapGet("/provider/{providerId:guid}", GetByProviderId)
            .WithName("GetAppointmentsByProviderId")
            .WithSummary("Get all appointments for a provider");

        group.MapGet("/conflicts", CheckConflicts)
            .WithName("CheckAppointmentConflicts")
            .WithSummary("Check for scheduling conflicts");

        // Command endpoints
        group.MapPost("/", CreateAppointment)
            .WithName("CreateAppointment")
            .WithSummary("Create a new appointment");

        group.MapPut("/{id:guid}", UpdateAppointment)
            .WithName("UpdateAppointment")
            .WithSummary("Update an existing appointment");

        group.MapPost("/{id:guid}/reschedule", RescheduleAppointment)
            .WithName("RescheduleAppointment")
            .WithSummary("Reschedule an appointment to a new date/time");

        group.MapPost("/{id:guid}/confirm", ConfirmAppointment)
            .WithName("ConfirmAppointment")
            .WithSummary("Confirm an appointment");

        group.MapPost("/{id:guid}/check-in", CheckInAppointment)
            .WithName("CheckInAppointment")
            .WithSummary("Record patient check-in");

        group.MapPost("/{id:guid}/start", StartAppointment)
            .WithName("StartAppointment")
            .WithSummary("Start an appointment");

        group.MapPost("/{id:guid}/complete", CompleteAppointment)
            .WithName("CompleteAppointment")
            .WithSummary("Complete an appointment");

        group.MapPost("/{id:guid}/cancel", CancelAppointment)
            .WithName("CancelAppointment")
            .WithSummary("Cancel an appointment");

        group.MapPost("/{id:guid}/no-show", MarkNoShow)
            .WithName("MarkNoShow")
            .WithSummary("Mark an appointment as no-show");

        group.MapPost("/{id:guid}/telehealth-link", SetTelehealthLink)
            .WithName("SetTelehealthLink")
            .WithSummary("Set telehealth link for an appointment");

        group.MapPost("/{id:guid}/notes", AddNotes)
            .WithName("AddAppointmentNotes")
            .WithSummary("Add internal notes to an appointment");
    }

    private static async Task<IResult> GetAllAppointments(
        [AsParameters] AppointmentSearchQuery query,
        ClaimsPrincipal user,
        IAppointmentService appointmentService,
        CancellationToken cancellationToken)
    {
        // IDOR protection: Only staff can enumerate all appointments (A01)
        if (!UserRoles.Staff.Any(role => user.IsInRole(role)))
        {
            return Results.Forbid();
        }

        var appointments = await appointmentService.GetAllAsync(query, cancellationToken);
        return Results.Ok(appointments);
    }

    private static async Task<IResult> GetAppointmentById(
        Guid id,
        ClaimsPrincipal user,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this appointment
        if (!await CanAccessAppointmentAsync(user, id, appointmentService, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        var appointment = await appointmentService.GetByIdAsync(id, cancellationToken);

        return appointment is null
            ? Results.NotFound(new { message = $"Appointment with ID {id} not found." })
            : Results.Ok(appointment);
    }

    private static async Task<IResult> GetByPatientId(
        Guid patientId,
        ClaimsPrincipal user,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this patient's appointments
        if (!await CanAccessPatientAppointmentsAsync(user, patientId, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        var appointments = await appointmentService.GetByPatientIdAsync(patientId, cancellationToken);
        return Results.Ok(appointments);
    }

    private static async Task<IResult> GetUpcomingByPatientId(
        Guid patientId,
        ClaimsPrincipal user,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this patient's appointments
        if (!await CanAccessPatientAppointmentsAsync(user, patientId, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        var appointments = await appointmentService.GetUpcomingByPatientIdAsync(patientId, cancellationToken);
        return Results.Ok(appointments);
    }

    private static async Task<IResult> GetByProviderId(
        Guid providerId,
        IAppointmentService appointmentService,
        CancellationToken cancellationToken)
    {
        var appointments = await appointmentService.GetByProviderIdAsync(providerId, cancellationToken);
        return Results.Ok(appointments);
    }

    private static async Task<IResult> CheckConflicts(
        [FromQuery] Guid providerId,
        [FromQuery] DateTime startTime,
        [FromQuery] DateTime endTime,
        [FromQuery] Guid? excludeAppointmentId,
        IAppointmentService appointmentService,
        CancellationToken cancellationToken)
    {
        var hasConflict = await appointmentService.HasConflictAsync(
            providerId,
            startTime,
            endTime,
            excludeAppointmentId,
            cancellationToken);

        return Results.Ok(new { hasConflict });
    }

    private static async Task<IResult> CreateAppointment(
        CreateAppointmentRequest request,
        ClaimsPrincipal user,
        IValidator<CreateAppointmentRequest> validator,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: Patient-role users can only create appointments for themselves (A01)
        if (user.IsInRole(UserRoles.Patient))
        {
            var userIdClaim = user.FindFirst(JwtClaims.Subject)?.Value;
            if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Results.Unauthorized();
            }

            var ownPatientId = await patientResolver.GetPatientIdByUserIdAsync(userId, cancellationToken);
            if (ownPatientId is null || ownPatientId.Value != request.PatientId)
            {
                return Results.Forbid();
            }
        }

        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        // Check for scheduling conflicts
        var endTime = request.ScheduledDateTime.AddMinutes(request.DurationMinutes);
        var hasConflict = await appointmentService.HasConflictAsync(
            request.ProviderId,
            request.ScheduledDateTime,
            endTime,
            cancellationToken: cancellationToken);

        if (hasConflict)
        {
            return Results.Conflict(new { message = "The requested time slot conflicts with an existing appointment." });
        }

        var appointment = await appointmentService.CreateAsync(request, cancellationToken);
        return Results.CreatedAtRoute("GetAppointmentById", new { id = appointment.Id }, appointment);
    }

    private static async Task<IResult> UpdateAppointment(
        Guid id,
        UpdateAppointmentRequest request,
        ClaimsPrincipal user,
        IValidator<UpdateAppointmentRequest> validator,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this appointment
        if (!await CanAccessAppointmentAsync(user, id, appointmentService, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        var appointment = await appointmentService.UpdateAsync(id, request, cancellationToken);

        return appointment is null
            ? Results.NotFound(new { message = $"Appointment with ID {id} not found." })
            : Results.Ok(appointment);
    }

    private static async Task<IResult> RescheduleAppointment(
        Guid id,
        RescheduleAppointmentRequest request,
        ClaimsPrincipal user,
        IValidator<RescheduleAppointmentRequest> validator,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this appointment
        if (!await CanAccessAppointmentAsync(user, id, appointmentService, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        try
        {
            var appointment = await appointmentService.RescheduleAsync(id, request, cancellationToken);

            return appointment is null
                ? Results.NotFound(new { message = $"Appointment with ID {id} not found." })
                : Results.Ok(appointment);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> ConfirmAppointment(
        Guid id,
        ClaimsPrincipal user,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this appointment
        if (!await CanAccessAppointmentAsync(user, id, appointmentService, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        try
        {
            var appointment = await appointmentService.ConfirmAsync(id, cancellationToken);

            return appointment is null
                ? Results.NotFound(new { message = $"Appointment with ID {id} not found." })
                : Results.Ok(appointment);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> CheckInAppointment(
        Guid id,
        ClaimsPrincipal user,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this appointment
        if (!await CanAccessAppointmentAsync(user, id, appointmentService, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        try
        {
            var appointment = await appointmentService.CheckInAsync(id, cancellationToken);

            return appointment is null
                ? Results.NotFound(new { message = $"Appointment with ID {id} not found." })
                : Results.Ok(appointment);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> StartAppointment(
        Guid id,
        ClaimsPrincipal user,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this appointment
        if (!await CanAccessAppointmentAsync(user, id, appointmentService, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        try
        {
            var appointment = await appointmentService.StartAsync(id, cancellationToken);

            return appointment is null
                ? Results.NotFound(new { message = $"Appointment with ID {id} not found." })
                : Results.Ok(appointment);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> CompleteAppointment(
        Guid id,
        CompleteAppointmentRequest request,
        ClaimsPrincipal user,
        IValidator<CompleteAppointmentRequest> validator,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this appointment
        if (!await CanAccessAppointmentAsync(user, id, appointmentService, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        try
        {
            var appointment = await appointmentService.CompleteAsync(id, request, cancellationToken);

            return appointment is null
                ? Results.NotFound(new { message = $"Appointment with ID {id} not found." })
                : Results.Ok(appointment);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> CancelAppointment(
        Guid id,
        CancelAppointmentRequest request,
        ClaimsPrincipal user,
        IValidator<CancelAppointmentRequest> validator,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this appointment
        if (!await CanAccessAppointmentAsync(user, id, appointmentService, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        try
        {
            var appointment = await appointmentService.CancelAsync(id, request, cancellationToken);

            return appointment is null
                ? Results.NotFound(new { message = $"Appointment with ID {id} not found." })
                : Results.Ok(appointment);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> MarkNoShow(
        Guid id,
        ClaimsPrincipal user,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this appointment
        if (!await CanAccessAppointmentAsync(user, id, appointmentService, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        try
        {
            var appointment = await appointmentService.MarkNoShowAsync(id, cancellationToken);

            return appointment is null
                ? Results.NotFound(new { message = $"Appointment with ID {id} not found." })
                : Results.Ok(appointment);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> SetTelehealthLink(
        Guid id,
        SetTelehealthLinkRequest request,
        ClaimsPrincipal user,
        IValidator<SetTelehealthLinkRequest> validator,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this appointment
        if (!await CanAccessAppointmentAsync(user, id, appointmentService, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        var appointment = await appointmentService.SetTelehealthLinkAsync(id, request, cancellationToken);

        return appointment is null
            ? Results.NotFound(new { message = $"Appointment with ID {id} not found." })
            : Results.Ok(appointment);
    }

    private static async Task<IResult> AddNotes(
        Guid id,
        AddNotesRequest request,
        ClaimsPrincipal user,
        IValidator<AddNotesRequest> validator,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this appointment
        if (!await CanAccessAppointmentAsync(user, id, appointmentService, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        var appointment = await appointmentService.AddNotesAsync(id, request, cancellationToken);

        return appointment is null
            ? Results.NotFound(new { message = $"Appointment with ID {id} not found." })
            : Results.Ok(appointment);
    }

    /// <summary>
    /// Checks if the current user can access an appointment.
    /// Staff (Admin, Doctor, Nurse, Receptionist) can access all appointments.
    /// Patients can only access their own appointments.
    /// (OWASP A01 - Broken Access Control: IDOR Prevention)
    /// </summary>
    private static async Task<bool> CanAccessAppointmentAsync(
        ClaimsPrincipal user,
        Guid appointmentId,
        IAppointmentService appointmentService,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // Staff (including Receptionists for scheduling) can access all appointments
        if (UserRoles.Staff.Any(role => user.IsInRole(role)))
        {
            return true;
        }

        // Patients can only access their own appointments
        if (user.IsInRole(UserRoles.Patient))
        {
            var userIdClaim = user.FindFirst(JwtClaims.Subject)?.Value;
            if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return false;
            }

            // Get the patient's PatientId from Patient.API
            var patientId = await patientResolver.GetPatientIdByUserIdAsync(userId, cancellationToken);
            if (patientId is null)
            {
                return false;
            }

            // Get the appointment and check if it belongs to this patient
            var appointment = await appointmentService.GetByIdAsync(appointmentId, cancellationToken);
            if (appointment is null)
            {
                return false; // Not found
            }

            return appointment.PatientId == patientId.Value;
        }

        // Unknown role — deny access
        return false;
    }

    /// <summary>
    /// Checks if the current user can access appointments for a specific patient.
    /// Staff (Admin, Doctor, Nurse, Receptionist) can access all patients' appointments.
    /// Patients can only access their own appointments.
    /// (OWASP A01 - Broken Access Control: IDOR Prevention)
    /// </summary>
    private static async Task<bool> CanAccessPatientAppointmentsAsync(
        ClaimsPrincipal user,
        Guid patientId,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // Staff (including Receptionists for scheduling) can access all appointments
        if (UserRoles.Staff.Any(role => user.IsInRole(role)))
        {
            return true;
        }

        // Patients can only access their own appointments
        if (user.IsInRole(UserRoles.Patient))
        {
            var userIdClaim = user.FindFirst(JwtClaims.Subject)?.Value;
            if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return false;
            }

            // Get the patient's PatientId from Patient.API
            var resolvedPatientId = await patientResolver.GetPatientIdByUserIdAsync(userId, cancellationToken);
            if (resolvedPatientId is null)
            {
                return false;
            }

            return resolvedPatientId.Value == patientId;
        }

        // Unknown role — deny access
        return false;
    }
}
