using Clara.API.Apis;
using FluentValidation;

namespace Clara.API.Application.Validations;

public sealed class AskRequestValidator : AbstractValidator<AskRequest>
{
    public AskRequestValidator()
    {
        RuleFor(x => x.Question)
            .NotEmpty().WithMessage("Question is required.")
            .MaximumLength(2000).WithMessage("Question must not exceed 2000 characters.");

        RuleFor(x => x.PatientId)
            .Must(value => Guid.TryParse(value, out _))
            .WithMessage("PatientId must be a valid GUID.")
            .When(x => x.PatientId is not null);
    }
}
