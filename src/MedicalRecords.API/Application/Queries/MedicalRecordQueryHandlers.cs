using AutoMapper;
using MediatR;
using MediTrack.MedicalRecords.API.Application.Models;
using MediTrack.MedicalRecords.Domain.Aggregates;

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
        var records = await _repository.GetByPatientIdAsync(query.PatientId, cancellationToken);

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
