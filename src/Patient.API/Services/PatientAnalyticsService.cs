using Microsoft.EntityFrameworkCore;
using Patient.API.Infrastructure;

namespace Patient.API.Services;

public sealed class PatientAnalyticsService
{
    private readonly PatientDbContext _dbContext;

    public PatientAnalyticsService(PatientDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<RegistrationTrendEntry>> GetRegistrationTrendsAsync(
        int days, CancellationToken cancellationToken)
    {
        var startDate = DateTime.UtcNow.AddDays(-days).Date;

        // Project only dates at the SQL level, then group in memory.
        // Npgsql cannot translate .Date or .ToString() inside GroupBy/Select.
        var patientDates = await _dbContext.Patients
            .Where(patient => patient.CreatedAt >= startDate)
            .Select(patient => patient.CreatedAt)
            .ToListAsync(cancellationToken);

        var registrationsByDate = patientDates
            .GroupBy(createdAt => createdAt.Date)
            .ToDictionary(
                group => group.Key.ToString("yyyy-MM-dd"),
                group => group.Count());

        // Fill in missing dates with zero counts
        return Enumerable.Range(0, days)
            .Select(offset => startDate.AddDays(offset).ToString("yyyy-MM-dd"))
            .Select(date => new RegistrationTrendEntry
            {
                Date = date,
                Count = registrationsByDate.GetValueOrDefault(date, 0)
            })
            .ToList();
    }

    public async Task<PatientDemographics> GetDemographicsAsync(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var patients = await _dbContext.Patients
            .Select(patient => new
            {
                patient.Gender,
                patient.IsActive,
                patient.DateOfBirth
            })
            .ToListAsync(cancellationToken);

        var genderDistribution = patients
            .GroupBy(patient => patient.Gender ?? "Unknown")
            .Select(group => new DistributionEntry { Label = group.Key, Count = group.Count() })
            .OrderByDescending(entry => entry.Count)
            .ToList();

        var ageBrackets = patients
            .Select(patient =>
            {
                var age = today.Year - patient.DateOfBirth.Year;
                if (patient.DateOfBirth > today.AddYears(-age)) age--;
                return age;
            })
            .GroupBy(age => age switch
            {
                < 18 => "Under 18",
                < 30 => "18-29",
                < 45 => "30-44",
                < 60 => "45-59",
                < 75 => "60-74",
                _ => "75+"
            })
            .Select(group => new DistributionEntry { Label = group.Key, Count = group.Count() })
            .OrderBy(entry => entry.Label)
            .ToList();

        var activeCount = patients.Count(patient => patient.IsActive);
        var inactiveCount = patients.Count(patient => !patient.IsActive);

        return new PatientDemographics
        {
            TotalPatients = patients.Count,
            ActivePatients = activeCount,
            InactivePatients = inactiveCount,
            GenderDistribution = genderDistribution,
            AgeBrackets = ageBrackets
        };
    }
}

public sealed record RegistrationTrendEntry
{
    public required string Date { get; init; }
    public required int Count { get; init; }
}

public sealed record PatientDemographics
{
    public required int TotalPatients { get; init; }
    public required int ActivePatients { get; init; }
    public required int InactivePatients { get; init; }
    public required List<DistributionEntry> GenderDistribution { get; init; }
    public required List<DistributionEntry> AgeBrackets { get; init; }
}

public sealed record DistributionEntry
{
    public required string Label { get; init; }
    public required int Count { get; init; }
}
