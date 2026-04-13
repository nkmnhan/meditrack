using System.Net;
using Clara.API.Services;
using Clara.UnitTests.TestInfrastructure;
using FluentAssertions;
using MediTrack.Shared.Services;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace Clara.UnitTests.Services;

/// <summary>
/// Verifies that PatientContextService publishes PHI audit events on every
/// patient context access attempt — HIPAA mandatory.
/// </summary>
public sealed class PHIAuditTests
{
    private readonly MockHttpMessageHandler _httpHandler;
    private readonly IPHIAuditService _auditService;
    private readonly PatientContextService _service;

    public PHIAuditTests()
    {
        _httpHandler = new MockHttpMessageHandler();
        var httpClient = new HttpClient(_httpHandler) { BaseAddress = new Uri("http://localhost:5002") };
        var httpClientFactory = Substitute.For<IHttpClientFactory>();
        httpClientFactory.CreateClient("PatientApi").Returns(httpClient);

        _auditService = Substitute.For<IPHIAuditService>();

        _service = new PatientContextService(
            httpClientFactory,
            _auditService,
            NullLogger<PatientContextService>.Instance);
    }

    [Fact]
    public async Task GetPatientContextAsync_OnSuccessfulFetch_ShouldPublishSuccessAuditEvent()
    {
        // Arrange
        _httpHandler.SetResponse(HttpStatusCode.OK, """
        {
            "dateOfBirth": "1985-03-20",
            "gender": "Female",
            "allergies": ["Aspirin"],
            "activeMedications": ["Metformin 500mg"],
            "chronicConditions": ["Type 2 Diabetes"],
            "recentVisitReason": "Blood sugar follow-up"
        }
        """);
        const string patientId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

        // Act
        await _service.GetPatientContextAsync(patientId);

        // Assert
        await _auditService.Received(1).PublishAccessAsync(
            resourceType: "PatientContext",
            resourceId: patientId,
            patientId: Guid.Parse(patientId),
            action: "AIContextAccess",
            accessedFields: "age,gender,allergies,medications,conditions,recentVisit",
            success: true,
            errorMessage: null,
            additionalContext: Arg.Any<object>(),
            cancellationToken: Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetPatientContextAsync_OnHttpErrorResponse_ShouldPublishFailureAuditEvent()
    {
        // Arrange
        _httpHandler.SetResponse(HttpStatusCode.NotFound, "");
        const string patientId = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

        // Act
        await _service.GetPatientContextAsync(patientId);

        // Assert
        await _auditService.Received(1).PublishAccessAsync(
            resourceType: "PatientContext",
            resourceId: patientId,
            patientId: Guid.Parse(patientId),
            action: "AIContextAccess",
            accessedFields: null,
            success: false,
            errorMessage: $"HTTP {(int)HttpStatusCode.NotFound}",
            additionalContext: Arg.Any<object>(),
            cancellationToken: Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetPatientContextAsync_WithNullOrEmptyPatientId_ShouldNotPublishAuditEvent()
    {
        // Act — null/empty patientId hits the early-return guard
        await _service.GetPatientContextAsync("");

        // Assert — no audit event for unidentifiable patient access
        await _auditService.DidNotReceive().PublishAccessAsync(
            resourceType: Arg.Any<string>(),
            resourceId: Arg.Any<string>(),
            patientId: Arg.Any<Guid>(),
            action: Arg.Any<string>(),
            accessedFields: Arg.Any<string?>(),
            success: Arg.Any<bool>(),
            errorMessage: Arg.Any<string?>(),
            additionalContext: Arg.Any<object?>(),
            cancellationToken: Arg.Any<CancellationToken>());
    }
}
