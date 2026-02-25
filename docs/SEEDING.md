# MediTrack Test Data Generation

## Overview

MediTrack uses **Bogus** library to generate realistic test data for development and testing purposes. The data generated includes:

- Realistic names (male/female appropriate first names)
- Valid email addresses
- Proper phone number formats
- Real US addresses (street, city, state, ZIP)
- Medical information (blood types, allergies)
- Emergency contacts
- Insurance details (major US providers)
- Age distribution matching real demographics

**No "test" or "dummy" prefixes are used** — all data looks like production data.

---

## Quick Start

### 1. **Using the API Endpoint** (Recommended)

The easiest way to seed data is via the development API endpoint:

```bash
# Generate 50 patients (default)
curl -X POST https://localhost:5002/api/dev/seed/patients

# Generate 100 patients
curl -X POST "https://localhost:5002/api/dev/seed/patients?count=100"

# Clear existing patients and generate 200 new ones
curl -X POST "https://localhost:5002/api/dev/seed/patients?count=200&clearExisting=true"
```

**Parameters:**
- `count` (optional): Number of patients to generate (1-1000, default: 50)
- `clearExisting` (optional): Delete all existing patients before seeding (default: false)

**Note:** This endpoint is **only available in Development environment**.

---

### 2. **Using Swagger UI**

1. Start the Patient.API service: `docker-compose up patient-api`
2. Navigate to Swagger UI: https://localhost:5002/swagger
3. Find the **"Development - Data Seeding"** section
4. Execute the `POST /api/dev/seed/patients` endpoint
5. Adjust parameters as needed

---

### 3. **Programmatically (in code)**

```csharp
// Example: Seed in integration tests
public class PatientIntegrationTests
{
    private readonly PatientSeeder _seeder;
    
    [Fact]
    public async Task SeedTestData()
    {
        // Generate 100 realistic patients
        await _seeder.SeedPatientsAsync(count: 100);
    }
}
```

---

## Generated Data Examples

### Patient Names
- **Male:** James Anderson, Michael Thompson, Robert Martinez
- **Female:** Mary Johnson, Jennifer Williams, Linda Garcia

### Email Addresses
- `james.anderson@example.com`
- `mary.johnson42@gmail.com`
- `michael.t.smith@outlook.com`

### Addresses
```
123 Oak Street, Apt 4B
Springfield, IL 62701

456 Maple Avenue
Portland, OR 97205
```

### Medical Data
- **Blood Types:** A+, A-, B+, B-, AB+, AB-, O+, O-
- **Allergies:** Penicillin, Sulfa drugs, Latex, Peanuts, Shellfish, None known
- **Insurance Providers:** Blue Cross Blue Shield, United Healthcare, Aetna, Cigna, Kaiser Permanente

### Age Distribution
- **0-5 years:** 5%
- **5-18 years:** 15%
- **18-30 years:** 20%
- **30-50 years:** 30%
- **50-70 years:** 20%
- **70-85 years:** 8%
- **85+ years:** 2%

---

## Configuration

### Deterministic vs. Random Data

By default, the seeder uses a **fixed seed (42)** to generate consistent data across runs. This is useful for:
- Reproducible test scenarios
- Demo environments
- Training databases

To generate **random data every time**, modify `PatientSeeder.cs`:

```csharp
// Remove this line from CreatePatientFaker()
var seed = 42;

// And remove .UseSeed(seed) from all Faker instances
var addressFaker = new Faker<AddressDto>()
    // .UseSeed(seed)  <-- Remove this
    .CustomInstantiator(f => new AddressDto(...));
```

### Adjusting Data Characteristics

**Change age distribution:**
```csharp
var ageYears = f.Random.WeightedRandom(
    new[] { 0, 5, 18, 30, 50, 70, 85 },  // Age brackets
    new[] { 0.10f, 0.20f, 0.30f, 0.20f, 0.10f, 0.07f, 0.03f } // New weights
);
```

**Change insurance coverage rate (default: 85%):**
```csharp
Insurance: f.Random.Bool(0.95f) ? insuranceFaker.Generate() : null  // 95% have insurance
```

**Change emergency contact rate (default: 90%):**
```csharp
EmergencyContact: f.Random.Bool(0.99f) ? emergencyContactFaker.Generate() : null  // 99% have emergency contact
```

---

## Business Rules Compliance

The seeder respects all business rules defined in `docs/business-logic.md`:

| Rule | Enforcement |
|------|-------------|
| **BR-P001** | Email uniqueness (Bogus generates unique emails per run with seed) |
| **BR-P002** | Date of birth in past (generated between 1 day and 100 years ago) |
| **BR-P003** | Valid phone format (###-###-####) |
| **BR-P004** | Minimum 1 day old (enforced in age calculation) |
| **BR-P006** | MRN auto-generation (handled by Patient entity) |
| **BR-P010** | Name character validation (Bogus generates only letters/spaces/hyphens) |

---

## Production Safety

✅ **Safe for Production:**
- Seeder endpoint is **only available in Development environment**
- Conditional registration: `if (app.Environment.IsDevelopment())`
- No accidental data generation in production

⚠️ **Caution:**
- `clearExisting=true` will **delete all patients** — use with care even in dev!
- Always backup databases before clearing data

---

## Advanced Usage

### Custom Seeder for Other Entities

When implementing Appointment or MedicalRecords services, create similar seeders:

```csharp
public class AppointmentSeeder
{
    public async Task SeedAppointmentsAsync(int count = 100)
    {
        var faker = new Faker<CreateAppointmentRequest>()
            .CustomInstantiator(f => new CreateAppointmentRequest(
                PatientId: f.PickRandom(existingPatientIds),  // Link to real patients
                ProviderId: f.PickRandom(existingProviderIds),
                AppointmentDate: DateOnly.FromDateTime(f.Date.Future(60)),
                // ... etc
            ));
        
        var appointments = faker.Generate(count);
        // ... create appointments
    }
}
```

### Integration with Entity Framework Migrations

For permanent seed data (e.g., lookup tables), use EF Core seeding:

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<BloodType>().HasData(
        new BloodType { Id = 1, Name = "A+" },
        new BloodType { Id = 2, Name = "A-" },
        // ... etc
    );
}
```

---

## Troubleshooting

### "Email already exists" error
- If using the same seed (42) and calling the endpoint multiple times without `clearExisting=true`, email collisions will occur
- Solution: Use `clearExisting=true` or change the seed value

### Seeder endpoint not available
- Verify you're running in Development environment
- Check `ASPNETCORE_ENVIRONMENT=Development` in docker-compose.override.yml

### Performance issues with large datasets
- Generating 1000+ patients can take 30-60 seconds
- Consider batching or running async if needed

---

## Related Documentation

- [Business Logic & Rules](./business-logic.md) — All business rules enforced by seeder
- [Bogus Documentation](https://github.com/bchavez/Bogus) — Full Bogus library reference
- Testing Strategy — planned for a future phase

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-24 | Initial seeder implementation with Bogus |
