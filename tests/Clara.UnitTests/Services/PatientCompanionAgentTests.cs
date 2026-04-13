using Clara.API.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace Clara.UnitTests.Services;

public sealed class PatientCompanionAgentTests
{
    private readonly IPatientContextService _patientContextService;
    private readonly IServiceProvider _serviceProvider;
    private readonly PatientCompanionAgent _agent;

    public PatientCompanionAgentTests()
    {
        _patientContextService = Substitute.For<IPatientContextService>();
        _serviceProvider = Substitute.For<IServiceProvider>();

        _agent = new PatientCompanionAgent(
            _serviceProvider,
            _patientContextService,
            NullLogger<PatientCompanionAgent>.Instance);
    }

    [Fact]
    public void AgentId_ReturnsPatientCompanion()
    {
        _agent.AgentId.Should().Be("patient-companion");
    }

    [Fact]
    public void DisplayName_ReturnsCompanionName()
    {
        _agent.DisplayName.Should().Be("Clara — Patient Companion");
    }

    [Fact]
    public void SystemPrompt_ContainsSafetyRules()
    {
        _agent.SystemPrompt.Should().ContainAll(
            "never diagnose",
            "plain language");
    }

    [Fact]
    public void Tools_ContainsPatientSafeTools()
    {
        var tools = _agent.Tools;

        tools.Should().HaveCount(2);
    }

    [Fact]
    public void Tools_ContainsMedicationRemindersTool()
    {
        var tools = _agent.Tools;

        tools.Should().ContainSingle(tool => tool.Name == "get_medication_reminders");
    }

    [Fact]
    public void Tools_ContainsVisitSummaryTool()
    {
        var tools = _agent.Tools;

        tools.Should().ContainSingle(tool => tool.Name == "get_visit_summary");
    }
}
