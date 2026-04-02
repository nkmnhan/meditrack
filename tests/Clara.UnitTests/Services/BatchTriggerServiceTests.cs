using Clara.API.Application.Models;
using Clara.API.Domain;
using Clara.API.Services;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using Xunit;

namespace Clara.UnitTests.Services;

public sealed class BatchTriggerServiceTests : IDisposable
{
    private readonly BatchTriggerService _service;
    private readonly IServiceScopeFactory _scopeFactory;

    public BatchTriggerServiceTests()
    {
        _scopeFactory = Substitute.For<IServiceScopeFactory>();
        var options = Options.Create(new BatchTriggerOptions());
        _service = new BatchTriggerService(NullLogger<BatchTriggerService>.Instance, _scopeFactory, options);
    }

    [Fact]
    public async Task OnTranscriptLineAddedAsync_WithDoctorSpeaker_ShouldNotTrigger()
    {
        var sessionId = Guid.NewGuid().ToString();
        var doctorLine = CreateTranscriptLine(SpeakerRole.Doctor, "How are you?");

        for (int i = 0; i < 10; i++)
        {
            await _service.OnTranscriptLineAddedAsync(sessionId, doctorLine);
        }

        _scopeFactory.DidNotReceive().CreateScope();
    }

    [Fact]
    public async Task OnTranscriptLineAddedAsync_WithLessThan5PatientUtterances_ShouldNotTrigger()
    {
        var sessionId = Guid.NewGuid().ToString();
        var patientLine = CreateTranscriptLine(SpeakerRole.Patient, "I feel dizzy");

        for (int i = 0; i < 4; i++)
        {
            await _service.OnTranscriptLineAddedAsync(sessionId, patientLine);
        }

        _scopeFactory.DidNotReceive().CreateScope();
    }

    [Fact]
    public void CleanupSession_WithNonExistentSession_ShouldNotThrow()
    {
        var action = () => _service.CleanupSession("non-existent-session");
        action.Should().NotThrow();
    }

    [Fact]
    public void Dispose_ShouldNotThrow()
    {
        var action = () => _service.Dispose();
        action.Should().NotThrow();
    }

    [Fact]
    public void Dispose_CalledTwice_ShouldNotThrow()
    {
        _service.Dispose();
        var action = () => _service.Dispose();
        action.Should().NotThrow();
    }

    private static TranscriptLine CreateTranscriptLine(string speaker, string text)
    {
        return new TranscriptLine
        {
            Id = Guid.NewGuid(),
            SessionId = Guid.NewGuid(),
            Speaker = speaker,
            Text = text,
            Timestamp = DateTimeOffset.UtcNow
        };
    }

    public void Dispose()
    {
        _service.Dispose();
    }
}
