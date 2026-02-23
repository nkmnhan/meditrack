using AutoMapper;
using MediTrack.EventBus.Abstractions;
using MediTrack.Shared.Events;
using Microsoft.EntityFrameworkCore;
using Patient.API.Dtos;
using Patient.API.Infrastructure;
using Patient.API.Models;

namespace Patient.API.Services;

public class PatientService : IPatientService
{
    private readonly PatientDbContext _dbContext;
    private readonly IMapper _mapper;
    private readonly IEventBus _eventBus;
    private readonly ILogger<PatientService> _logger;

    public PatientService(
        PatientDbContext dbContext,
        IMapper mapper,
        IEventBus eventBus,
        ILogger<PatientService> logger)
    {
        _dbContext = dbContext;
        _mapper = mapper;
        _eventBus = eventBus;
        _logger = logger;
    }

    public async Task<PatientResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var patient = await _dbContext.Patients
            .AsNoTracking()
            .FirstOrDefaultAsync(patient => patient.Id == id, cancellationToken);

        return patient is null ? null : _mapper.Map<PatientResponse>(patient);
    }

    public async Task<IReadOnlyList<PatientListItemResponse>> GetAllAsync(
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Patients.AsNoTracking();

        if (!includeInactive)
        {
            query = query.Where(patient => patient.IsActive);
        }

        var patients = await query
            .OrderBy(patient => patient.LastName)
            .ThenBy(patient => patient.FirstName)
            .ToListAsync(cancellationToken);

        return _mapper.Map<IReadOnlyList<PatientListItemResponse>>(patients);
    }

    public async Task<IReadOnlyList<PatientListItemResponse>> SearchAsync(
        string searchTerm,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
        {
            return [];
        }

        var normalizedSearchTerm = searchTerm.Trim().ToLowerInvariant();

        var patients = await _dbContext.Patients
            .AsNoTracking()
            .Where(patient =>
                patient.IsActive &&
                (patient.FirstName.ToLower().Contains(normalizedSearchTerm) ||
                 patient.LastName.ToLower().Contains(normalizedSearchTerm) ||
                 patient.Email.ToLower().Contains(normalizedSearchTerm) ||
                 patient.PhoneNumber.Contains(normalizedSearchTerm)))
            .OrderBy(patient => patient.LastName)
            .ThenBy(patient => patient.FirstName)
            .Take(50)
            .ToListAsync(cancellationToken);

        return _mapper.Map<IReadOnlyList<PatientListItemResponse>>(patients);
    }

    public async Task<PatientResponse> CreateAsync(
        CreatePatientRequest request,
        CancellationToken cancellationToken = default)
    {
        var address = new Address(
            request.Address.Street,
            request.Address.Street2,
            request.Address.City,
            request.Address.State,
            request.Address.ZipCode,
            request.Address.Country);

        var patient = new Models.Patient(
            request.FirstName,
            request.LastName,
            request.DateOfBirth,
            request.Gender,
            request.Email,
            request.PhoneNumber,
            address);

        // Update medical info if provided
        if (!string.IsNullOrEmpty(request.BloodType) ||
            !string.IsNullOrEmpty(request.Allergies) ||
            !string.IsNullOrEmpty(request.MedicalNotes))
        {
            patient.UpdateMedicalInfo(request.BloodType, request.Allergies, request.MedicalNotes);
        }

        // Update personal info with SSN if provided
        if (!string.IsNullOrEmpty(request.SocialSecurityNumber))
        {
            patient.UpdatePersonalInfo(
                request.FirstName,
                request.LastName,
                request.DateOfBirth,
                request.Gender,
                request.SocialSecurityNumber);
        }

        // Set emergency contact if provided
        if (request.EmergencyContact is not null)
        {
            var emergencyContact = new EmergencyContact(
                request.EmergencyContact.Name,
                request.EmergencyContact.Relationship,
                request.EmergencyContact.PhoneNumber,
                request.EmergencyContact.Email);
            patient.SetEmergencyContact(emergencyContact);
        }

        // Set insurance if provided
        if (request.Insurance is not null)
        {
            var insurance = new Insurance(
                request.Insurance.Provider,
                request.Insurance.PolicyNumber,
                request.Insurance.GroupNumber,
                request.Insurance.PlanName,
                request.Insurance.EffectiveDate,
                request.Insurance.ExpirationDate);
            patient.SetInsurance(insurance);
        }

        _dbContext.Patients.Add(patient);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created patient {PatientId}: {PatientName}", patient.Id, patient.FullName);

        // Publish integration event
        var integrationEvent = new PatientRegisteredIntegrationEvent
        {
            PatientId = patient.Id,
            FirstName = patient.FirstName,
            LastName = patient.LastName,
            Email = patient.Email,
            PhoneNumber = patient.PhoneNumber
        };
        await _eventBus.PublishAsync(integrationEvent, cancellationToken);

        return _mapper.Map<PatientResponse>(patient);
    }

    public async Task<PatientResponse?> UpdateAsync(
        Guid id,
        UpdatePatientRequest request,
        CancellationToken cancellationToken = default)
    {
        var patient = await _dbContext.Patients
            .FirstOrDefaultAsync(patient => patient.Id == id, cancellationToken);

        if (patient is null)
        {
            return null;
        }

        // Update personal info
        patient.UpdatePersonalInfo(
            request.FirstName,
            request.LastName,
            request.DateOfBirth,
            request.Gender,
            request.SocialSecurityNumber);

        // Update contact info
        var address = new Address(
            request.Address.Street,
            request.Address.Street2,
            request.Address.City,
            request.Address.State,
            request.Address.ZipCode,
            request.Address.Country);
        patient.UpdateContactInfo(request.Email, request.PhoneNumber, address);

        // Update medical info
        patient.UpdateMedicalInfo(request.BloodType, request.Allergies, request.MedicalNotes);

        // Update emergency contact
        if (request.EmergencyContact is not null)
        {
            var emergencyContact = new EmergencyContact(
                request.EmergencyContact.Name,
                request.EmergencyContact.Relationship,
                request.EmergencyContact.PhoneNumber,
                request.EmergencyContact.Email);
            patient.SetEmergencyContact(emergencyContact);
        }

        // Update insurance
        if (request.Insurance is not null)
        {
            var insurance = new Insurance(
                request.Insurance.Provider,
                request.Insurance.PolicyNumber,
                request.Insurance.GroupNumber,
                request.Insurance.PlanName,
                request.Insurance.EffectiveDate,
                request.Insurance.ExpirationDate);
            patient.SetInsurance(insurance);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Updated patient {PatientId}: {PatientName}", patient.Id, patient.FullName);

        // Publish integration event
        var integrationEvent = new PatientUpdatedIntegrationEvent
        {
            PatientId = patient.Id,
            FirstName = patient.FirstName,
            LastName = patient.LastName,
            Email = patient.Email,
            PhoneNumber = patient.PhoneNumber
        };
        await _eventBus.PublishAsync(integrationEvent, cancellationToken);

        return _mapper.Map<PatientResponse>(patient);
    }

    public async Task<bool> DeactivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var patient = await _dbContext.Patients
            .FirstOrDefaultAsync(patient => patient.Id == id, cancellationToken);

        if (patient is null)
        {
            return false;
        }

        patient.Deactivate();
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Deactivated patient {PatientId}: {PatientName}", patient.Id, patient.FullName);

        return true;
    }

    public async Task<bool> ActivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var patient = await _dbContext.Patients
            .FirstOrDefaultAsync(patient => patient.Id == id, cancellationToken);

        if (patient is null)
        {
            return false;
        }

        patient.Activate();
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Activated patient {PatientId}: {PatientName}", patient.Id, patient.FullName);

        return true;
    }

    public async Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Patients
            .AnyAsync(patient => patient.Id == id, cancellationToken);
    }

    public async Task<bool> EmailExistsAsync(
        string email,
        Guid? excludePatientId = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var query = _dbContext.Patients
            .Where(patient => patient.Email.ToLower() == normalizedEmail);

        if (excludePatientId.HasValue)
        {
            query = query.Where(patient => patient.Id != excludePatientId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }
}
