using FluentAssertions;
using Microsoft.AspNetCore.SignalR.Client;

namespace Clara.IntegrationTests;

/// <summary>
/// Integration tests for the SessionHub SignalR endpoint.
/// </summary>
public sealed class SignalRHubTests : IClassFixture<ClaraApiFactory>
{
    private readonly ClaraApiFactory _factory;

    public SignalRHubTests(ClaraApiFactory factory)
    {
        _factory = factory;
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
        var hubConnection = new HubConnectionBuilder()
            .WithUrl(
                "http://localhost/sessionHub",
                options => options.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler())
            .Build();

        await hubConnection.StartAsync();

        var sessionId = Guid.NewGuid().ToString();
        var joinAction = async () => await hubConnection.InvokeAsync("JoinSession", sessionId);

        await joinAction.Should().NotThrowAsync();

        await hubConnection.StopAsync();
    }
}
