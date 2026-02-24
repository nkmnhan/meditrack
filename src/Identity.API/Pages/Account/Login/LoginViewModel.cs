namespace MediTrack.Identity.Pages.Account.Login;

public class LoginViewModel
{
    public bool AllowRememberLogin { get; set; } = true;
    public bool EnableLocalLogin { get; set; } = true;
    public IEnumerable<ExternalProvider> ExternalProviders { get; set; } = [];
    public IEnumerable<ExternalProvider> VisibleExternalProviders =>
        ExternalProviders.Where(provider => !string.IsNullOrWhiteSpace(provider.DisplayName));
    public bool IsExternalLoginOnly => !EnableLocalLogin && ExternalProviders.Count() == 1;
    public string? ExternalLoginScheme =>
        IsExternalLoginOnly ? ExternalProviders.SingleOrDefault()?.AuthenticationScheme : null;
}

public class ExternalProvider
{
    public string? DisplayName { get; set; }
    public string? AuthenticationScheme { get; set; }
}
