using Clara.API.Data;
using Clara.API.Domain;
using Clara.API.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace Clara.UnitTests.Services;

/// <summary>
/// Unit tests for AgentMemoryService.
/// Note: CosineDistance is a pgvector operation not supported by InMemory provider.
/// RecallSimilarMemoriesAsync vector-search path is covered in Clara.IntegrationTests.
/// These tests cover CRUD, access-metadata updates, and the embedding-failure fallback.
/// </summary>
public sealed class AgentMemoryServiceTests : IDisposable
{
    private readonly ClaraDbContext _db;
    private readonly IEmbeddingGenerator<string, Embedding<float>> _embeddingGenerator;
    private readonly AgentMemoryService _service;

    public AgentMemoryServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<ClaraDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new ClaraDbContext(dbOptions);

        _embeddingGenerator = Substitute.For<IEmbeddingGenerator<string, Embedding<float>>>();

        // Default: return a valid 1536-dim embedding
        var floatArray = new float[1536];
        var embedding = new Embedding<float>(floatArray);
        _embeddingGenerator
            .GenerateAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<EmbeddingGenerationOptions?>(), Arg.Any<CancellationToken>())
            .Returns(new GeneratedEmbeddings<Embedding<float>>([embedding]));

        _service = new AgentMemoryService(
            _db,
            _embeddingGenerator,
            NullLogger<AgentMemoryService>.Instance);
    }

    public void Dispose() => _db.Dispose();

    // -------------------------------------------------------------------------
    // StoreMemoryAsync — happy path
    // -------------------------------------------------------------------------

    [Fact]
    public async Task StoreMemoryAsync_WithValidInputs_PersistsMemoryToDatabase()
    {
        // Arrange
        var sessionId = Guid.NewGuid();

        // Act
        var stored = await _service.StoreMemoryAsync(
            agentId: "clara-doctor",
            sessionId: sessionId,
            patientId: "patient-42",
            content: "Patient has recurring migraines triggered by stress.",
            memoryType: "episodic");

        // Assert
        var fromDb = await _db.AgentMemories.FindAsync(stored.Id);
        fromDb.Should().NotBeNull();
        fromDb!.AgentId.Should().Be("clara-doctor");
        fromDb.SessionId.Should().Be(sessionId);
        fromDb.PatientId.Should().Be("patient-42");
        fromDb.Content.Should().Be("Patient has recurring migraines triggered by stress.");
        fromDb.MemoryType.Should().Be("episodic");
    }

    [Fact]
    public async Task StoreMemoryAsync_WithValidInputs_SetsCreatedAtToUtcNow()
    {
        // Arrange
        var beforeStore = DateTimeOffset.UtcNow;

        // Act
        var stored = await _service.StoreMemoryAsync(
            agentId: "clara-doctor",
            sessionId: Guid.NewGuid(),
            patientId: null,
            content: "General observation.",
            memoryType: "semantic");

        // Assert
        stored.CreatedAt.Should().BeOnOrAfter(beforeStore);
        stored.CreatedAt.Should().BeOnOrBefore(DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task StoreMemoryAsync_WithValidInputs_CallsEmbeddingGeneratorWithContent()
    {
        // Arrange
        var content = "Patient reports chest tightness after exertion.";

        // Act
        await _service.StoreMemoryAsync(
            agentId: "clara-doctor",
            sessionId: Guid.NewGuid(),
            patientId: "patient-7",
            content: content,
            memoryType: "episodic");

        // Assert
        await _embeddingGenerator
            .Received(1)
            .GenerateAsync(
                Arg.Is<IEnumerable<string>>(inputs => inputs.Contains(content)),
                Arg.Any<EmbeddingGenerationOptions?>(),
                Arg.Any<CancellationToken>());
    }

    // -------------------------------------------------------------------------
    // StoreMemoryAsync — embedding failure is non-fatal
    // -------------------------------------------------------------------------

    [Fact]
    public async Task StoreMemoryAsync_WhenEmbeddingGeneratorThrows_StoresMemoryWithoutVector()
    {
        // Arrange
        _embeddingGenerator
            .GenerateAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<EmbeddingGenerationOptions?>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Embedding service unavailable"));

        // Act
        var stored = await _service.StoreMemoryAsync(
            agentId: "clara-doctor",
            sessionId: Guid.NewGuid(),
            patientId: "patient-42",
            content: "Allergic to penicillin — confirmed by previous reaction.",
            memoryType: "semantic");

        // Assert — record must be persisted even without a vector
        var fromDb = await _db.AgentMemories.FindAsync(stored.Id);
        fromDb.Should().NotBeNull();
        fromDb!.Embedding.Should().BeNull();
        fromDb.Content.Should().Be("Allergic to penicillin — confirmed by previous reaction.");
    }

    // -------------------------------------------------------------------------
    // RecallMemoriesForPatientAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task RecallMemoriesForPatientAsync_ReturnsOnlyMemoriesForMatchingAgentAndPatient()
    {
        // Arrange — seed three memories; only two should be recalled
        await SeedMemoryAsync("clara-doctor", "patient-1", "Memory A");
        await SeedMemoryAsync("clara-doctor", "patient-1", "Memory B");
        await SeedMemoryAsync("clara-doctor", "patient-2", "Memory C");  // wrong patient
        await SeedMemoryAsync("patient-companion", "patient-1", "Memory D");  // wrong agent

        // Act
        var recalled = await _service.RecallMemoriesForPatientAsync(
            agentId: "clara-doctor",
            patientId: "patient-1",
            limit: 10);

        // Assert
        recalled.Should().HaveCount(2);
        recalled.Should().OnlyContain(m => m.AgentId == "clara-doctor" && m.PatientId == "patient-1");
    }

    [Fact]
    public async Task RecallMemoriesForPatientAsync_RespectsLimitParameter()
    {
        // Arrange — seed five memories
        for (var i = 0; i < 5; i++)
        {
            await SeedMemoryAsync("clara-doctor", "patient-1", $"Memory {i}");
        }

        // Act
        var recalled = await _service.RecallMemoriesForPatientAsync(
            agentId: "clara-doctor",
            patientId: "patient-1",
            limit: 3);

        // Assert
        recalled.Should().HaveCount(3);
    }

    [Fact]
    public async Task RecallMemoriesForPatientAsync_UpdatesAccessMetadataOnRecall()
    {
        // Arrange
        var memory = await SeedMemoryAsync("clara-doctor", "patient-1", "Initial observation.");
        var originalAccessCount = memory.AccessCount;
        var beforeRecall = DateTimeOffset.UtcNow;

        // Act
        await _service.RecallMemoriesForPatientAsync(
            agentId: "clara-doctor",
            patientId: "patient-1",
            limit: 5);

        // Assert — re-fetch from DB to verify persisted update
        await _db.Entry(memory).ReloadAsync();
        memory.AccessCount.Should().Be(originalAccessCount + 1);
        memory.LastAccessedAt.Should().BeOnOrAfter(beforeRecall);
    }

    [Fact]
    public async Task RecallMemoriesForPatientAsync_WithNoMatchingMemories_ReturnsEmptyList()
    {
        // Act
        var recalled = await _service.RecallMemoriesForPatientAsync(
            agentId: "clara-doctor",
            patientId: "nonexistent-patient",
            limit: 5);

        // Assert
        recalled.Should().BeEmpty();
    }

    [Fact]
    public async Task RecallMemoriesForPatientAsync_ReturnsMemoriesOrderedByLastAccessedAtDescending()
    {
        // Arrange — seed with artificially spread timestamps
        var now = DateTimeOffset.UtcNow;

        _db.AgentMemories.AddRange(
            new AgentMemory
            {
                AgentId = "clara-doctor",
                SessionId = Guid.NewGuid(),
                PatientId = "patient-1",
                Content = "Older memory",
                MemoryType = "episodic",
                LastAccessedAt = now.AddHours(-2)
            },
            new AgentMemory
            {
                AgentId = "clara-doctor",
                SessionId = Guid.NewGuid(),
                PatientId = "patient-1",
                Content = "Recent memory",
                MemoryType = "episodic",
                LastAccessedAt = now.AddHours(-1)
            });
        await _db.SaveChangesAsync();

        // Act
        var recalled = await _service.RecallMemoriesForPatientAsync(
            agentId: "clara-doctor",
            patientId: "patient-1",
            limit: 10);

        // Assert
        recalled[0].Content.Should().Be("Recent memory");
        recalled[1].Content.Should().Be("Older memory");
    }

    // -------------------------------------------------------------------------
    // RecallSimilarMemoriesAsync — fallback path (no embedding support in InMemory DB)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task RecallSimilarMemoriesAsync_WhenEmbeddingFails_FallsBackToPatientRecall()
    {
        // Arrange
        _embeddingGenerator
            .GenerateAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<EmbeddingGenerationOptions?>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Embedding service unavailable"));

        await SeedMemoryAsync("clara-doctor", "patient-1", "Stored observation about patient.");

        // Act — embedding fails, should fall back to patient-based recall
        var recalled = await _service.RecallSimilarMemoriesAsync(
            agentId: "clara-doctor",
            query: "patient observations",
            patientId: "patient-1",
            limit: 5);

        // Assert — fallback returns the seeded record
        recalled.Should().HaveCount(1);
        recalled[0].PatientId.Should().Be("patient-1");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private async Task<AgentMemory> SeedMemoryAsync(string agentId, string patientId, string content)
    {
        var memory = new AgentMemory
        {
            AgentId = agentId,
            SessionId = Guid.NewGuid(),
            PatientId = patientId,
            Content = content,
            MemoryType = "episodic"
        };
        _db.AgentMemories.Add(memory);
        await _db.SaveChangesAsync();
        return memory;
    }
}
