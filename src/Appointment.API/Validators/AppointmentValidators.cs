using Appointment.API.Dtos;
using FluentValidation;

namespace Appointment.API.Validators;

/// <summary>
/// Validator for CreateAppointmentRequest.
/// </summary>
public sealed class CreateAppointmentRequestValidator : AbstractValidator<CreateAppointmentRequest>
{
    public CreateAppointmentRequestValidator()
    {
        RuleFor(request => request.PatientId)
            .NotEmpty()
            .WithMessage("Patient ID is required.");

        RuleFor(request => request.PatientName)
            .NotEmpty()
            .WithMessage("Patient name is required.")
            .MaximumLength(200)
            .WithMessage("Patient name cannot exceed 200 characters.");

        RuleFor(request => request.PatientEmail)
            .NotEmpty()
            .WithMessage("Patient email is required.")
            .EmailAddress()
            .WithMessage("Invalid email address format.")
            .MaximumLength(256)
            .WithMessage("Email cannot exceed 256 characters.");

        RuleFor(request => request.ProviderId)
            .NotEmpty()
            .WithMessage("Provider ID is required.");

        RuleFor(request => request.ProviderName)
            .NotEmpty()
            .WithMessage("Provider name is required.")
            .MaximumLength(200)
            .WithMessage("Provider name cannot exceed 200 characters.");

        RuleFor(request => request.ScheduledDateTime)
            .NotEmpty()
            .WithMessage("Scheduled date and time is required.")
            .GreaterThan(DateTime.UtcNow)
            .WithMessage("Scheduled date and time must be in the future.");

        RuleFor(request => request.DurationMinutes)
            .GreaterThan(0)
            .WithMessage("Duration must be greater than 0.")
            .LessThanOrEqualTo(480)
            .WithMessage("Duration cannot exceed 8 hours (480 minutes).");

        RuleFor(request => request.Type)
            .IsInEnum()
            .WithMessage("Invalid appointment type.");

        RuleFor(request => request.Reason)
            .NotEmpty()
            .WithMessage("Reason for visit is required.")
            .MaximumLength(500)
            .WithMessage("Reason cannot exceed 500 characters.");

        RuleFor(request => request.PatientNotes)
            .MaximumLength(2000)
            .WithMessage("Patient notes cannot exceed 2000 characters.")
            .When(request => request.PatientNotes is not null);

        RuleFor(request => request.Location)
            .MaximumLength(200)
            .WithMessage("Location cannot exceed 200 characters.")
            .When(request => request.Location is not null);
    }
}

/// <summary>
/// Validator for UpdateAppointmentRequest.
/// </summary>
public sealed class UpdateAppointmentRequestValidator : AbstractValidator<UpdateAppointmentRequest>
{
    public UpdateAppointmentRequestValidator()
    {
        RuleFor(request => request.ScheduledDateTime)
            .GreaterThan(DateTime.UtcNow)
            .WithMessage("Scheduled date and time must be in the future.")
            .When(request => request.ScheduledDateTime.HasValue);

        RuleFor(request => request.DurationMinutes)
            .GreaterThan(0)
            .WithMessage("Duration must be greater than 0.")
            .LessThanOrEqualTo(480)
            .WithMessage("Duration cannot exceed 8 hours (480 minutes).")
            .When(request => request.DurationMinutes.HasValue);

        RuleFor(request => request.Type)
            .IsInEnum()
            .WithMessage("Invalid appointment type.")
            .When(request => request.Type.HasValue);

        RuleFor(request => request.Reason)
            .NotEmpty()
            .WithMessage("Reason cannot be empty if provided.")
            .MaximumLength(500)
            .WithMessage("Reason cannot exceed 500 characters.")
            .When(request => request.Reason is not null);

        RuleFor(request => request.PatientNotes)
            .MaximumLength(2000)
            .WithMessage("Patient notes cannot exceed 2000 characters.")
            .When(request => request.PatientNotes is not null);

        RuleFor(request => request.Location)
            .MaximumLength(200)
            .WithMessage("Location cannot exceed 200 characters.")
            .When(request => request.Location is not null);
    }
}

/// <summary>
/// Validator for RescheduleAppointmentRequest.
/// </summary>
public sealed class RescheduleAppointmentRequestValidator : AbstractValidator<RescheduleAppointmentRequest>
{
    public RescheduleAppointmentRequestValidator()
    {
        RuleFor(request => request.NewDateTime)
            .NotEmpty()
            .WithMessage("New date and time is required.")
            .GreaterThan(DateTime.UtcNow)
            .WithMessage("New date and time must be in the future.");

        RuleFor(request => request.NewLocation)
            .MaximumLength(200)
            .WithMessage("Location cannot exceed 200 characters.")
            .When(request => request.NewLocation is not null);
    }
}

/// <summary>
/// Validator for CancelAppointmentRequest.
/// </summary>
public sealed class CancelAppointmentRequestValidator : AbstractValidator<CancelAppointmentRequest>
{
    public CancelAppointmentRequestValidator()
    {
        RuleFor(request => request.Reason)
            .NotEmpty()
            .WithMessage("Cancellation reason is required.")
            .MaximumLength(500)
            .WithMessage("Cancellation reason cannot exceed 500 characters.");
    }
}

/// <summary>
/// Validator for CompleteAppointmentRequest.
/// </summary>
public sealed class CompleteAppointmentRequestValidator : AbstractValidator<CompleteAppointmentRequest>
{
    public CompleteAppointmentRequestValidator()
    {
        RuleFor(request => request.Notes)
            .MaximumLength(4000)
            .WithMessage("Notes cannot exceed 4000 characters.")
            .When(request => request.Notes is not null);
    }
}

/// <summary>
/// Validator for AddNotesRequest.
/// </summary>
public sealed class AddNotesRequestValidator : AbstractValidator<AddNotesRequest>
{
    public AddNotesRequestValidator()
    {
        RuleFor(request => request.Notes)
            .NotEmpty()
            .WithMessage("Notes are required.")
            .MaximumLength(4000)
            .WithMessage("Notes cannot exceed 4000 characters.");
    }
}

/// <summary>
/// Validator for SetTelehealthLinkRequest.
/// </summary>
public sealed class SetTelehealthLinkRequestValidator : AbstractValidator<SetTelehealthLinkRequest>
{
    public SetTelehealthLinkRequestValidator()
    {
        RuleFor(request => request.Link)
            .NotEmpty()
            .WithMessage("Telehealth link is required.")
            .MaximumLength(500)
            .WithMessage("Telehealth link cannot exceed 500 characters.")
            .Must(link => Uri.TryCreate(link, UriKind.Absolute, out _))
            .WithMessage("Telehealth link must be a valid URL.");
    }
}
