using System.Net;
using System.Net.Http.Json;
using Clara.API.Application.Models;
using FluentAssertions;

namespace Clara.IntegrationTests;

/// <summary>
/// Integration tests for the session lifecycle: start → get → end.
/// </summary>
public sealed class SessionLifecycleTests : IClassFixture<ClaraApiFactory>
{
    private readonly HttpClient _client;

    public SessionLifecycleTests(ClaraApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task StartSession_WithValidRequest_Returns201WithSessionId()
    {
        var request = new StartSessionRequest
        {
            PatientId = null,
            AudioRecorded = true,
            SessionType = "Consultation",
        };

        var response = await _client.PostAsJsonAsync("/api/sessions", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var session = await response.Content.ReadFromJsonAsync<SessionResponse>();
        session.Should().NotBeNull();
        session!.Id.Should().NotBeEmpty();
        session.Status.Should().Be("active");
        session.SessionType.Should().Be("Consultation");
    }

    [Fact]
    public async Task GetSession_WithUnknownId_Returns404()
    {
        var unknownId = Guid.NewGuid();

        var response = await _client.GetAsync($"/api/sessions/{unknownId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task EndSession_AfterStarting_Returns200WithCompletedStatus()
    {
        // Start a session
        var startResponse = await _client.PostAsJsonAsync("/api/sessions", new StartSessionRequest
        {
            SessionType = "Follow-up",
        });
        startResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var session = await startResponse.Content.ReadFromJsonAsync<SessionResponse>();

        // End the session
        var endResponse = await _client.PostAsync($"/api/sessions/{session!.Id}/end", null);

        endResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var endedSession = await endResponse.Content.ReadFromJsonAsync<SessionResponse>();
        endedSession!.Status.Should().Be("completed");
        endedSession.EndedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task EndSession_WhenAlreadyEnded_Returns400()
    {
        // Start and immediately end a session
        var startResponse = await _client.PostAsJsonAsync("/api/sessions", new StartSessionRequest());
        var session = await startResponse.Content.ReadFromJsonAsync<SessionResponse>();
        await _client.PostAsync($"/api/sessions/{session!.Id}/end", null);

        // Try to end it again
        var secondEndResponse = await _client.PostAsync($"/api/sessions/{session.Id}/end", null);

        secondEndResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
