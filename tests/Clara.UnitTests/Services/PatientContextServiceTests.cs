using System.Net;
using Clara.API.Services;
using Clara.UnitTests.TestInfrastructure;
using FluentAssertions;
using MediTrack.Shared.Services;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace Clara.UnitTests.Services;

public sealed class PatientContextServiceTests
{
    private readonly PatientContextService _service;
    private readonly MockHttpMessageHandler _httpHandler;

    public PatientContextServiceTests()
    {
        _httpHandler = new MockHttpMessageHandler();
        var httpClient = new HttpClient(_httpHandler) { BaseAddress = new Uri("http://localhost:5002") };
        var httpClientFactory = Substitute.For<IHttpClientFactory>();
        httpClientFactory.CreateClient("PatientApi").Returns(httpClient);
        _service = new PatientContextService(
            httpClientFactory,
            Substitute.For<IPHIAuditService>(),
            NullLogger<PatientContextService>.Instance);
    }

    [Fact]
    public async Task GetPatientContextAsync_WithValidResponse_ShouldReturnContext()
    {
        _httpHandler.SetResponse(HttpStatusCode.OK, """
        {
            "dateOfBirth": "1980-05-15",
            "gender": "Male",
            "allergies": ["Penicillin"],
            "activeMedications": ["Lisinopril 10mg"],
            "chronicConditions": ["Hypertension"],
            "recentVisitReason": "Annual checkup"
        }
        """);

        var result = await _service.GetPatientContextAsync("patient-123");

        result.Should().NotBeNull();
        result!.PatientId.Should().Be("patient-123");
        result.Gender.Should().Be("Male");
        result.Allergies.Should().Contain("Penicillin");
        result.ActiveMedications.Should().Contain("Lisinopril 10mg");
    }

    [Fact]
    public async Task GetPatientContextAsync_WithEmptyPatientId_ShouldReturnNull()
    {
        var result = await _service.GetPatientContextAsync("");
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetPatientContextAsync_WithWhitespacePatientId_ShouldReturnNull()
    {
        var result = await _service.GetPatientContextAsync("   ");
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetPatientContextAsync_WithApiError_ShouldReturnNull()
    {
        _httpHandler.SetResponse(HttpStatusCode.NotFound, "");
        var result = await _service.GetPatientContextAsync("unknown-patient");
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetPatientContextAsync_WithInvalidJson_ShouldReturnNull()
    {
        _httpHandler.SetResponse(HttpStatusCode.OK, "not json");
        var result = await _service.GetPatientContextAsync("patient-123");
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetPatientContextAsync_WithNullOptionalFields_ShouldReturnContextWithDefaults()
    {
        _httpHandler.SetResponse(HttpStatusCode.OK, """
        {
            "dateOfBirth": null,
            "gender": null,
            "allergies": null,
            "activeMedications": null,
            "chronicConditions": null,
            "recentVisitReason": null
        }
        """);

        var result = await _service.GetPatientContextAsync("patient-123");

        result.Should().NotBeNull();
        result!.Age.Should().BeNull();
        result.Gender.Should().BeNull();
        result.Allergies.Should().BeEmpty();
    }
}
