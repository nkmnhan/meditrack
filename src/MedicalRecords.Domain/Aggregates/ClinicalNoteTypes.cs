namespace MediTrack.MedicalRecords.Domain.Aggregates;

public static class ClinicalNoteTypes
{
    public const string ProgressNote = "Progress Note";
    public const string SoapNote = "SOAP Note";
    public const string Assessment = "Assessment";
    public const string Plan = "Plan";
    public const string ProcedureNote = "Procedure Note";
    public const string ConsultationNote = "Consultation Note";
    public const string DischargeSummary = "Discharge Summary";

    public static readonly IReadOnlySet<string> AllValid = new HashSet<string>
    {
        ProgressNote, SoapNote, Assessment, Plan,
        ProcedureNote, ConsultationNote, DischargeSummary
    };
}
