namespace Clara.API.Health;

internal sealed class AnthropicProviderHealthCheck : HttpProviderHealthCheck
{
    public AnthropicProviderHealthCheck(IHttpClientFactory factory) : base(factory) { }
    public override string ProviderName => "anthropic";
    protected override string HttpClientName => "Anthropic";
}
