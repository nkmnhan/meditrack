using Bogus;
using Microsoft.EntityFrameworkCore;
using Patient.API.Dtos;
using Patient.API.Infrastructure;
using Patient.API.Models;

namespace MediTrack.Simulator.Seeders;

/// <summary>
/// Generates realistic patient test data via direct entity creation.
/// Adapted from Patient.API/Services/PatientSeeder.cs — no IPatientService dependency.
/// </summary>
public sealed class PatientSeeder
{
    private readonly PatientDbContext _dbContext;
    private readonly ILogger<PatientSeeder> _logger;

    public PatientSeeder(PatientDbContext dbContext, ILogger<PatientSeeder> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Seeds patient data and returns results for downstream seeders.
    /// </summary>
    public async Task<(List<PatientSeedResult> Patients, int FailedCount)> SeedPatientsAsync(
        int count = 50,
        bool clearExisting = false,
        CancellationToken cancellationToken = default)
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
        var patientRequests = faker.Generate(count);
        var results = new List<PatientSeedResult>();
        var failedCount = 0;

        foreach (var request in patientRequests)
        {
            try
            {
                // Check email uniqueness (handles re-runs with deterministic seed)
                if (await _dbContext.Patients.AnyAsync(
                        patient => patient.Email == request.Email, cancellationToken))
                {
                    // Still return existing patient for downstream seeders
                    var existing = await _dbContext.Patients
                        .Where(patient => patient.Email == request.Email)
                        .Select(patient => new PatientSeedResult(
                            patient.Id,
                            patient.FirstName,
                            patient.LastName,
                            patient.Email))
                        .FirstAsync(cancellationToken);
                    results.Add(existing);
                    _logger.LogDebug("Skipping patient with existing email: {Email}", request.Email);
                    continue;
                }

                var devUserId = Guid.NewGuid();
                var address = new Address(
                    request.Address.Street,
                    request.Address.Street2,
                    request.Address.City,
                    request.Address.State,
                    request.Address.ZipCode,
                    request.Address.Country);

                var patient = new Patient.API.Models.Patient(
                    devUserId,
                    request.FirstName,
                    request.LastName,
                    request.DateOfBirth,
                    request.Gender,
                    request.Email,
                    request.PhoneNumber,
                    address);

                patient.UpdateMedicalInfo(request.BloodType, request.Allergies, request.MedicalNotes);

                if (request.EmergencyContact is not null)
                {
                    patient.SetEmergencyContact(new EmergencyContact(
                        request.EmergencyContact.Name,
                        request.EmergencyContact.Relationship,
                        request.EmergencyContact.PhoneNumber,
                        request.EmergencyContact.Email));
                }

                if (request.Insurance is not null)
                {
                    patient.SetInsurance(new Insurance(
                        request.Insurance.Provider,
                        request.Insurance.PolicyNumber,
                        request.Insurance.GroupNumber,
                        request.Insurance.PlanName,
                        request.Insurance.EffectiveDate,
                        request.Insurance.ExpirationDate));
                }

                _dbContext.Patients.Add(patient);
                results.Add(new PatientSeedResult(
                    patient.Id,
                    request.FirstName,
                    request.LastName,
                    request.Email));

                if (results.Count % 10 == 0)
                {
                    _logger.LogInformation("Generated {CreatedCount}/{TotalCount} patients...",
                        results.Count, count);
                }
            }
            catch (Exception ex)
            {
                failedCount++;
                _logger.LogWarning(ex, "Failed to create patient: {Email}", request.Email);
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Patient seeding complete: {CreatedCount} created, {FailedCount} failed",
            results.Count, failedCount);

        return (results, failedCount);
    }

    private static Faker<CreatePatientRequest> CreatePatientFaker()
    {
        const int seed = 42;

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
                var firstName = gender == "Male"
                    ? f.Name.FirstName(Bogus.DataSets.Name.Gender.Male)
                    : f.Name.FirstName(Bogus.DataSets.Name.Gender.Female);
                var lastName = f.Name.LastName();

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
