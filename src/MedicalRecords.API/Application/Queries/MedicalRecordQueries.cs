using MediatR;
using MediTrack.MedicalRecords.API.Application.Models;

namespace MediTrack.MedicalRecords.API.Application.Queries;

/// <summary>
/// Query to get a medical record by ID.
/// </summary>
public sealed record GetMedicalRecordByIdQuery(Guid Id) : IRequest<MedicalRecordResponse?>;

/// <summary>
/// Query to get all medical records for a patient.
/// </summary>
public sealed record GetMedicalRecordsByPatientIdQuery(Guid PatientId)
    : IRequest<IReadOnlyList<MedicalRecordListItemResponse>>;

/// <summary>
/// Query to get medical records by diagnosis code.
/// </summary>
public sealed record GetMedicalRecordsByDiagnosisCodeQuery(string DiagnosisCode)
    : IRequest<IReadOnlyList<MedicalRecordListItemResponse>>;
