using MediTrack.MedicalRecords.Domain.Aggregates;
using MediTrack.MedicalRecords.Domain.SeedWork;
using Microsoft.EntityFrameworkCore;

namespace MediTrack.MedicalRecords.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for MedicalRecord aggregate.
/// </summary>
public sealed class MedicalRecordRepository : IMedicalRecordRepository
{
    private readonly MedicalRecordsDbContext _dbContext;

    public MedicalRecordRepository(MedicalRecordsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public IUnitOfWork UnitOfWork => _dbContext;

    public MedicalRecord Add(MedicalRecord medicalRecord)
    {
        return _dbContext.MedicalRecords.Add(medicalRecord).Entity;
    }

    public void Update(MedicalRecord medicalRecord)
    {
        _dbContext.Entry(medicalRecord).State = EntityState.Modified;
    }

    public async Task<MedicalRecord?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.MedicalRecords
            .Include(r => r.ClinicalNotes)
            .Include(r => r.Prescriptions)
            .Include(r => r.VitalSigns)
            .Include(r => r.Attachments)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
    }

    public async Task<MedicalRecord?> GetByIdReadOnlyAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.MedicalRecords
            .AsNoTracking()
            .Include(r => r.ClinicalNotes)
            .Include(r => r.Prescriptions)
            .Include(r => r.VitalSigns)
            .Include(r => r.Attachments)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<MedicalRecord>> GetByPatientIdAsync(
        Guid patientId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.MedicalRecords
            .AsNoTracking()
            .Include(r => r.ClinicalNotes)
            .Include(r => r.Prescriptions)
            .Include(r => r.VitalSigns)
            .Where(r => r.PatientId == patientId)
            .OrderByDescending(r => r.RecordedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<MedicalRecord>> GetSummariesByPatientIdAsync(
        Guid patientId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.MedicalRecords
            .AsNoTracking()
            .Where(r => r.PatientId == patientId)
            .OrderByDescending(r => r.RecordedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<MedicalRecord>> GetByDiagnosisCodeAsync(
        string diagnosisCode,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.MedicalRecords
            .AsNoTracking()
            .Where(r => r.DiagnosisCode == diagnosisCode)
            .OrderByDescending(r => r.RecordedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.MedicalRecords
            .AnyAsync(r => r.Id == id, cancellationToken);
    }
}
