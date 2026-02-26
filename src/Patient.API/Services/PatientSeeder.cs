using Bogus;
using Microsoft.EntityFrameworkCore;
using Patient.API.Dtos;
using Patient.API.Infrastructure;
using Patient.API.Models;

namespace Patient.API.Services;

/// <summary>
/// Generates realistic test data for Patient entities using Bogus library.
/// For development and testing purposes only.
/// </summary>
public class PatientSeeder
{
    private readonly IPatientService _patientService;
    private readonly PatientDbContext _dbContext;
    private readonly ILogger<PatientSeeder> _logger;

    public PatientSeeder(
        IPatientService patientService,
        PatientDbContext dbContext,
        ILogger<PatientSeeder> logger)
    {
        _patientService = patientService;
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Seeds the database with realistic patient data.
    /// </summary>
    /// <param name="count">Number of patients to generate (default: 50, max: 1000)</param>
    /// <param name="clearExisting">If true, deletes all existing patients before seeding</param>
    public async Task<(int CreatedCount, int FailedCount)> SeedPatientsAsync(int count = 50, bool clearExisting = false, CancellationToken cancellationToken = default)
    {
        count = Math.Clamp(count, 1, 1000);

        if (clearExisting)
        {
            _logger.LogWarning("Clearing all existing patients...");
            var deletedCount = await _dbContext.Patients.ExecuteDeleteAsync(cancellationToken);
            _logger.LogInformation("Cleared {Count} patients", deletedCount);
        }

        _logger.LogInformation("Generating {Count} realistic patient records...", count);

        var faker = CreatePatientFaker();
        var patients = faker.Generate(count);

        var createdCount = 0;
        var failedCount = 0;

        foreach (var patientRequest in patients)
        {
            try
            {
                // Skip if email already exists (handles re-runs with deterministic seed)
                if (await _patientService.EmailExistsAsync(patientRequest.Email, cancellationToken: cancellationToken))
                {
                    _logger.LogDebug("Skipping patient with existing email: {Email}", patientRequest.Email);
                    continue;
                }

                // Use a deterministic dev-only userId for seeded patients
                //  In production, userId comes from authenticated user claims
                var devUserId = Guid.NewGuid();
                await _patientService.CreateAsync(devUserId, patientRequest, cancellationToken);
                createdCount++;

                if (createdCount % 10 == 0)
                {
                    _logger.LogInformation("Generated {CreatedCount}/{TotalCount} patients...", createdCount, count);
                }
            }
            catch (Exception ex)
            {
                failedCount++;
                _logger.LogWarning(ex, "Failed to create patient: {Email}", patientRequest.Email);
            }
        }

        _logger.LogInformation(
            "Patient seeding complete: {CreatedCount} created, {FailedCount} failed",
            createdCount,
            failedCount);

        return (createdCount, failedCount);
    }

    private static Faker<CreatePatientRequest> CreatePatientFaker()
    {
        // Seed for consistent data across runs (remove for random data each time)
        var seed = 42;

        var addressFaker = new Faker<AddressDto>()
            .UseSeed(seed)
            .CustomInstantiator(f => new AddressDto(
                Street: f.Address.StreetAddress(),
                Street2: f.Random.Bool(0.3f) ? f.Address.SecondaryAddress() : null,
                City: f.Address.City(),
                State: f.Address.StateAbbr(),
                ZipCode: f.Address.ZipCode(),
                Country: "USA"
            ));

        var emergencyContactFaker = new Faker<EmergencyContactDto>()
            .UseSeed(seed)
            .CustomInstantiator(f => new EmergencyContactDto(
                Name: f.Name.FullName(),
                Relationship: f.PickRandom("Spouse", "Parent", "Sibling", "Child", "Friend", "Partner"),
                PhoneNumber: f.Phone.PhoneNumber("###-###-####"),
                Email: f.Random.Bool(0.7f) ? f.Internet.Email() : null
            ));

        var insuranceFaker = new Faker<InsuranceDto>()
            .UseSeed(seed)
            .CustomInstantiator(f => new InsuranceDto(
                Provider: f.PickRandom(
                    "Blue Cross Blue Shield",
                    "United Healthcare",
                    "Aetna",
                    "Cigna",
                    "Humana",
                    "Kaiser Permanente",
                    "Medicare",
                    "Medicaid"
                ),
                PolicyNumber: f.Random.Replace("##########"),
                GroupNumber: f.Random.Replace("GRP-######"),
                PlanName: f.PickRandom("Gold Plan", "Silver Plan", "Bronze Plan", "Platinum Plan", "PPO", "HMO", "EPO"),
                EffectiveDate: DateOnly.FromDateTime(f.Date.Past(5)),
                ExpirationDate: DateOnly.FromDateTime(f.Date.Future(2))
            ));

        return new Faker<CreatePatientRequest>()
            .UseSeed(seed)
            .CustomInstantiator(f =>
            {
                var gender = f.PickRandom("Male", "Female", "Non-Binary", "Other", "Prefer not to say");
                var firstName = gender == "Male" ? f.Name.FirstName(Bogus.DataSets.Name.Gender.Male) : f.Name.FirstName(Bogus.DataSets.Name.Gender.Female);
                var lastName = f.Name.LastName();

                // Generate realistic age distribution
                // Weighted brackets: pick a base age, then add 0-14 years of variance within the bracket
                var bracketStarts = new[] { 0, 5, 18, 30, 50, 70, 85 };
                var bracketEnds = new[] { 4, 17, 29, 49, 69, 84, 100 };
                var bracketWeights = new[] { 0.05f, 0.15f, 0.20f, 0.30f, 0.20f, 0.08f, 0.02f };
                var bracketIndex = f.Random.WeightedRandom(
                    Enumerable.Range(0, bracketStarts.Length).ToArray(),
                    bracketWeights
                );
                var ageYears = f.Random.Int(bracketStarts[bracketIndex], bracketEnds[bracketIndex]);
                var ageDays = f.Random.Int(1, 365);
                var dob = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-ageYears).AddDays(-ageDays));

                // Ensure at least 1 day old (BR-P004)
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                if (dob >= today)
                {
                    dob = today.AddDays(-1);
                }

                return new CreatePatientRequest(
                    FirstName: firstName,
                    LastName: lastName,
                    DateOfBirth: dob,
                    Gender: gender,
                    SocialSecurityNumber: f.Random.Bool(0.8f) ? f.Random.Replace("###-##-####") : null,
                    Email: f.Internet.Email(firstName, lastName).ToLowerInvariant(),
                    PhoneNumber: f.Phone.PhoneNumber("###-###-####"),
                    Address: addressFaker.Generate(),
                    BloodType: f.Random.Bool(0.7f) ? f.PickRandom("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-") : null,
                    Allergies: f.Random.Bool(0.4f) ? f.PickRandom(
                        "Penicillin",
                        "Sulfa drugs",
                        "Latex",
                        "Peanuts, shellfish",
                        "Aspirin",
                        "Ibuprofen",
                        "None known",
                        "Pollen, dust mites"
                    ) : null,
                    MedicalNotes: f.Random.Bool(0.3f) ? f.Lorem.Sentence(10) : null,
                    EmergencyContact: f.Random.Bool(0.9f) ? emergencyContactFaker.Generate() : null,
                    Insurance: f.Random.Bool(0.85f) ? insuranceFaker.Generate() : null
                );
            });
    }
}
