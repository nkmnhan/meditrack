using System.ClientModel;
using System.Net.Http.Headers;
using Anthropic.SDK;
using Clara.API.Application.Models;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Options;
using OpenAI;
using Polly;
using Polly.Retry;
using Polly.Timeout;

namespace Clara.API.Extensions;

/// <summary>
/// Extension methods for registering AI services (IChatClient, IEmbeddingGenerator)
/// and resilient HTTP clients (Deepgram, OpenAI, PatientApi).
///
/// Provider switching is config-only — set AI:ChatProvider to "anthropic" or "openai".
/// Embeddings always use OpenAI (Anthropic has no embedding model).
///
/// Each registered IChatClient is wrapped in a ChatClientBuilder pipeline:
///   leaf → UseLogging → UseOpenTelemetry → ResilienceChatClient (outermost)
/// </summary>
public static class AIServiceExtensions
{
    /// <summary>
    /// Registers keyed IChatClient instances and IEmbeddingGenerator.
    /// Chat provider is selected via AI:ChatProvider ("openai" | "anthropic").
    /// Embedding provider is always OpenAI (AI:OpenAI:ApiKey required regardless of chat provider).
    /// </summary>
    public static IServiceCollection AddAIServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Batch: cost-optimised (90% of calls)
        services.AddKeyedSingleton<IChatClient>("batch", (sp, _) =>
        {
            var opts = sp.GetRequiredService<IOptions<AIOptions>>().Value;
            var leaf = CreateChatClient(opts, opts.BatchModel);
            return BuildPipeline(leaf, sp);
        });

        // On-demand/urgent: accuracy-optimised (10% of calls)
        services.AddKeyedSingleton<IChatClient>("ondemand", (sp, _) =>
        {
            var opts = sp.GetRequiredService<IOptions<AIOptions>>().Value;
            var leaf = CreateChatClient(opts, opts.OnDemandModel);
            return BuildPipeline(leaf, sp);
        });

        // Default non-keyed client for backward compatibility — resolves to batch
        services.AddSingleton<IChatClient>(sp =>
            sp.GetRequiredKeyedService<IChatClient>("batch"));

        // Embeddings always use OpenAI — Anthropic has no embedding model
        services.AddSingleton<IEmbeddingGenerator<string, Embedding<float>>>(sp =>
        {
            var opts = sp.GetRequiredService<IOptions<AIOptions>>().Value;
            if (string.IsNullOrEmpty(opts.OpenAI.ApiKey))
                throw new InvalidOperationException("AI:OpenAI:ApiKey is required for embeddings");
            var openAiClient = new OpenAIClient(new ApiKeyCredential(opts.OpenAI.ApiKey));
            return openAiClient.GetEmbeddingClient(opts.OpenAI.EmbeddingModel).AsIEmbeddingGenerator();
        });

        return services;
    }

    private static IChatClient CreateChatClient(AIOptions opts, string model) =>
        opts.ChatProvider.ToLowerInvariant() switch
        {
            "anthropic" => CreateAnthropicClient(opts, model),
            _ => CreateOpenAIClient(opts, model)
        };

    private static IChatClient CreateOpenAIClient(AIOptions opts, string model)
    {
        if (string.IsNullOrEmpty(opts.OpenAI.ApiKey))
            throw new InvalidOperationException("AI:OpenAI:ApiKey is not configured");

        return new OpenAIClient(new ApiKeyCredential(opts.OpenAI.ApiKey))
            .GetChatClient(model)
            .AsIChatClient();
    }

    private static IChatClient CreateAnthropicClient(AIOptions opts, string model)
    {
        if (string.IsNullOrEmpty(opts.Anthropic.ApiKey))
            throw new InvalidOperationException("AI:Anthropic:ApiKey is not configured");

        return new AnthropicChatClientAdapter(new AnthropicClient(opts.Anthropic.ApiKey), model);
    }

    /// <summary>
    /// Wraps a leaf IChatClient in the full observability + resilience pipeline:
    ///   leaf → UseLogging → UseOpenTelemetry → ResilienceChatClient
    ///
    /// Pipeline order: outermost middleware runs first on the way in / last on the way out.
    /// Resilience is outermost so it retries the full instrumented call.
    /// </summary>
    private static IChatClient BuildPipeline(IChatClient leaf, IServiceProvider sp)
    {
        var loggerFactory = sp.GetRequiredService<ILoggerFactory>();

        var resiliencePipeline = new ResiliencePipelineBuilder<ChatResponse>()
            .AddRetry(new RetryStrategyOptions<ChatResponse>
            {
                MaxRetryAttempts = 3,
                BackoffType = DelayBackoffType.Exponential,
                UseJitter = true,
                Delay = TimeSpan.FromSeconds(1),
                ShouldHandle = new PredicateBuilder<ChatResponse>()
                    .Handle<HttpRequestException>()
                    .Handle<TimeoutRejectedException>()
            })
            .AddTimeout(TimeSpan.FromSeconds(60))
            .Build();

        return new ChatClientBuilder(leaf)
            .UseLogging(loggerFactory)
            .UseOpenTelemetry(loggerFactory, sourceName: "Clara.AI")
            .Use(next => new ResilienceChatClient(next, resiliencePipeline))
            .Build();
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
