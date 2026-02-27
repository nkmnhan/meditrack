using Clara.API.Services;
using MediTrack.Shared.Common;
using Microsoft.AspNetCore.Mvc;

namespace Clara.API.Apis;

/// <summary>
/// Knowledge base search endpoints.
/// </summary>
public static class KnowledgeApi
{
    public static void MapKnowledgeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/knowledge")
            .WithTags("Knowledge")
            .RequireAuthorization(policy => policy.RequireRole(UserRoles.Doctor));

        group.MapPost("/search", SearchKnowledge)
            .WithName("SearchKnowledge")
            .WithDescription("Search the medical knowledge base using semantic similarity")
            .Produces<KnowledgeSearchResponse>()
            .ProducesProblem(StatusCodes.Status400BadRequest);
    }

    private static async Task<IResult> SearchKnowledge(
        [FromBody] KnowledgeSearchRequest request,
        [FromServices] KnowledgeService knowledgeService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
        {
            return Results.BadRequest(new { message = "Query is required" });
        }

        if (request.TopK is <= 0 or > 10)
            return Results.BadRequest(new { error = "topK must be between 1 and 10" });
        if (request.MinScore is <= 0 or > 1)
            return Results.BadRequest(new { error = "minScore must be between 0 and 1" });

        var topK = request.TopK;
        var minScore = request.MinScore;

        var results = await knowledgeService.SearchAsync(
            request.Query,
            topK,
            minScore,
            cancellationToken);

        var response = new KnowledgeSearchResponse
        {
            Query = request.Query,
            Results = results.Select(result => new KnowledgeSearchResultResponse
            {
                ChunkId = result.ChunkId,
                DocumentName = result.DocumentName,
                Content = result.Content,
                Category = result.Category,
                Score = result.Score
            }).ToList()
        };

        return Results.Ok(response);
    }
}

/// <summary>
/// Request to search the knowledge base.
/// </summary>
public sealed record KnowledgeSearchRequest
{
    /// <summary>
    /// Natural language search query.
    /// </summary>
    public required string Query { get; init; }

    /// <summary>
    /// Number of results to return (default: 3, max: 10).
    /// </summary>
    public int TopK { get; init; } = 3;

    /// <summary>
    /// Minimum similarity score threshold (default: 0.7).
    /// </summary>
    public float MinScore { get; init; } = 0.7f;
}

/// <summary>
/// Response from knowledge base search.
/// </summary>
public sealed record KnowledgeSearchResponse
{
    public required string Query { get; init; }
    public required List<KnowledgeSearchResultResponse> Results { get; init; }
}

/// <summary>
/// A single search result.
/// </summary>
public sealed record KnowledgeSearchResultResponse
{
    public required Guid ChunkId { get; init; }
    public required string DocumentName { get; init; }
    public required string Content { get; init; }
    public string? Category { get; init; }
    public required float Score { get; init; }
}
