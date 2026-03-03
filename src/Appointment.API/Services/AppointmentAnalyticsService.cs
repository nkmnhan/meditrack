using Appointment.API.Infrastructure;
using Appointment.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Appointment.API.Services;

public sealed class AppointmentAnalyticsService
{
    private readonly AppointmentDbContext _dbContext;

    public AppointmentAnalyticsService(AppointmentDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<AppointmentVolumeEntry>> GetVolumeAsync(
        int days, CancellationToken cancellationToken)
    {
        var startDate = DateTime.UtcNow.AddDays(-days).Date;

        // Project only the fields we need at SQL level, then group in memory.
        // Npgsql cannot translate .Date or enum .ToString() inside GroupBy/Select.
        var rawAppointments = await _dbContext.Appointments
            .Where(appointment => appointment.ScheduledDateTime >= startDate)
            .Select(appointment => new { appointment.ScheduledDateTime, appointment.Status })
            .ToListAsync(cancellationToken);

        var grouped = rawAppointments
            .GroupBy(appointment => new { Date = appointment.ScheduledDateTime.Date, appointment.Status })
            .Select(group => new { group.Key.Date, group.Key.Status, Count = group.Count() })
            .ToList();

        // Pivot into per-day entries with status breakdown
        return Enumerable.Range(0, days)
            .Select(offset => startDate.AddDays(offset))
            .Select(date =>
            {
                var dayAppointments = grouped.Where(appointment => appointment.Date == date).ToList();
                return new AppointmentVolumeEntry
                {
                    Date = date.ToString("yyyy-MM-dd"),
                    Scheduled = dayAppointments.Where(appointment => appointment.Status == AppointmentStatus.Scheduled).Sum(appointment => appointment.Count),
                    Confirmed = dayAppointments.Where(appointment => appointment.Status == AppointmentStatus.Confirmed).Sum(appointment => appointment.Count),
                    Completed = dayAppointments.Where(appointment => appointment.Status == AppointmentStatus.Completed).Sum(appointment => appointment.Count),
                    Cancelled = dayAppointments.Where(appointment => appointment.Status == AppointmentStatus.Cancelled).Sum(appointment => appointment.Count),
                    NoShow = dayAppointments.Where(appointment => appointment.Status == AppointmentStatus.NoShow).Sum(appointment => appointment.Count),
                    Total = dayAppointments.Sum(appointment => appointment.Count)
                };
            }).ToList();
    }

    public async Task<List<StatusDistributionEntry>> GetStatusDistributionAsync(
        int days, CancellationToken cancellationToken)
    {
        var startDate = DateTime.UtcNow.AddDays(-days).Date;

        // GroupBy on the enum value (integer) at SQL level, convert to string in memory
        var grouped = await _dbContext.Appointments
            .Where(appointment => appointment.ScheduledDateTime >= startDate)
            .GroupBy(appointment => appointment.Status)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        return grouped
            .OrderByDescending(entry => entry.Count)
            .Select(entry => new StatusDistributionEntry
            {
                Status = entry.Status.ToString(),
                Count = entry.Count
            })
            .ToList();
    }

    public async Task<List<TypeDistributionEntry>> GetTypeDistributionAsync(
        int days, CancellationToken cancellationToken)
    {
        var startDate = DateTime.UtcNow.AddDays(-days).Date;

        // GroupBy on the enum value (integer) at SQL level, convert to string in memory
        var grouped = await _dbContext.Appointments
            .Where(appointment => appointment.ScheduledDateTime >= startDate)
            .GroupBy(appointment => appointment.Type)
            .Select(group => new { Type = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        return grouped
            .OrderByDescending(entry => entry.Count)
            .Select(entry => new TypeDistributionEntry
            {
                Type = entry.Type.ToString(),
                Count = entry.Count
            })
            .ToList();
    }

    public async Task<List<BusiestHourEntry>> GetBusiestHoursAsync(
        int days, CancellationToken cancellationToken)
    {
        var startDate = DateTime.UtcNow.AddDays(-days).Date;

        // .Hour is translatable by Npgsql (EXTRACT(HOUR FROM ...))
        return await _dbContext.Appointments
            .Where(appointment => appointment.ScheduledDateTime >= startDate)
            .GroupBy(appointment => appointment.ScheduledDateTime.Hour)
            .Select(group => new BusiestHourEntry
            {
                Hour = group.Key,
                Count = group.Count()
            })
            .OrderBy(entry => entry.Hour)
            .ToListAsync(cancellationToken);
    }
}

public sealed record AppointmentVolumeEntry
{
    public required string Date { get; init; }
    public required int Scheduled { get; init; }
    public required int Confirmed { get; init; }
    public required int Completed { get; init; }
    public required int Cancelled { get; init; }
    public required int NoShow { get; init; }
    public required int Total { get; init; }
}

public sealed record StatusDistributionEntry
{
    public required string Status { get; init; }
    public required int Count { get; init; }
}

public sealed record TypeDistributionEntry
{
    public required string Type { get; init; }
    public required int Count { get; init; }
}

public sealed record BusiestHourEntry
{
    public required int Hour { get; init; }
    public required int Count { get; init; }
}
