using Clara.API.Apis;
using FluentValidation;

namespace Clara.API.Application.Validations;

/// <summary>
/// Validates KnowledgeSearchRequest.
/// </summary>
public sealed class KnowledgeSearchRequestValidator : AbstractValidator<KnowledgeSearchRequest>
{
    public KnowledgeSearchRequestValidator()
    {
        RuleFor(request => request.Query)
            .NotEmpty()
            .WithMessage("Query is required")
            .MaximumLength(1000)
            .WithMessage("Query must not exceed 1000 characters");

        RuleFor(request => request.TopK)
            .InclusiveBetween(1, 10)
            .WithMessage("topK must be between 1 and 10");

        RuleFor(request => request.MinScore)
            .InclusiveBetween(0f, 1f)
            .WithMessage("minScore must be between 0 and 1");
    }
}
