namespace MediTrack.Simulator.Configuration;

public sealed class SimulatorOptions
{
    public const string SectionName = "Simulator";

    public bool ClearExisting { get; set; }
    public int PatientCount { get; set; } = 50;
    public int AppointmentsPerPatient { get; set; } = 3;
    public int MedicalRecordsPerPatient { get; set; } = 3;
    public int AuditLogCount { get; set; } = 15_000;
    public int ClaraSessionCount { get; set; } = 2_500;
}
