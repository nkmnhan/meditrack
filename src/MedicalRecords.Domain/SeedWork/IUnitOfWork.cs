namespace MediTrack.MedicalRecords.Domain.SeedWork;

/// <summary>
/// Unit of work pattern interface for coordinating transactional persistence.
/// </summary>
public interface IUnitOfWork : IDisposable
{
    /// <summary>
    /// Saves all changes made in the unit of work.
    /// </summary>
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves all changes and dispatches domain events.
    /// </summary>
    Task<bool> SaveEntitiesAsync(CancellationToken cancellationToken = default);
}
