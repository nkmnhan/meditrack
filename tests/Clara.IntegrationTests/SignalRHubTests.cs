using System.Net.Http.Json;
using Clara.API.Application.Models;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR.Client;
using Xunit;

namespace Clara.IntegrationTests;

/// <summary>
/// Integration tests for the SessionHub SignalR endpoint.
/// </summary>
public sealed class SignalRHubTests : IClassFixture<ClaraApiFactory>
{
    private readonly ClaraApiFactory _factory;
    private readonly HttpClient _client;

    public SignalRHubTests(ClaraApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Connect_ToSessionHub_SucceedsWithoutAuthentication()
    {
        // Uses the test server's in-process HTTP handler so no real network is involved
        var hubConnection = new HubConnectionBuilder()
            .WithUrl(
                "http://localhost/sessionHub",
                options => options.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler())
            .Build();

        await hubConnection.StartAsync();

        hubConnection.State.Should().Be(HubConnectionState.Connected);

        await hubConnection.StopAsync();
    }

    [Fact]
    public async Task JoinSession_WithValidSessionId_DoesNotThrow()
    {
        // Create a real session first via the REST API
        var startResponse = await _client.PostAsJsonAsync("/api/sessions", new StartSessionRequest
        {
            SessionType = "Consultation",
        });
        var session = await startResponse.Content.ReadFromJsonAsync<SessionResponse>();

        var hubConnection = new HubConnectionBuilder()
            .WithUrl(
                "http://localhost/sessionHub",
                options =>
                {
                    options.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
                    options.Headers.Add("Authorization", $"Bearer {TestAuthHandler.SchemeName}");
                })
            .Build();

        await hubConnection.StartAsync();

        var joinAction = async () => await hubConnection.InvokeAsync("JoinSession", session!.Id.ToString());

        await joinAction.Should().NotThrowAsync();

        await hubConnection.StopAsync();
    }
}
