using Clara.API.Domain;
using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;

namespace Clara.API.Data;

/// <summary>
/// EF Core DbContext for the Clara service.
/// Uses PostgreSQL with pgvector extension for vector similarity search.
/// </summary>
public sealed class ClaraDbContext : DbContext
{
    public ClaraDbContext(DbContextOptions<ClaraDbContext> options) : base(options)
    {
    }

    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<TranscriptLine> TranscriptLines => Set<TranscriptLine>();
    public DbSet<Suggestion> Suggestions => Set<Suggestion>();
    public DbSet<KnowledgeChunk> KnowledgeChunks => Set<KnowledgeChunk>();
    public DbSet<Document> Documents => Set<Document>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Enable pgvector extension
        modelBuilder.HasPostgresExtension("vector");

        ConfigureSession(modelBuilder);
        ConfigureTranscriptLine(modelBuilder);
        ConfigureSuggestion(modelBuilder);
        ConfigureKnowledgeChunk(modelBuilder);
        ConfigureDocument(modelBuilder);
    }

    private static void ConfigureSession(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Session>(entity =>
        {
            entity.ToTable("sessions");

            entity.HasKey(session => session.Id);
            entity.Property(session => session.Id)
                .HasColumnName("id");

            entity.Property(session => session.DoctorId)
                .HasColumnName("doctor_id")
                .IsRequired();

            entity.Property(session => session.PatientId)
                .HasColumnName("patient_id");

            entity.Property(session => session.StartedAt)
                .HasColumnName("started_at")
                .IsRequired();

            entity.Property(session => session.EndedAt)
                .HasColumnName("ended_at");

            entity.Property(session => session.Status)
                .HasColumnName("status")
                .IsRequired();

            entity.Property(session => session.AudioRecorded)
                .HasColumnName("audio_recorded")
                .HasDefaultValue(false);

            entity.Property(session => session.SpeakerMap)
                .HasColumnName("speaker_map")
                .HasColumnType("jsonb");

            entity.HasMany(session => session.TranscriptLines)
                .WithOne(line => line.Session)
                .HasForeignKey(line => line.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(session => session.Suggestions)
                .WithOne(suggestion => suggestion.Session)
                .HasForeignKey(suggestion => suggestion.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureTranscriptLine(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TranscriptLine>(entity =>
        {
            entity.ToTable("transcript_lines");

            entity.HasKey(line => line.Id);
            entity.Property(line => line.Id)
                .HasColumnName("id");

            entity.Property(line => line.SessionId)
                .HasColumnName("session_id")
                .IsRequired();

            entity.Property(line => line.Speaker)
                .HasColumnName("speaker")
                .IsRequired();

            entity.Property(line => line.Text)
                .HasColumnName("text")
                .IsRequired();

            entity.Property(line => line.Timestamp)
                .HasColumnName("timestamp")
                .IsRequired();

            entity.Property(line => line.Confidence)
                .HasColumnName("confidence");

            entity.HasIndex(line => line.SessionId);
            entity.HasIndex(line => line.Timestamp);
        });
    }

    private static void ConfigureSuggestion(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Suggestion>(entity =>
        {
            entity.ToTable("suggestions");

            entity.HasKey(suggestion => suggestion.Id);
            entity.Property(suggestion => suggestion.Id)
                .HasColumnName("id");

            entity.Property(suggestion => suggestion.SessionId)
                .HasColumnName("session_id")
                .IsRequired();

            entity.Property(suggestion => suggestion.Content)
                .HasColumnName("content")
                .IsRequired();

            entity.Property(suggestion => suggestion.TriggeredAt)
                .HasColumnName("triggered_at")
                .IsRequired();

            entity.Property(suggestion => suggestion.Type)
                .HasColumnName("type")
                .IsRequired();

            entity.Property(suggestion => suggestion.Source)
                .HasColumnName("source")
                .IsRequired();

            entity.Property(suggestion => suggestion.Urgency)
                .HasColumnName("urgency");

            entity.Property(suggestion => suggestion.Confidence)
                .HasColumnName("confidence");

            entity.HasIndex(suggestion => suggestion.SessionId);
            entity.HasIndex(suggestion => suggestion.TriggeredAt);
        });
    }

    private static void ConfigureKnowledgeChunk(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<KnowledgeChunk>(entity =>
        {
            entity.ToTable("knowledge_chunks");

            entity.HasKey(chunk => chunk.Id);
            entity.Property(chunk => chunk.Id)
                .HasColumnName("id");

            entity.Property(chunk => chunk.DocumentName)
                .HasColumnName("document_name")
                .IsRequired();

            entity.Property(chunk => chunk.Content)
                .HasColumnName("content")
                .IsRequired();

            entity.Property(chunk => chunk.Embedding)
                .HasColumnName("embedding")
                .HasColumnType("vector(1536)");

            entity.Property(chunk => chunk.Category)
                .HasColumnName("category");

            entity.Property(chunk => chunk.ChunkIndex)
                .HasColumnName("chunk_index");

            entity.Property(chunk => chunk.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("NOW()");

            entity.Property(chunk => chunk.DocumentId)
                .HasColumnName("document_id");

            // HNSW index for vector similarity search
            entity.HasIndex(chunk => chunk.Embedding)
                .HasMethod("hnsw")
                .HasOperators("vector_cosine_ops")
                .HasStorageParameter("m", 16)
                .HasStorageParameter("ef_construction", 64);

            entity.HasIndex(chunk => chunk.DocumentName);
            entity.HasIndex(chunk => chunk.Category);
        });
    }

    private static void ConfigureDocument(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Document>(entity =>
        {
            entity.ToTable("documents");

            entity.HasKey(document => document.Id);
            entity.Property(document => document.Id)
                .HasColumnName("id");

            entity.Property(document => document.FileName)
                .HasColumnName("file_name")
                .IsRequired();

            entity.Property(document => document.UploadedAt)
                .HasColumnName("uploaded_at")
                .HasDefaultValueSql("NOW()");

            entity.Property(document => document.UploadedBy)
                .HasColumnName("uploaded_by")
                .IsRequired();

            entity.Property(document => document.ChunkCount)
                .HasColumnName("chunk_count");

            entity.Property(document => document.Category)
                .HasColumnName("category");

            entity.HasMany(document => document.Chunks)
                .WithOne(chunk => chunk.Document)
                .HasForeignKey(chunk => chunk.DocumentId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
