namespace Clara.API.Application.Models;

public sealed class BatchTriggerOptions
{
    public const string SectionName = "AI:Batching";
    public int PatientUtteranceThreshold { get; set; } = 5;
    public int TimeoutSeconds { get; set; } = 60;
    public string[] UrgentKeywords { get; set; } = [
        "chest pain", "can't breathe", "cannot breathe", "difficulty breathing",
        "severe bleeding", "loss of consciousness", "unconscious", "seizure",
        "anaphylaxis", "allergic reaction", "suicidal", "stroke symptoms",
        "sudden weakness", "slurred speech", "severe headache"
    ];
}
