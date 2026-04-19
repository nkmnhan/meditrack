using Microsoft.Extensions.AI;

namespace Clara.API.Extensions;

/// <summary>
/// No-op embedding generator used when OpenAI key is absent (Claude-only setups).
/// Returns zero vectors so callers don't crash, but RAG/similarity search won't work.
/// </summary>
internal sealed class NullEmbeddingGenerator : IEmbeddingGenerator<string, Embedding<float>>
{
    public EmbeddingGeneratorMetadata Metadata { get; } = new("null", null, null, 0);

    public Task<GeneratedEmbeddings<Embedding<float>>> GenerateAsync(
        IEnumerable<string> values,
        EmbeddingGenerationOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var embeddings = values
            .Select(_ => new Embedding<float>(Array.Empty<float>()))
            .ToList();
        return Task.FromResult(new GeneratedEmbeddings<Embedding<float>>(embeddings));
    }

    public void Dispose() { }
    public object? GetService(Type serviceType, object? serviceKey = null) => null;
}
