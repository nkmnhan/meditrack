using Clara.API.Domain;
using FluentAssertions;
using Xunit;

namespace Clara.UnitTests.Domain;

public sealed class SessionStateMachineTests
{
    private static Session CreateActiveSession()
    {
        return new Session
        {
            Id = Guid.NewGuid(),
            DoctorId = "doctor-1",
            StartedAt = DateTimeOffset.UtcNow,
            Status = SessionStatusEnum.Active
        };
    }

    // --- Valid transitions from Active ---

    [Fact]
    public void Pause_FromActive_ShouldTransitionToPaused()
    {
        var session = CreateActiveSession();

        session.Pause();

        session.Status.Should().Be(SessionStatusEnum.Paused);
    }

    [Fact]
    public void Complete_FromActive_ShouldTransitionToCompleted()
    {
        var session = CreateActiveSession();

        session.Complete();

        session.Status.Should().Be(SessionStatusEnum.Completed);
        session.EndedAt.Should().NotBeNull();
    }

    [Fact]
    public void Cancel_FromActive_ShouldTransitionToCancelled()
    {
        var session = CreateActiveSession();

        session.Cancel();

        session.Status.Should().Be(SessionStatusEnum.Cancelled);
        session.EndedAt.Should().NotBeNull();
    }

    // --- Valid transitions from Paused ---

    [Fact]
    public void Resume_FromPaused_ShouldTransitionToActive()
    {
        var session = CreateActiveSession();
        session.Pause();

        session.Resume();

        session.Status.Should().Be(SessionStatusEnum.Active);
    }

    [Fact]
    public void Complete_FromPaused_ShouldTransitionToCompleted()
    {
        var session = CreateActiveSession();
        session.Pause();

        session.Complete();

        session.Status.Should().Be(SessionStatusEnum.Completed);
        session.EndedAt.Should().NotBeNull();
    }

    [Fact]
    public void Cancel_FromPaused_ShouldTransitionToCancelled()
    {
        var session = CreateActiveSession();
        session.Pause();

        session.Cancel();

        session.Status.Should().Be(SessionStatusEnum.Cancelled);
        session.EndedAt.Should().NotBeNull();
    }

    // --- Invalid transitions from terminal states ---

    [Fact]
    public void Pause_FromCompleted_ShouldThrow()
    {
        var session = CreateActiveSession();
        session.Complete();

        var action = () => session.Pause();

        action.Should().Throw<InvalidOperationException>()
            .WithMessage("*Cannot transition*'completed'*'paused'*");
    }

    [Fact]
    public void Resume_FromCompleted_ShouldThrow()
    {
        var session = CreateActiveSession();
        session.Complete();

        var action = () => session.Resume();

        action.Should().Throw<InvalidOperationException>()
            .WithMessage("*Cannot transition*'completed'*'active'*");
    }

    [Fact]
    public void Complete_FromCancelled_ShouldThrow()
    {
        var session = CreateActiveSession();
        session.Cancel();

        var action = () => session.Complete();

        action.Should().Throw<InvalidOperationException>()
            .WithMessage("*Cannot transition*'cancelled'*'completed'*");
    }

    [Fact]
    public void Cancel_FromCancelled_ShouldThrow()
    {
        var session = CreateActiveSession();
        session.Cancel();

        var action = () => session.Cancel();

        action.Should().Throw<InvalidOperationException>()
            .WithMessage("*Cannot transition*'cancelled'*'cancelled'*");
    }

    // --- Invalid transitions from Active ---

    [Fact]
    public void Resume_FromActive_ShouldThrow()
    {
        var session = CreateActiveSession();

        var action = () => session.Resume();

        action.Should().Throw<InvalidOperationException>()
            .WithMessage("*Cannot transition*'active'*'active'*");
    }

    // --- Duration ---

    [Fact]
    public void Duration_WhenCompleted_ShouldReturnTimeSpan()
    {
        var session = CreateActiveSession();

        session.Complete();

        session.Duration.Should().NotBeNull();
        session.Duration!.Value.Should().BeGreaterThanOrEqualTo(TimeSpan.Zero);
    }

    [Fact]
    public void Duration_WhenActive_ShouldReturnNull()
    {
        var session = CreateActiveSession();

        session.Duration.Should().BeNull();
    }
}
