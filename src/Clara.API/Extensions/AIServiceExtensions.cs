using System.ClientModel;
using System.Net.Http.Headers;
using Microsoft.Extensions.AI;
using OpenAI;

namespace Clara.API.Extensions;

/// <summary>
/// Extension methods for registering AI services (IChatClient, IEmbeddingGenerator)
/// and resilient HTTP clients (Deepgram, OpenAI, PatientApi).
/// </summary>
public static class AIServiceExtensions
{
    /// <summary>
    /// Registers IChatClient and IEmbeddingGenerator with Microsoft.Extensions.AI abstraction layer.
    /// Note: OpenTelemetry integration will be added when M.E.AI.OpenTelemetry package is available.
    /// </summary>
    public static IServiceCollection AddAIServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var openAiApiKey = configuration["AI:OpenAI:ApiKey"] 
            ?? throw new InvalidOperationException("AI:OpenAI:ApiKey is not configured");
        var chatModel = configuration["AI:OpenAI:ChatModel"] ?? "gpt-4o-mini";
        var embeddingModel = configuration["AI:OpenAI:EmbeddingModel"] ?? "text-embedding-3-small";

        // Create OpenAI client (shared for both chat and embeddings)
        var openAiClient = new OpenAIClient(new ApiKeyCredential(openAiApiKey));

        // Register IChatClient (LLM abstraction)
        // IChatClient wraps the OpenAI chat client for LLM-agnostic API surface
        services.AddSingleton<IChatClient>(sp =>
            openAiClient.GetChatClient(chatModel).AsIChatClient());

        // Register IEmbeddingGenerator (embedding abstraction)
        // IEmbeddingGenerator<string, Embedding<float>> wraps the OpenAI embedding client
        services.AddSingleton<IEmbeddingGenerator<string, Embedding<float>>>(sp =>
            openAiClient.GetEmbeddingClient(embeddingModel).AsIEmbeddingGenerator());

        return services;
    }

    /// <summary>
    /// Registers resilient HTTP clients for external AI services.
    /// Uses Polly v8 via AddStandardResilienceHandler for retry, circuit breaker, timeout.
    /// </summary>
    public static IServiceCollection AddResilientHttpClients(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Deepgram STT client
        services.AddHttpClient("Deepgram", client =>
        {
            client.BaseAddress = new Uri("https://api.deepgram.com/");
            var deepgramApiKey = configuration["AI:Deepgram:ApiKey"];
            if (!string.IsNullOrEmpty(deepgramApiKey) && deepgramApiKey != "REPLACE_IN_OVERRIDE")
            {
                client.DefaultRequestHeaders.Authorization = 
                    new AuthenticationHeaderValue("Token", deepgramApiKey);
            }
        })
        .AddStandardResilienceHandler(options =>
        {
            // Retry: 3 attempts, exponential backoff with jitter
            options.Retry.MaxRetryAttempts = 3;
            options.Retry.UseJitter = true;

            // Circuit breaker: open after 50% failure rate in 30s window
            options.CircuitBreaker.FailureRatio = 0.5;
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
            options.CircuitBreaker.MinimumThroughput = 5;
            options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(30);

            // Timeout: don't hang on slow Deepgram responses
            options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(10);
            options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(30);
        });

        // OpenAI client (for health checks - actual LLM calls go through IChatClient)
        services.AddHttpClient("OpenAI", client =>
        {
            client.BaseAddress = new Uri("https://api.openai.com/");
            var openAiApiKey = configuration["AI:OpenAI:ApiKey"];
            if (!string.IsNullOrEmpty(openAiApiKey) && openAiApiKey != "REPLACE_IN_OVERRIDE")
            {
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", openAiApiKey);
            }
        })
        .AddStandardResilienceHandler();

        // Patient.API client - for fetching patient context
        var patientApiUrl = configuration["Services:PatientApi"] ?? "https://patient-api:8443";
        services.AddHttpClient("PatientApi", client =>
        {
            client.BaseAddress = new Uri(patientApiUrl);
        })
        .AddStandardResilienceHandler();

        return services;
    }
}
