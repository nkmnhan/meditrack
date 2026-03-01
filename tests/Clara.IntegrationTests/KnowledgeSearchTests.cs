using System.Net;
using System.Net.Http.Json;
using Clara.API.Application.Models;
using FluentAssertions;

namespace Clara.IntegrationTests;

/// <summary>
/// Integration tests for the knowledge search endpoint.
/// </summary>
public sealed class KnowledgeSearchTests : IClassFixture<ClaraApiFactory>
{
    private readonly HttpClient _client;

    public KnowledgeSearchTests(ClaraApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task SearchKnowledge_WithEmptyKnowledgeBase_ReturnsEmptyResults()
    {
        var request = new { query = "chest pain", topK = 5 };

        var response = await _client.PostAsJsonAsync("/api/knowledge/search", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<KnowledgeSearchResponse>();
        result.Should().NotBeNull();
        result!.Results.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchKnowledge_WithBlankQuery_Returns400()
    {
        var request = new { query = "" };

        var response = await _client.PostAsJsonAsync("/api/knowledge/search", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
