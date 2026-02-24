namespace MediTrack.MedicalRecords.Domain.SeedWork;

/// <summary>
/// Base class for all domain entities.
/// </summary>
public abstract class Entity
{
    private int? _requestedHashCode;
    private Guid _id;

    /// <summary>
    /// Unique identifier for the entity.
    /// </summary>
    public virtual Guid Id
    {
        get => _id;
        protected set => _id = value;
    }

    private static readonly IReadOnlyCollection<IDomainEvent> EmptyDomainEvents =
        new List<IDomainEvent>().AsReadOnly();

    private List<IDomainEvent>? _domainEvents;

    /// <summary>
    /// Domain events raised by this entity.
    /// </summary>
    public IReadOnlyCollection<IDomainEvent> DomainEvents => _domainEvents?.AsReadOnly() ?? EmptyDomainEvents;

    /// <summary>
    /// Adds a domain event to this entity.
    /// </summary>
    public void AddDomainEvent(IDomainEvent eventItem)
    {
        _domainEvents ??= [];
        _domainEvents.Add(eventItem);
    }

    /// <summary>
    /// Removes a domain event from this entity.
    /// </summary>
    public void RemoveDomainEvent(IDomainEvent eventItem)
    {
        _domainEvents?.Remove(eventItem);
    }

    /// <summary>
    /// Clears all domain events from this entity.
    /// </summary>
    public void ClearDomainEvents()
    {
        _domainEvents?.Clear();
    }

    /// <summary>
    /// Indicates whether this is a transient (not yet persisted) entity.
    /// </summary>
    public bool IsTransient()
    {
        return Id == default;
    }

    public override bool Equals(object? obj)
    {
        if (obj is not Entity entity)
        {
            return false;
        }

        if (ReferenceEquals(this, obj))
        {
            return true;
        }

        if (GetType() != obj.GetType())
        {
            return false;
        }

        if (entity.IsTransient() || IsTransient())
        {
            return false;
        }

        return entity.Id == Id;
    }

    public override int GetHashCode()
    {
        if (!IsTransient())
        {
            _requestedHashCode ??= Id.GetHashCode() ^ 31;
            return _requestedHashCode.Value;
        }

        return base.GetHashCode();
    }

    public static bool operator ==(Entity? left, Entity? right)
    {
        if (left is null)
        {
            return right is null;
        }

        return left.Equals(right);
    }

    public static bool operator !=(Entity? left, Entity? right)
    {
        return !(left == right);
    }
}
