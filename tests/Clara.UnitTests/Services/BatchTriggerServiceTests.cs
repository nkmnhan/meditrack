using Clara.API.Application.Models;
using Clara.API.Domain;
using Clara.API.Hubs;
using Clara.API.Services;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
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
    private readonly IServiceScope _scope;
    private readonly IServiceProvider _scopedProvider;
    private readonly ISuggestionService _suggestionService;

    public BatchTriggerServiceTests()
    {
        _scopeFactory = Substitute.For<IServiceScopeFactory>();
        _scope = Substitute.For<IServiceScope>();
        _scopedProvider = Substitute.For<IServiceProvider>();
        _suggestionService = Substitute.For<ISuggestionService>();

        // Wire up the scope factory chain for positive-path tests
        _scopeFactory.CreateScope().Returns(_scope);
        _scope.ServiceProvider.Returns(_scopedProvider);
        _scopedProvider.GetService(typeof(ISuggestionService)).Returns(_suggestionService);
        _scopedProvider.GetService(typeof(IHubContext<SessionHub>))
            .Returns(Substitute.For<IHubContext<SessionHub>>());

        var options = Options.Create(new BatchTriggerOptions());
        _service = new BatchTriggerService(NullLogger<BatchTriggerService>.Instance, _scopeFactory, options);
    }

    // --- Doctor utterances should never trigger ---

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

    // --- Below threshold should not trigger ---

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

    // --- Urgent keywords ---

    [Fact]
    public async Task OnTranscriptLineAddedAsync_WithUrgentKeyword_FromPatient_ShouldTriggerImmediately()
    {
        var sessionId = Guid.NewGuid().ToString();
        _suggestionService.GenerateSuggestionsAsync(Arg.Any<Guid>(), Arg.Any<SuggestionSourceEnum>(), Arg.Any<CancellationToken>())
            .Returns([]);

        var urgentLine = CreateTranscriptLine(SpeakerRole.Patient, "I have severe chest pain");

        await _service.OnTranscriptLineAddedAsync(sessionId, urgentLine);

        _scopeFactory.Received(1).CreateScope();
    }

    [Fact]
    public async Task OnTranscriptLineAddedAsync_WithUrgentKeyword_FromDoctor_ShouldNotTrigger()
    {
        var sessionId = Guid.NewGuid().ToString();
        var doctorLine = CreateTranscriptLine(SpeakerRole.Doctor, "Tell me about your chest pain");

        await _service.OnTranscriptLineAddedAsync(sessionId, doctorLine);

        _scopeFactory.DidNotReceive().CreateScope();
    }

    [Fact]
    public async Task OnTranscriptLineAddedAsync_WithUrgentKeyword_CaseInsensitive_ShouldTrigger()
    {
        var sessionId = Guid.NewGuid().ToString();
        _suggestionService.GenerateSuggestionsAsync(Arg.Any<Guid>(), Arg.Any<SuggestionSourceEnum>(), Arg.Any<CancellationToken>())
            .Returns([]);

        var urgentLine = CreateTranscriptLine(SpeakerRole.Patient, "I CAN'T BREATHE");

        await _service.OnTranscriptLineAddedAsync(sessionId, urgentLine);

        _scopeFactory.Received(1).CreateScope();
    }

    // --- Custom options ---

    [Fact]
    public async Task OnTranscriptLineAddedAsync_WithCustomThreshold_ShouldRespectConfig()
    {
        var customOptions = Options.Create(new BatchTriggerOptions { PatientUtteranceThreshold = 3 });
        using var customService = new BatchTriggerService(
            NullLogger<BatchTriggerService>.Instance, _scopeFactory, customOptions);

        var sessionId = Guid.NewGuid().ToString();
        _suggestionService.GenerateSuggestionsAsync(Arg.Any<Guid>(), Arg.Any<SuggestionSourceEnum>(), Arg.Any<CancellationToken>())
            .Returns([]);

        var patientLine = CreateTranscriptLine(SpeakerRole.Patient, "I feel tired");

        // 2 utterances — should not trigger
        for (int i = 0; i < 2; i++)
            await customService.OnTranscriptLineAddedAsync(sessionId, patientLine);

        _scopeFactory.DidNotReceive().CreateScope();

        // 3rd utterance — should trigger
        await customService.OnTranscriptLineAddedAsync(sessionId, patientLine);

        _scopeFactory.Received(1).CreateScope();
    }

    // --- Cleanup and dispose ---

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
