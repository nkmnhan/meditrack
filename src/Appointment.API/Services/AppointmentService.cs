using Appointment.API.Dtos;
using Appointment.API.Infrastructure;
using Appointment.API.Models;
using AutoMapper;
using MediTrack.EventBus.Abstractions;
using MediTrack.Shared.Events;
using Microsoft.EntityFrameworkCore;
using AppointmentEntity = Appointment.API.Models.Appointment;

namespace Appointment.API.Services;

/// <summary>
/// Service implementation for managing appointments.
/// </summary>
public sealed class AppointmentService : IAppointmentService
{
    private readonly AppointmentDbContext _dbContext;
    private readonly IMapper _mapper;
    private readonly IEventBus _eventBus;
    private readonly ILogger<AppointmentService> _logger;

    public AppointmentService(
        AppointmentDbContext dbContext,
        IMapper mapper,
        IEventBus eventBus,
        ILogger<AppointmentService> logger)
    {
        _dbContext = dbContext;
        _mapper = mapper;
        _eventBus = eventBus;
        _logger = logger;
    }

    public async Task<AppointmentResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        return appointment is null ? null : _mapper.Map<AppointmentResponse>(appointment);
    }

    public async Task<IReadOnlyList<AppointmentListItemResponse>> GetAllAsync(
        AppointmentSearchQuery? query = null,
        CancellationToken cancellationToken = default)
    {
        var queryable = _dbContext.Appointments.AsNoTracking();

        if (query is not null)
        {
            if (query.PatientId.HasValue)
            {
                queryable = queryable.Where(a => a.PatientId == query.PatientId.Value);
            }

            if (query.ProviderId.HasValue)
            {
                queryable = queryable.Where(a => a.ProviderId == query.ProviderId.Value);
            }

            if (query.FromDate.HasValue)
            {
                queryable = queryable.Where(a => a.ScheduledDateTime >= query.FromDate.Value);
            }

            if (query.ToDate.HasValue)
            {
                queryable = queryable.Where(a => a.ScheduledDateTime <= query.ToDate.Value);
            }

            if (query.Status.HasValue)
            {
                queryable = queryable.Where(a => a.Status == query.Status.Value);
            }

            if (query.Type.HasValue)
            {
                queryable = queryable.Where(a => a.Type == query.Type.Value);
            }
        }

        var appointments = await queryable
            .OrderBy(a => a.ScheduledDateTime)
            .ToListAsync(cancellationToken);

        return _mapper.Map<List<AppointmentListItemResponse>>(appointments);
    }

    public async Task<IReadOnlyList<AppointmentListItemResponse>> GetByPatientIdAsync(
        Guid patientId,
        CancellationToken cancellationToken = default)
    {
        var appointments = await _dbContext.Appointments
            .AsNoTracking()
            .Where(a => a.PatientId == patientId)
            .OrderByDescending(a => a.ScheduledDateTime)
            .ToListAsync(cancellationToken);

        return _mapper.Map<List<AppointmentListItemResponse>>(appointments);
    }

    public async Task<IReadOnlyList<AppointmentListItemResponse>> GetByProviderIdAsync(
        Guid providerId,
        CancellationToken cancellationToken = default)
    {
        var appointments = await _dbContext.Appointments
            .AsNoTracking()
            .Where(a => a.ProviderId == providerId)
            .OrderBy(a => a.ScheduledDateTime)
            .ToListAsync(cancellationToken);

        return _mapper.Map<List<AppointmentListItemResponse>>(appointments);
    }

    public async Task<IReadOnlyList<AppointmentListItemResponse>> GetUpcomingByPatientIdAsync(
        Guid patientId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var appointments = await _dbContext.Appointments
            .AsNoTracking()
            .Where(a => a.PatientId == patientId)
            .Where(a => a.ScheduledDateTime >= now)
            .Where(a => a.Status != AppointmentStatus.Cancelled
                && a.Status != AppointmentStatus.Completed
                && a.Status != AppointmentStatus.NoShow
                && a.Status != AppointmentStatus.Rescheduled)
            .OrderBy(a => a.ScheduledDateTime)
            .ToListAsync(cancellationToken);

        return _mapper.Map<List<AppointmentListItemResponse>>(appointments);
    }

    public async Task<AppointmentResponse> CreateAsync(
        CreateAppointmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var appointment = new AppointmentEntity(
            request.PatientId,
            request.PatientName,
            request.ProviderId,
            request.ProviderName,
            request.ScheduledDateTime,
            request.DurationMinutes,
            request.Type,
            request.Reason,
            request.PatientNotes,
            request.Location);

        _dbContext.Appointments.Add(appointment);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Created appointment {AppointmentId} for patient {PatientId} with provider {ProviderId}",
            appointment.Id,
            appointment.PatientId,
            appointment.ProviderId);

        // Publish integration event
        var integrationEvent = new AppointmentCreatedIntegrationEvent
        {
            AppointmentId = appointment.Id,
            PatientId = appointment.PatientId,
            PatientName = appointment.PatientName,
            PatientEmail = request.PatientEmail,
            ProviderId = appointment.ProviderId,
            ProviderName = appointment.ProviderName,
            ScheduledAt = appointment.ScheduledDateTime,
            AppointmentType = appointment.Type.ToString(),
            Reason = appointment.Reason
        };
        await _eventBus.PublishAsync(integrationEvent, cancellationToken);

        return _mapper.Map<AppointmentResponse>(appointment);
    }

    public async Task<AppointmentResponse?> UpdateAsync(
        Guid id,
        UpdateAppointmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return null;
        }

        if (request.ScheduledDateTime.HasValue || request.DurationMinutes.HasValue)
        {
            appointment.UpdateSchedule(
                request.ScheduledDateTime ?? appointment.ScheduledDateTime,
                request.DurationMinutes ?? appointment.DurationMinutes);
        }

        if (request.Type.HasValue || request.Reason is not null || request.PatientNotes is not null || request.Location is not null)
        {
            appointment.UpdateDetails(
                request.Type ?? appointment.Type,
                request.Reason ?? appointment.Reason,
                request.PatientNotes,
                request.Location);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Updated appointment {AppointmentId}", id);

        return _mapper.Map<AppointmentResponse>(appointment);
    }

    public async Task<AppointmentResponse?> RescheduleAsync(
        Guid id,
        RescheduleAppointmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return null;
        }

        var newAppointment = appointment.Reschedule(request.NewDateTime, request.NewLocation);
        _dbContext.Appointments.Add(newAppointment);

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Rescheduled appointment {OldAppointmentId} to {NewAppointmentId}",
            id,
            newAppointment.Id);

        return _mapper.Map<AppointmentResponse>(newAppointment);
    }

    public async Task<AppointmentResponse?> ConfirmAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return null;
        }

        appointment.Confirm();
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Confirmed appointment {AppointmentId}", id);

        return _mapper.Map<AppointmentResponse>(appointment);
    }

    public async Task<AppointmentResponse?> CheckInAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return null;
        }

        appointment.CheckIn();
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Patient checked in for appointment {AppointmentId}", id);

        return _mapper.Map<AppointmentResponse>(appointment);
    }

    public async Task<AppointmentResponse?> StartAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return null;
        }

        appointment.Start();
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Started appointment {AppointmentId}", id);

        return _mapper.Map<AppointmentResponse>(appointment);
    }

    public async Task<AppointmentResponse?> CompleteAsync(
        Guid id,
        CompleteAppointmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return null;
        }

        appointment.Complete(request.Notes);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Completed appointment {AppointmentId}", id);

        return _mapper.Map<AppointmentResponse>(appointment);
    }

    public async Task<AppointmentResponse?> CancelAsync(
        Guid id,
        CancelAppointmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return null;
        }

        appointment.Cancel(request.Reason);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Cancelled appointment {AppointmentId}. Reason: {Reason}",
            id,
            request.Reason);

        return _mapper.Map<AppointmentResponse>(appointment);
    }

    public async Task<AppointmentResponse?> MarkNoShowAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return null;
        }

        appointment.MarkNoShow();
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Marked appointment {AppointmentId} as no-show", id);

        return _mapper.Map<AppointmentResponse>(appointment);
    }

    public async Task<AppointmentResponse?> SetTelehealthLinkAsync(
        Guid id,
        SetTelehealthLinkRequest request,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return null;
        }

        appointment.SetTelehealthLink(request.Link);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Set telehealth link for appointment {AppointmentId}", id);

        return _mapper.Map<AppointmentResponse>(appointment);
    }

    public async Task<AppointmentResponse?> AddNotesAsync(
        Guid id,
        AddNotesRequest request,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment is null)
        {
            return null;
        }

        appointment.AddInternalNotes(request.Notes);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Added notes to appointment {AppointmentId}", id);

        return _mapper.Map<AppointmentResponse>(appointment);
    }

    public async Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Appointments
            .AnyAsync(a => a.Id == id, cancellationToken);
    }

    public async Task<bool> HasConflictAsync(
        Guid providerId,
        DateTime startTime,
        DateTime endTime,
        Guid? excludeAppointmentId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Appointments
            .Where(a => a.ProviderId == providerId)
            .Where(a => a.Status != AppointmentStatus.Cancelled
                && a.Status != AppointmentStatus.Rescheduled
                && a.Status != AppointmentStatus.NoShow);

        if (excludeAppointmentId.HasValue)
        {
            query = query.Where(a => a.Id != excludeAppointmentId.Value);
        }

        // Check for overlapping appointments
        // An overlap exists if: existingStart < newEnd AND existingEnd > newStart
        return await query.AnyAsync(
            a => a.ScheduledDateTime < endTime
                && a.ScheduledDateTime.AddMinutes(a.DurationMinutes) > startTime,
            cancellationToken);
    }
}
