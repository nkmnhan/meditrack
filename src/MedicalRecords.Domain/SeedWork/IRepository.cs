namespace MediTrack.MedicalRecords.Domain.SeedWork;

/// <summary>
/// Base interface for repositories.
/// </summary>
/// <typeparam name="T">The aggregate root type.</typeparam>
public interface IRepository<T> where T : IAggregateRoot
{
    /// <summary>
    /// Gets the unit of work for this repository.
    /// </summary>
    IUnitOfWork UnitOfWork { get; }
}
