namespace Clara.API.Health;

internal sealed class OpenAIProviderHealthCheck : HttpProviderHealthCheck
{
    public OpenAIProviderHealthCheck(IHttpClientFactory factory) : base(factory) { }
    public override string ProviderName => "openai";
    protected override string HttpClientName => "OpenAI";
}
