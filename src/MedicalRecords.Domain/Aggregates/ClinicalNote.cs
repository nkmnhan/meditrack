using MediTrack.MedicalRecords.Domain.SeedWork;

namespace MediTrack.MedicalRecords.Domain.Aggregates;

/// <summary>
/// Clinical note attached to a medical record.
/// </summary>
public sealed class ClinicalNote : Entity
{
    /// <summary>
    /// Parent medical record ID.
    /// </summary>
    public Guid MedicalRecordId { get; private set; }

    /// <summary>
    /// Type of note (e.g., "Progress Note", "SOAP Note", "Assessment").
    /// </summary>
    public string NoteType { get; private set; } = string.Empty;

    /// <summary>
    /// Content of the clinical note.
    /// </summary>
    public string Content { get; private set; } = string.Empty;

    /// <summary>
    /// ID of the author.
    /// </summary>
    public Guid AuthorId { get; private set; }

    /// <summary>
    /// Name of the author (denormalized).
    /// </summary>
    public string AuthorName { get; private set; } = string.Empty;

    /// <summary>
    /// When the note was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>
    /// When the note was last updated.
    /// </summary>
    public DateTimeOffset? UpdatedAt { get; private set; }

    /// <summary>
    /// EF Core constructor.
    /// </summary>
    private ClinicalNote()
    {
    }

    /// <summary>
    /// Creates a new clinical note.
    /// </summary>
    internal static ClinicalNote Create(
        Guid medicalRecordId,
        string noteType,
        string content,
        Guid authorId,
        string authorName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(noteType);
        ArgumentException.ThrowIfNullOrWhiteSpace(content);
        ArgumentException.ThrowIfNullOrWhiteSpace(authorName);

        return new ClinicalNote
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = medicalRecordId,
            NoteType = noteType,
            Content = content,
            AuthorId = authorId,
            AuthorName = authorName,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    /// <summary>
    /// Updates the note content.
    /// </summary>
    public void UpdateContent(string content)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(content);
        Content = content;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
