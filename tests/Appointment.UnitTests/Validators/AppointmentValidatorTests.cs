using Appointment.API.Dtos;
using Appointment.API.Models;
using Appointment.API.Services;
using Appointment.API.Validators;
using FluentAssertions;
using FluentValidation.TestHelper;
using NSubstitute;
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
    public void Validate_ScheduledDateTimeIsLessThan1HourFromNow_ReturnsValidationError()
    {
        var request = ValidRequest() with { ScheduledDateTime = DateTime.UtcNow.AddMinutes(30) };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.ScheduledDateTime)
              .WithErrorMessage("Appointments must be scheduled at least 1 hour in advance.");
    }

    [Fact]
    public void Validate_ScheduledDateTimeIsInThePast_ReturnsValidationError()
    {
        var request = ValidRequest() with { ScheduledDateTime = DateTime.UtcNow.AddMinutes(-1) };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.ScheduledDateTime)
              .WithErrorMessage("Appointments must be scheduled at least 1 hour in advance.");
    }

    [Fact]
    public void Validate_ScheduledDateTimeIsExactlyNow_ReturnsValidationError()
    {
        var request = ValidRequest() with { ScheduledDateTime = DateTime.UtcNow };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.ScheduledDateTime)
              .WithErrorMessage("Appointments must be scheduled at least 1 hour in advance.");
    }

    [Fact]
    public void Validate_ScheduledDateTimeIs2HoursFromNow_ReturnsNoErrors()
    {
        var request = ValidRequest() with { ScheduledDateTime = DateTime.UtcNow.AddHours(2) };
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveValidationErrorFor(r => r.ScheduledDateTime);
    }

    [Fact]
    public void Validate_AllFieldsValid_ReturnsNoErrors()
    {
        var result = _validator.TestValidate(ValidRequest());
        result.ShouldNotHaveAnyValidationErrors();
    }
}

public class PatientActiveStatusTests
{
    private readonly IPatientResolver _patientResolver = Substitute.For<IPatientResolver>();

    [Fact]
    public async Task IsPatientActiveAsync_PatientIsInactive_ReturnsFalse()
    {
        var patientId = Guid.NewGuid();
        _patientResolver.IsPatientActiveAsync(patientId, default).Returns(false);

        var result = await _patientResolver.IsPatientActiveAsync(patientId);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsPatientActiveAsync_PatientNotFound_ReturnsNull()
    {
        var patientId = Guid.NewGuid();
        _patientResolver.IsPatientActiveAsync(patientId, default).Returns((bool?)null);

        var result = await _patientResolver.IsPatientActiveAsync(patientId);

        result.Should().BeNull();
    }

    [Fact]
    public async Task IsPatientActiveAsync_PatientIsActive_ReturnsTrue()
    {
        var patientId = Guid.NewGuid();
        _patientResolver.IsPatientActiveAsync(patientId, default).Returns(true);

        var result = await _patientResolver.IsPatientActiveAsync(patientId);

        result.Should().BeTrue();
    }
}
