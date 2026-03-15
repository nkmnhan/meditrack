using MediTrack.MedicalRecords.Domain.SeedWork;

namespace MediTrack.MedicalRecords.Domain.Aggregates;

/// <summary>
/// File attachment linked to a medical record.
/// </summary>
public sealed class Attachment : Entity
{
    /// <summary>
    /// Parent medical record ID.
    /// </summary>
    public Guid MedicalRecordId { get; private set; }

    /// <summary>
    /// Original file name.
    /// </summary>
    public string FileName { get; private set; } = string.Empty;

    /// <summary>
    /// MIME content type.
    /// </summary>
    public string ContentType { get; private set; } = string.Empty;

    /// <summary>
    /// File size in bytes.
    /// </summary>
    public long FileSizeBytes { get; private set; }

    /// <summary>
    /// URL to the stored file.
    /// </summary>
    public string StorageUrl { get; private set; } = string.Empty;

    /// <summary>
    /// Optional description.
    /// </summary>
    public string? Description { get; private set; }

    /// <summary>
    /// ID of who uploaded the file.
    /// </summary>
    public Guid UploadedById { get; private set; }

    /// <summary>
    /// Name of who uploaded the file (denormalized).
    /// </summary>
    public string UploadedByName { get; private set; } = string.Empty;

    /// <summary>
    /// When the file was uploaded.
    /// </summary>
    public DateTimeOffset UploadedAt { get; private set; }

    /// <summary>
    /// EF Core constructor.
    /// </summary>
    private Attachment()
    {
    }

    /// <summary>
    /// Creates a new attachment.
    /// </summary>
    internal static Attachment Create(
        Guid medicalRecordId,
        string fileName,
        string contentType,
        long fileSizeBytes,
        string storageUrl,
        string? description,
        Guid uploadedById,
        string uploadedByName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(fileName);
        ArgumentException.ThrowIfNullOrWhiteSpace(contentType);
        ArgumentException.ThrowIfNullOrWhiteSpace(storageUrl);
        ArgumentException.ThrowIfNullOrWhiteSpace(uploadedByName);

        if (fileSizeBytes <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(fileSizeBytes), "File size must be positive.");
        }

        return new Attachment
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = medicalRecordId,
            FileName = fileName,
            ContentType = contentType,
            FileSizeBytes = fileSizeBytes,
            StorageUrl = storageUrl,
            Description = description,
            UploadedById = uploadedById,
            UploadedByName = uploadedByName,
            UploadedAt = DateTimeOffset.UtcNow
        };
    }

    /// <summary>
    /// File size formatted for display.
    /// </summary>
    public string FileSizeFormatted
    {
        get
        {
            string[] sizes = ["B", "KB", "MB", "GB"];
            var order = 0;
            double size = FileSizeBytes;

            while (size >= 1024 && order < sizes.Length - 1)
            {
                order++;
                size /= 1024;
            }

            return $"{size:0.##} {sizes[order]}";
        }
    }
}
