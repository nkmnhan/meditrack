using EmergenAI.API.Domain;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace EmergenAI.API.Services;

/// <summary>
/// Loads clinical skills from YAML files at startup.
/// Skills are stored in memory (read-only after load).
/// </summary>
public sealed class SkillLoaderService
{
    private readonly ILogger<SkillLoaderService> _logger;
    private readonly IConfiguration _configuration;
    private readonly List<ClinicalSkill> _skills = [];

    public SkillLoaderService(ILogger<SkillLoaderService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// All loaded clinical skills, sorted by priority (highest first).
    /// </summary>
    public IReadOnlyList<ClinicalSkill> Skills => _skills.AsReadOnly();

    /// <summary>
    /// Loads all YAML skill files from the configured path.
    /// Should be called once at startup.
    /// </summary>
    public async Task LoadSkillsAsync()
    {
        var relativePath = _configuration["Skills:BasePath"] ?? "skills/core";
        
        // Use AppContext.BaseDirectory for Docker compatibility (CLAUDE.md review fix #3)
        var skillsPath = Path.Combine(AppContext.BaseDirectory, relativePath);
        
        if (!Directory.Exists(skillsPath))
        {
            _logger.LogWarning("Skills directory not found at {SkillsPath}. No skills will be loaded", skillsPath);
            return;
        }

        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();

        var skillFiles = Directory.GetFiles(skillsPath, "*.yaml");
        
        foreach (var filePath in skillFiles)
        {
            try
            {
                var skill = await LoadSkillFromFileAsync(filePath, deserializer);
                if (skill != null)
                {
                    _skills.Add(skill);
                    _logger.LogInformation(
                        "Loaded skill: {SkillId} ({SkillName}) with {TriggerCount} triggers, priority {Priority}",
                        skill.Id, skill.Name, skill.Triggers.Count, skill.Priority);
                }
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Failed to load skill from {FilePath}", filePath);
            }
        }

        // Sort by priority descending (highest priority first)
        _skills.Sort((skillA, skillB) => skillB.Priority.CompareTo(skillA.Priority));
        
        _logger.LogInformation("Loaded {SkillCount} clinical skills", _skills.Count);
    }

    /// <summary>
    /// Finds the best matching skill based on conversation text.
    /// Returns null if no skill matches.
    /// </summary>
    public ClinicalSkill? FindMatchingSkill(string conversationText)
    {
        var lowerText = conversationText.ToLowerInvariant();
        
        // Skills are pre-sorted by priority, so first match wins
        return _skills.FirstOrDefault(skill =>
            skill.Triggers.Any(trigger => 
                lowerText.Contains(trigger.ToLowerInvariant())));
    }

    private static async Task<ClinicalSkill?> LoadSkillFromFileAsync(
        string filePath,
        IDeserializer deserializer)
    {
        var content = await File.ReadAllTextAsync(filePath);
        
        // Parse YAML front matter (between --- delimiters)
        if (!content.StartsWith("---"))
            return null;

        var endOfFrontMatter = content.IndexOf("---", 3, StringComparison.Ordinal);
        if (endOfFrontMatter == -1)
            return null;

        var frontMatterYaml = content[3..endOfFrontMatter].Trim();
        var markdownBody = content[(endOfFrontMatter + 3)..].Trim();

        var frontMatter = deserializer.Deserialize<SkillFrontMatter>(frontMatterYaml);
        
        var skillId = Path.GetFileNameWithoutExtension(filePath);

        return new ClinicalSkill
        {
            Id = skillId,
            Name = frontMatter.Name,
            Triggers = frontMatter.Triggers,
            Priority = frontMatter.Priority,
            Content = markdownBody
        };
    }
}
