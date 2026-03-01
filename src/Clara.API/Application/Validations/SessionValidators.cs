using Clara.API.Application.Models;
using FluentValidation;

namespace Clara.API.Application.Validations;

/// <summary>
/// Validates StartSessionRequest.
/// </summary>
public sealed class StartSessionRequestValidator : AbstractValidator<StartSessionRequest>
{
    private static readonly string[] ValidSessionTypes = ["Consultation", "Follow-up", "Review"];

    public StartSessionRequestValidator()
    {
        RuleFor(request => request.PatientId)
            .MaximumLength(128)
            .When(request => request.PatientId != null)
            .WithMessage("Patient ID must not exceed 128 characters");

        RuleFor(request => request.SessionType)
            .Must(sessionType => ValidSessionTypes.Contains(sessionType, StringComparer.OrdinalIgnoreCase))
            .WithMessage($"SessionType must be one of: {string.Join(", ", ValidSessionTypes)}");
    }
}
