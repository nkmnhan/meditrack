using System.Security.Claims;
using Clara.API.Extensions;
using Clara.API.Services;
using FluentValidation;
using MediTrack.Shared.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Clara.API.Apis;

/// <summary>
/// Asking mode — text Q&A backed by RAG + LLM. No live session required.
/// </summary>
public static class AskApi
{
    public static void MapAskEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ask")
            .WithTags("Ask")
            .RequireAuthorization(policy => policy.RequireRole(UserRoles.Doctor, UserRoles.Admin));

        group.MapPost("/", Ask)
            .WithName("Ask")
            .WithDescription("Ask Clara a clinical question with optional patient context")
            .RequireRateLimiting(RateLimitingExtensions.Policies.Suggest)
            .Produces<AskResponse>()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);
    }

    private static async Task<IResult> Ask(
        [FromBody] AskRequest request,
        [FromServices] IAskService askService,
        [FromServices] IValidator<AskRequest> validator,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        var answer = await askService.AskAsync(request.Question, request.PatientId, cancellationToken);
        return Results.Ok(new AskResponse { Answer = answer });
    }
}

/// <summary>Request to ask Clara a clinical question.</summary>
public sealed record AskRequest
{
    public required string Question { get; init; }
    public string? PatientId { get; init; }
}

/// <summary>Clara's answer to the question.</summary>
public sealed record AskResponse
{
    public required string Answer { get; init; }
}
