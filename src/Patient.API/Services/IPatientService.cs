using MediTrack.Shared.Common;
using Patient.API.Dtos;

namespace Patient.API.Services;

public interface IPatientService
{
    Task<PatientResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PatientListItemResponse>> GetAllAsync(bool includeInactive = false, CancellationToken cancellationToken = default);
    Task<PagedResult<PatientListItemResponse>> GetAllPagedAsync(bool includeInactive = false, int pageNumber = 1, int pageSize = 25, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PatientListItemResponse>> SearchAsync(string searchTerm, CancellationToken cancellationToken = default);
    Task<PatientResponse> CreateAsync(Guid userId, CreatePatientRequest request, CancellationToken cancellationToken = default);
    Task<PatientResponse?> UpdateAsync(Guid id, UpdatePatientRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeactivateAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> ActivateAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> EmailExistsAsync(string email, Guid? excludePatientId = null, CancellationToken cancellationToken = default);
    Task<Guid?> GetUserIdByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default);
    Task<Guid?> GetPatientIdByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> IsOwnedByUserAsync(Guid patientId, Guid userId, CancellationToken cancellationToken = default);
}
