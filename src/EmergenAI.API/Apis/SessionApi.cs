using System.Security.Claims;
using EmergenAI.API.Application.Models;
using EmergenAI.API.Extensions;
using EmergenAI.API.Services;
using FluentValidation;
using MediTrack.Shared.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EmergenAI.API.Apis;

/// <summary>
/// Session management endpoints.
/// </summary>
public static class SessionApi
{
    public static void MapSessionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sessions")
            .WithTags("Sessions")
            .RequireAuthorization(policy => policy.RequireRole(UserRoles.Doctor));

        group.MapPost("/", StartSession)
            .WithName("StartSession")
            .WithDescription("Start a new clinical session")
            .RequireRateLimiting(RateLimitingExtensions.Policies.SessionCreate)
            .Produces<SessionResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        group.MapGet("/{id:guid}", GetSession)
            .WithName("GetSession")
            .WithDescription("Get session details including transcript and suggestions")
            .Produces<SessionResponse>()
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/end", EndSession)
            .WithName("EndSession")
            .WithDescription("End an active session")
            .Produces<SessionResponse>()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest);
    }

    private static async Task<IResult> StartSession(
        [FromBody] StartSessionRequest request,
        [FromServices] SessionService sessionService,
        [FromServices] IValidator<StartSessionRequest> validator,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        var doctorId = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("User ID not found in claims");

        var session = await sessionService.StartSessionAsync(doctorId, request, cancellationToken);

        return Results.Created($"/api/sessions/{session.Id}", session);
    }

    private static async Task<IResult> GetSession(
        Guid id,
        [FromServices] SessionService sessionService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        var doctorId = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("User ID not found in claims");

        var session = await sessionService.GetSessionAsync(id, doctorId, cancellationToken);

        return session is null
            ? Results.NotFound(new { message = $"Session {id} not found" })
            : Results.Ok(session);
    }

    private static async Task<IResult> EndSession(
        Guid id,
        [FromServices] SessionService sessionService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        var doctorId = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("User ID not found in claims");

        try
        {
            var session = await sessionService.EndSessionAsync(id, doctorId, cancellationToken);
            return Results.Ok(session);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound(new { message = $"Session {id} not found" });
        }
        catch (InvalidOperationException exception)
        {
            return Results.BadRequest(new { message = exception.Message });
        }
    }
}
