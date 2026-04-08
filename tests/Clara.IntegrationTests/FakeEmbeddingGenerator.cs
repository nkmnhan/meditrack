using Microsoft.Extensions.AI;

namespace Clara.IntegrationTests;

/// <summary>
/// Returns zero-vectors for all embedding requests.
/// Used by integration tests to avoid calling the real OpenAI API.
/// </summary>
public sealed class FakeEmbeddingGenerator : IEmbeddingGenerator<string, Embedding<float>>
{
    private const int Dimensions = 1536;

    public EmbeddingGeneratorMetadata Metadata { get; } = new("fake");

    public Task<GeneratedEmbeddings<Embedding<float>>> GenerateAsync(
        IEnumerable<string> values,
        EmbeddingGenerationOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var embeddings = values.Select(_ => new Embedding<float>(new float[Dimensions]));
        return Task.FromResult(new GeneratedEmbeddings<Embedding<float>>(embeddings.ToList()));
    }

    public object? GetService(Type serviceType, object? serviceKey = null) => null;

    public void Dispose() { }
}
