using Appointment.API.Dtos;
using Appointment.API.Models;
using Appointment.API.Validators;
using FluentAssertions;
using FluentValidation.TestHelper;
using Xunit;

namespace Appointment.UnitTests.Validators;

public class CreateAppointmentRequestValidatorTests
{
    private readonly CreateAppointmentRequestValidator _validator = new();

    private static CreateAppointmentRequest ValidRequest() => new(
        PatientId: Guid.NewGuid(),
        PatientName: "Jane Doe",
        PatientEmail: "jane@example.com",
        ProviderId: Guid.NewGuid(),
        ProviderName: "Dr. Smith",
        ScheduledDateTime: DateTime.UtcNow.AddHours(2),
        DurationMinutes: 30,
        Type: AppointmentType.Consultation,
        Reason: "Annual checkup"
    );

    [Fact]
    public void ScheduledDateTime_LessThan1HourFromNow_ShouldFail()
    {
        var request = ValidRequest() with { ScheduledDateTime = DateTime.UtcNow.AddMinutes(30) };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.ScheduledDateTime)
              .WithErrorMessage("Appointments must be scheduled at least 1 hour in advance.");
    }

    [Fact]
    public void ScheduledDateTime_InThePast_ShouldFail()
    {
        var request = ValidRequest() with { ScheduledDateTime = DateTime.UtcNow.AddMinutes(-1) };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.ScheduledDateTime);
    }

    [Fact]
    public void ScheduledDateTime_ExactlyNow_ShouldFail()
    {
        var request = ValidRequest() with { ScheduledDateTime = DateTime.UtcNow };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.ScheduledDateTime);
    }

    [Fact]
    public void ScheduledDateTime_2HoursFromNow_ShouldPass()
    {
        var request = ValidRequest() with { ScheduledDateTime = DateTime.UtcNow.AddHours(2) };
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveValidationErrorFor(r => r.ScheduledDateTime);
    }

    [Fact]
    public void ValidRequest_ShouldPass()
    {
        var result = _validator.TestValidate(ValidRequest());
        result.ShouldNotHaveAnyValidationErrors();
    }
}
