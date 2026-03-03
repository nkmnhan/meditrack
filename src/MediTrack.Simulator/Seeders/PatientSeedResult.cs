namespace MediTrack.Simulator.Seeders;

/// <summary>
/// Lightweight record passed from PatientSeeder to downstream seeders
/// (Appointment, MedicalRecords) so they can reference real patient data
/// without HTTP calls.
/// </summary>
public sealed record PatientSeedResult(Guid Id, string FirstName, string LastName, string Email);
