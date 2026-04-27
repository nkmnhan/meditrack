namespace Clara.API.Services;

public sealed class SttProviderFactory : ISttProviderFactory
{
    private readonly IConfiguration _configuration;
    private readonly ISttProvider _deepgram;
    private readonly ISttProvider _whisper;

    public SttProviderFactory(
        IConfiguration configuration,
        [FromKeyedServices(SttProviderType.Deepgram)] ISttProvider deepgram,
        [FromKeyedServices(SttProviderType.Whisper)] ISttProvider whisper)
    {
        _configuration = configuration;
        _deepgram = deepgram;
        _whisper = whisper;
    }

    public ISttProvider GetProvider()
    {
        var configured = _configuration["AI:Stt:DefaultProvider"];
        return Enum.TryParse<SttProviderType>(configured, ignoreCase: true, out var providerType)
            ? Resolve(providerType)
            : _deepgram;
    }

    private ISttProvider Resolve(SttProviderType type) => type switch
    {
        SttProviderType.Whisper => _whisper,
        _ => _deepgram,
    };
}
