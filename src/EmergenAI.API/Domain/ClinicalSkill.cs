namespace EmergenAI.API.Domain;

/// <summary>
/// A clinical skill loaded from YAML files.
/// Skills guide the AI through specific clinical workflows.
/// </summary>
public sealed class ClinicalSkill
{
    /// <summary>
    /// Skill identifier (from filename, e.g., "chest-pain").
    /// </summary>
    public required string Id { get; set; }
    
    /// <summary>
    /// Human-readable skill name.
    /// </summary>
    public required string Name { get; set; }
    
    /// <summary>
    /// When this skill should be activated (keywords, patterns).
    /// </summary>
    public required List<string> Triggers { get; set; }
    
    /// <summary>
    /// Priority for skill selection (higher = more important).
    /// </summary>
    public int Priority { get; set; }
    
    /// <summary>
    /// The skill content (markdown body after YAML front matter).
    /// </summary>
    public required string Content { get; set; }
}

/// <summary>
/// YAML front matter structure for skill files.
/// </summary>
public sealed class SkillFrontMatter
{
    public required string Name { get; set; }
    public required List<string> Triggers { get; set; }
    public int Priority { get; set; } = 50;
}
