using AutoMapper;
using MediatR;
using MediTrack.MedicalRecords.API.Application.Models;
using MediTrack.MedicalRecords.Domain.Aggregates;
using Microsoft.Extensions.Logging;

namespace MediTrack.MedicalRecords.API.Application.Commands;

/// <summary>
/// Handler for CreateMedicalRecordCommand.
/// </summary>
public sealed class CreateMedicalRecordCommandHandler
    : IRequestHandler<CreateMedicalRecordCommand, MedicalRecordResponse>
{
    private readonly IMedicalRecordRepository _repository;
    private readonly IMapper _mapper;
    private readonly ILogger<CreateMedicalRecordCommandHandler> _logger;

    public CreateMedicalRecordCommandHandler(
        IMedicalRecordRepository repository,
        IMapper mapper,
        ILogger<CreateMedicalRecordCommandHandler> logger)
    {
        _repository = repository;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<MedicalRecordResponse> Handle(
        CreateMedicalRecordCommand command,
        CancellationToken cancellationToken)
    {
        var medicalRecord = MedicalRecord.Create(
            command.PatientId,
            command.ChiefComplaint,
            command.DiagnosisCode,
            command.DiagnosisDescription,
            command.Severity,
            command.RecordedByDoctorId,
            command.RecordedByDoctorName,
            command.AppointmentId);

        _repository.Add(medicalRecord);

        await _repository.UnitOfWork.SaveEntitiesAsync(cancellationToken);

        _logger.LogInformation(
            "Created medical record {RecordId} for patient {PatientId}",
            medicalRecord.Id,
            medicalRecord.PatientId);

        return _mapper.Map<MedicalRecordResponse>(medicalRecord);
    }
}

/// <summary>
/// Handler for UpdateDiagnosisCommand.
/// </summary>
public sealed class UpdateDiagnosisCommandHandler
    : IRequestHandler<UpdateDiagnosisCommand, MedicalRecordResponse?>
{
    private readonly IMedicalRecordRepository _repository;
    private readonly IMapper _mapper;
    private readonly ILogger<UpdateDiagnosisCommandHandler> _logger;

    public UpdateDiagnosisCommandHandler(
        IMedicalRecordRepository repository,
        IMapper mapper,
        ILogger<UpdateDiagnosisCommandHandler> logger)
    {
        _repository = repository;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<MedicalRecordResponse?> Handle(
        UpdateDiagnosisCommand command,
        CancellationToken cancellationToken)
    {
        var medicalRecord = await _repository.GetByIdAsync(command.MedicalRecordId, cancellationToken);

        if (medicalRecord is null)
        {
            return null;
        }

        medicalRecord.UpdateDiagnosis(
            command.DiagnosisCode,
            command.DiagnosisDescription,
            command.Severity);

        await _repository.UnitOfWork.SaveEntitiesAsync(cancellationToken);

        _logger.LogInformation(
            "Updated diagnosis for medical record {RecordId}",
            medicalRecord.Id);

        return _mapper.Map<MedicalRecordResponse>(medicalRecord);
    }
}

/// <summary>
/// Handler for AddClinicalNoteCommand.
/// </summary>
public sealed class AddClinicalNoteCommandHandler
    : IRequestHandler<AddClinicalNoteCommand, ClinicalNoteResponse?>
{
    private readonly IMedicalRecordRepository _repository;
    private readonly IMapper _mapper;
    private readonly ILogger<AddClinicalNoteCommandHandler> _logger;

    public AddClinicalNoteCommandHandler(
        IMedicalRecordRepository repository,
        IMapper mapper,
        ILogger<AddClinicalNoteCommandHandler> logger)
    {
        _repository = repository;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<ClinicalNoteResponse?> Handle(
        AddClinicalNoteCommand command,
        CancellationToken cancellationToken)
    {
        var medicalRecord = await _repository.GetByIdAsync(command.MedicalRecordId, cancellationToken);

        if (medicalRecord is null)
        {
            return null;
        }

        var note = medicalRecord.AddClinicalNote(
            command.NoteType,
            command.Content,
            command.AuthorId,
            command.AuthorName);

        await _repository.UnitOfWork.SaveEntitiesAsync(cancellationToken);

        _logger.LogInformation(
            "Added clinical note {NoteId} to medical record {RecordId}",
            note.Id,
            medicalRecord.Id);

        return _mapper.Map<ClinicalNoteResponse>(note);
    }
}

/// <summary>
/// Handler for AddPrescriptionCommand.
/// </summary>
public sealed class AddPrescriptionCommandHandler
    : IRequestHandler<AddPrescriptionCommand, PrescriptionResponse?>
{
    private readonly IMedicalRecordRepository _repository;
    private readonly IMapper _mapper;
    private readonly ILogger<AddPrescriptionCommandHandler> _logger;

    public AddPrescriptionCommandHandler(
        IMedicalRecordRepository repository,
        IMapper mapper,
        ILogger<AddPrescriptionCommandHandler> logger)
    {
        _repository = repository;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<PrescriptionResponse?> Handle(
        AddPrescriptionCommand command,
        CancellationToken cancellationToken)
    {
        var medicalRecord = await _repository.GetByIdAsync(command.MedicalRecordId, cancellationToken);

        if (medicalRecord is null)
        {
            return null;
        }

        var prescription = medicalRecord.AddPrescription(
            command.MedicationName,
            command.Dosage,
            command.Frequency,
            command.DurationDays,
            command.Instructions,
            command.PrescribedById,
            command.PrescribedByName);

        await _repository.UnitOfWork.SaveEntitiesAsync(cancellationToken);

        _logger.LogInformation(
            "Added prescription {PrescriptionId} to medical record {RecordId}",
            prescription.Id,
            medicalRecord.Id);

        return _mapper.Map<PrescriptionResponse>(prescription);
    }
}

/// <summary>
/// Handler for RecordVitalSignsCommand.
/// </summary>
public sealed class RecordVitalSignsCommandHandler
    : IRequestHandler<RecordVitalSignsCommand, VitalSignsResponse?>
{
    private readonly IMedicalRecordRepository _repository;
    private readonly IMapper _mapper;
    private readonly ILogger<RecordVitalSignsCommandHandler> _logger;

    public RecordVitalSignsCommandHandler(
        IMedicalRecordRepository repository,
        IMapper mapper,
        ILogger<RecordVitalSignsCommandHandler> logger)
    {
        _repository = repository;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<VitalSignsResponse?> Handle(
        RecordVitalSignsCommand command,
        CancellationToken cancellationToken)
    {
        var medicalRecord = await _repository.GetByIdAsync(command.MedicalRecordId, cancellationToken);

        if (medicalRecord is null)
        {
            return null;
        }

        var vitals = medicalRecord.RecordVitalSigns(
            command.BloodPressureSystolic,
            command.BloodPressureDiastolic,
            command.HeartRate,
            command.Temperature,
            command.RespiratoryRate,
            command.OxygenSaturation,
            command.Weight,
            command.Height,
            command.RecordedById,
            command.RecordedByName);

        await _repository.UnitOfWork.SaveEntitiesAsync(cancellationToken);

        _logger.LogInformation(
            "Recorded vital signs {VitalsId} for medical record {RecordId}",
            vitals.Id,
            medicalRecord.Id);

        return _mapper.Map<VitalSignsResponse>(vitals);
    }
}

/// <summary>
/// Handler for AddAttachmentCommand.
/// </summary>
public sealed class AddAttachmentCommandHandler
    : IRequestHandler<AddAttachmentCommand, AttachmentResponse?>
{
    private readonly IMedicalRecordRepository _repository;
    private readonly IMapper _mapper;
    private readonly ILogger<AddAttachmentCommandHandler> _logger;

    public AddAttachmentCommandHandler(
        IMedicalRecordRepository repository,
        IMapper mapper,
        ILogger<AddAttachmentCommandHandler> logger)
    {
        _repository = repository;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<AttachmentResponse?> Handle(
        AddAttachmentCommand command,
        CancellationToken cancellationToken)
    {
        var medicalRecord = await _repository.GetByIdAsync(command.MedicalRecordId, cancellationToken);

        if (medicalRecord is null)
        {
            return null;
        }

        var attachment = medicalRecord.AddAttachment(
            command.FileName,
            command.ContentType,
            command.FileSizeBytes,
            command.StorageUrl,
            command.Description,
            command.UploadedById,
            command.UploadedByName);

        await _repository.UnitOfWork.SaveEntitiesAsync(cancellationToken);

        _logger.LogInformation(
            "Added attachment {AttachmentId} to medical record {RecordId}",
            attachment.Id,
            medicalRecord.Id);

        return _mapper.Map<AttachmentResponse>(attachment);
    }
}

/// <summary>
/// Handler for ResolveMedicalRecordCommand.
/// </summary>
public sealed class ResolveMedicalRecordCommandHandler
    : IRequestHandler<ResolveMedicalRecordCommand, bool>
{
    private readonly IMedicalRecordRepository _repository;
    private readonly ILogger<ResolveMedicalRecordCommandHandler> _logger;

    public ResolveMedicalRecordCommandHandler(
        IMedicalRecordRepository repository,
        ILogger<ResolveMedicalRecordCommandHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<bool> Handle(
        ResolveMedicalRecordCommand command,
        CancellationToken cancellationToken)
    {
        var medicalRecord = await _repository.GetByIdAsync(command.MedicalRecordId, cancellationToken);

        if (medicalRecord is null)
        {
            return false;
        }

        medicalRecord.Resolve();
        await _repository.UnitOfWork.SaveEntitiesAsync(cancellationToken);

        _logger.LogInformation("Resolved medical record {RecordId}", medicalRecord.Id);

        return true;
    }
}

/// <summary>
/// Handler for MarkRequiresFollowUpCommand.
/// </summary>
public sealed class MarkRequiresFollowUpCommandHandler
    : IRequestHandler<MarkRequiresFollowUpCommand, bool>
{
    private readonly IMedicalRecordRepository _repository;
    private readonly ILogger<MarkRequiresFollowUpCommandHandler> _logger;

    public MarkRequiresFollowUpCommandHandler(
        IMedicalRecordRepository repository,
        ILogger<MarkRequiresFollowUpCommandHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<bool> Handle(
        MarkRequiresFollowUpCommand command,
        CancellationToken cancellationToken)
    {
        var medicalRecord = await _repository.GetByIdAsync(command.MedicalRecordId, cancellationToken);

        if (medicalRecord is null)
        {
            return false;
        }

        medicalRecord.MarkRequiresFollowUp();
        await _repository.UnitOfWork.SaveEntitiesAsync(cancellationToken);

        _logger.LogInformation(
            "Marked medical record {RecordId} as requiring follow-up",
            medicalRecord.Id);

        return true;
    }
}

/// <summary>
/// Handler for ArchiveMedicalRecordCommand.
/// </summary>
public sealed class ArchiveMedicalRecordCommandHandler
    : IRequestHandler<ArchiveMedicalRecordCommand, bool>
{
    private readonly IMedicalRecordRepository _repository;
    private readonly ILogger<ArchiveMedicalRecordCommandHandler> _logger;

    public ArchiveMedicalRecordCommandHandler(
        IMedicalRecordRepository repository,
        ILogger<ArchiveMedicalRecordCommandHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<bool> Handle(
        ArchiveMedicalRecordCommand command,
        CancellationToken cancellationToken)
    {
        var medicalRecord = await _repository.GetByIdAsync(command.MedicalRecordId, cancellationToken);

        if (medicalRecord is null)
        {
            return false;
        }

        medicalRecord.Archive();
        await _repository.UnitOfWork.SaveEntitiesAsync(cancellationToken);

        _logger.LogInformation("Archived medical record {RecordId}", medicalRecord.Id);

        return true;
    }
}
