using AutoMapper;
using MediatR;
using MediTrack.MedicalRecords.API.Application.Models;
using MediTrack.MedicalRecords.Domain.Aggregates;
using MediTrack.MedicalRecords.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace MediTrack.MedicalRecords.API.Application.Queries;

/// <summary>
/// Handler for GetMedicalRecordByIdQuery.
/// </summary>
public sealed class GetMedicalRecordByIdQueryHandler
    : IRequestHandler<GetMedicalRecordByIdQuery, MedicalRecordResponse?>
{
    private readonly IMedicalRecordRepository _repository;
    private readonly IMapper _mapper;

    public GetMedicalRecordByIdQueryHandler(
        IMedicalRecordRepository repository,
        IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<MedicalRecordResponse?> Handle(
        GetMedicalRecordByIdQuery query,
        CancellationToken cancellationToken)
    {
        var medicalRecord = await _repository.GetByIdReadOnlyAsync(query.Id, cancellationToken);

        return medicalRecord is null ? null : _mapper.Map<MedicalRecordResponse>(medicalRecord);
    }
}

/// <summary>
/// Handler for GetMedicalRecordsByPatientIdQuery.
/// </summary>
public sealed class GetMedicalRecordsByPatientIdQueryHandler
    : IRequestHandler<GetMedicalRecordsByPatientIdQuery, IReadOnlyList<MedicalRecordListItemResponse>>
{
    private readonly IMedicalRecordRepository _repository;
    private readonly IMapper _mapper;

    public GetMedicalRecordsByPatientIdQueryHandler(
        IMedicalRecordRepository repository,
        IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<IReadOnlyList<MedicalRecordListItemResponse>> Handle(
        GetMedicalRecordsByPatientIdQuery query,
        CancellationToken cancellationToken)
    {
        var records = await _repository.GetSummariesByPatientIdAsync(query.PatientId, cancellationToken);

        return _mapper.Map<List<MedicalRecordListItemResponse>>(records);
    }
}

/// <summary>
/// Handler for GetMedicalRecordsByDiagnosisCodeQuery.
/// </summary>
public sealed class GetMedicalRecordsByDiagnosisCodeQueryHandler
    : IRequestHandler<GetMedicalRecordsByDiagnosisCodeQuery, IReadOnlyList<MedicalRecordListItemResponse>>
{
    private readonly IMedicalRecordRepository _repository;
    private readonly IMapper _mapper;

    public GetMedicalRecordsByDiagnosisCodeQueryHandler(
        IMedicalRecordRepository repository,
        IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<IReadOnlyList<MedicalRecordListItemResponse>> Handle(
        GetMedicalRecordsByDiagnosisCodeQuery query,
        CancellationToken cancellationToken)
    {
        var records = await _repository.GetByDiagnosisCodeAsync(query.DiagnosisCode, cancellationToken);

        return _mapper.Map<List<MedicalRecordListItemResponse>>(records);
    }
}

/// <summary>
/// Handler for GetMedicalRecordStatsQuery.
/// Uses DbContext directly for efficient aggregate queries.
/// </summary>
public sealed class GetMedicalRecordStatsQueryHandler
    : IRequestHandler<GetMedicalRecordStatsQuery, MedicalRecordStatsResponse>
{
    private readonly MedicalRecordsDbContext _dbContext;

    public GetMedicalRecordStatsQueryHandler(MedicalRecordsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<MedicalRecordStatsResponse> Handle(
        GetMedicalRecordStatsQuery query,
        CancellationToken cancellationToken)
    {
        var baseQuery = _dbContext.MedicalRecords.AsNoTracking();

        if (query.ProviderId.HasValue)
        {
            baseQuery = baseQuery.Where(record => record.RecordedByDoctorId == query.ProviderId.Value);
        }

        // Pending = Active or RequiresFollowUp (not Resolved or Archived)
        var pendingCount = await baseQuery
            .Where(record => record.Status == RecordStatus.Active
                || record.Status == RecordStatus.RequiresFollowUp)
            .CountAsync(cancellationToken);

        // Urgent = Severe or Critical severity among pending records
        var urgentCount = await baseQuery
            .Where(record => record.Status == RecordStatus.Active
                || record.Status == RecordStatus.RequiresFollowUp)
            .Where(record => record.Severity == DiagnosisSeverity.Severe
                || record.Severity == DiagnosisSeverity.Critical)
            .CountAsync(cancellationToken);

        return new MedicalRecordStatsResponse(pendingCount, urgentCount);
    }
}
