using Clara.API.Application.Models;
using FluentValidation;

namespace Clara.API.Application.Validations;

/// <summary>
/// Validates StartSessionRequest.
/// </summary>
public sealed class StartSessionRequestValidator : AbstractValidator<StartSessionRequest>
{
    public StartSessionRequestValidator()
    {
        RuleFor(request => request.PatientId)
            .MaximumLength(128)
            .When(request => request.PatientId != null)
            .WithMessage("Patient ID must not exceed 128 characters");
    }
}
