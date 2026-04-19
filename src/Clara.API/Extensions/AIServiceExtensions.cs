using System.ClientModel;
using System.Net.Http.Headers;
using Clara.API.Application.Models;
using Clara.API.Health;
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
/// Provider switching is config-only — set AI:ChatProvider to any value in AIProviderRegistry.All.
/// Embeddings always use OpenAI (Anthropic has no embedding model).
///
/// Each registered IChatClient is wrapped in a ChatClientBuilder pipeline:
///   leaf → UseLogging → UseOpenTelemetry → ResilienceChatClient (outermost)
/// </summary>
public static class AIServiceExtensions
{
    /// <summary>
    /// Registers keyed IChatClient instances and IEmbeddingGenerator.
    /// Chat provider is selected via AI:ChatProvider (any value in AIProviderRegistry.All).
    /// Embedding provider is always OpenAI (AI:OpenAI:ApiKey required regardless of chat provider).
    /// </summary>
    public static IServiceCollection AddAIServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Batch: cost-optimised (90% of calls)
        services.AddKeyedSingleton<IChatClient>(ChatClientKeys.Batch, (sp, _) =>
        {
            var opts = sp.GetRequiredService<IOptions<AIOptions>>().Value;
            var leaf = AIProviderRegistry.GetFor(opts).CreateChatClient(opts, opts.BatchModel);
            return BuildPipeline(leaf, sp);
        });

        // On-demand/urgent: accuracy-optimised (10% of calls)
        services.AddKeyedSingleton<IChatClient>(ChatClientKeys.OnDemand, (sp, _) =>
        {
            var opts = sp.GetRequiredService<IOptions<AIOptions>>().Value;
            var leaf = AIProviderRegistry.GetFor(opts).CreateChatClient(opts, opts.OnDemandModel);
            return BuildPipeline(leaf, sp);
        });

        // Default non-keyed client for backward compatibility — resolves to batch
        services.AddSingleton<IChatClient>(sp =>
            sp.GetRequiredKeyedService<IChatClient>(ChatClientKeys.Batch));

        // Embeddings always use OpenAI — Anthropic has no embedding model.
        // Missing/placeholder key degrades to a no-op generator (logs a warning) so Claude-only
        // setups can still run without RAG/knowledge features.
        services.AddSingleton<IEmbeddingGenerator<string, Embedding<float>>>(sp =>
        {
            var opts = sp.GetRequiredService<IOptions<AIOptions>>().Value;
            var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(AIServiceExtensions));
            if (!opts.OpenAI.IsConfigured)
            {
                logger.LogWarning(
                    "AI:OpenAI:ApiKey is not configured — embeddings disabled. " +
                    "Knowledge search and RAG features will not work.");
                return new NullEmbeddingGenerator();
            }
            var openAiClient = new OpenAIClient(new ApiKeyCredential(opts.OpenAI.ApiKey));
            return openAiClient.GetEmbeddingClient(opts.OpenAI.EmbeddingModel).AsIEmbeddingGenerator();
        });

        // Startup validator — enforces ChatProvider value + active provider key at launch.
        services.AddSingleton<IValidateOptions<AIOptions>, AIOptionsValidator>();

        // AI provider health checks — keyed by provider name, derived from registry.
        // Adding a provider to AIProviderRegistry.All automatically registers its health check.
        foreach (var registration in AIProviderRegistry.All)
        {
            var captured = registration;
            services.AddKeyedSingleton<IAiProviderHealthCheck>(captured.ProviderName,
                (sp, _) => captured.CreateHealthCheck(sp.GetRequiredService<IHttpClientFactory>()));
        }

        // Non-keyed default resolved from AI:ChatProvider config — used by ClaraHealthCheck.
        services.AddSingleton<IAiProviderHealthCheck>(sp =>
        {
            var opts = sp.GetRequiredService<IOptions<AIOptions>>().Value;
            var providerName = AIProviderRegistry.GetFor(opts).ProviderName;
            return sp.GetRequiredKeyedService<IAiProviderHealthCheck>(providerName);
        });

        return services;
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
            options.Retry.MaxRetryAttempts = 3;
            options.Retry.UseJitter = true;
            options.CircuitBreaker.FailureRatio = 0.5;
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
            options.CircuitBreaker.MinimumThroughput = 5;
            options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(30);
            options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(10);
            options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(30);
        });

        // OpenAI client (for health checks — actual LLM calls go through IChatClient)
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

        // Anthropic client (for health checks)
        services.AddHttpClient("Anthropic", client =>
        {
            client.BaseAddress = new Uri("https://api.anthropic.com/");
            var anthropicApiKey = configuration["AI:Anthropic:ApiKey"];
            if (!string.IsNullOrEmpty(anthropicApiKey))
            {
                client.DefaultRequestHeaders.Add("x-api-key", anthropicApiKey);
                client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
            }
        })
        .AddStandardResilienceHandler();

        // Patient.API client
        var patientApiUrl = configuration["Services:PatientApi"] ?? "https://patient-api:8443";
        services.AddHttpClient("PatientApi", client =>
        {
            client.BaseAddress = new Uri(patientApiUrl);
        })
        .AddStandardResilienceHandler();

        return services;
    }
}
