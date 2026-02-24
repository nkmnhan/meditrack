# Multi-Factor Authentication (MFA) Implementation Guide

## Overview

MFA adds an additional layer of security beyond passwords, required for HIPAA compliance when accessing PHI. This implementation uses TOTP (Time-based One-Time Password) compatible with authenticator apps like Google Authenticator, Microsoft Authenticator, or Authy.

## Architecture

```
┌─────────────────┐
│   User Login    │
│   (Username +   │
│    Password)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Identity.API   │
│  Credentials    │
│  Validation     │
└────────┬────────┘
         │
         ▼
    Is MFA Enabled?
         │
    ┌────┴────┐
    │   No    │   Yes
    │         │    │
    ▼         ▼    ▼
 Issue     Request
 Token     MFA Code
           │
           ▼
       Validate TOTP
           │
           ▼
       Issue Token
```

## Implementation Steps

### 1. Add Required NuGet Packages

Add to `Identity.API.csproj`:

```xml
<PackageReference Include="QRCoder" />
```

Add to `Directory.Packages.props`:

```xml
<PackageVersion Include="QRCoder" Version="1.6.0" />
```

### 2. Update User Model

Extend `ApplicationUser` to store MFA settings:

```csharp
public class ApplicationUser : IdentityUser
{
    // Existing properties...
    
    // MFA properties
    public bool IsMfaEnabled { get; set; }
    public string? MfaSecretKey { get; set; }  // Encrypted TOTP secret
    public DateTimeOffset? MfaEnabledAt { get; set; }
    public int MfaBackupCodesRemaining { get; set; }
    public string? MfaBackupCodesHash { get; set; }  // Hashed backup codes
}
```

### 3. Create MFA Service

**Services/MfaService.cs**

```csharp
using System.Security.Cryptography;
using System.Text;
using QRCoder;

namespace Identity.API.Services;

public interface IMfaService
{
    string GenerateSecretKey();
    string GenerateQRCodeUri(string email, string secretKey);
    byte[] GenerateQRCode(string qrCodeUri);
    bool ValidateTotp(string secretKey, string code);
    List<string> GenerateBackupCodes(int count = 10);
    string HashBackupCodes(List<string> codes);
    bool ValidateBackupCode(string code, string hash);
}

public class MfaService : IMfaService
{
    private const string Issuer = "MediTrack Healthcare";
    private const int TotpStepSeconds = 30;
    private const int TotpDigits = 6;

    public string GenerateSecretKey()
    {
        // Generate a 160-bit (20-byte) secret key (Base32 encoded)
        var key = new byte[20];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(key);
        }
        return Base32Encode(key);
    }

    public string GenerateQRCodeUri(string email, string secretKey)
    {
        // Format: otpauth://totp/{Issuer}:{Email}?secret={SecretKey}&issuer={Issuer}
        return $"otpauth://totp/{Uri.EscapeDataString(Issuer)}:{Uri.EscapeDataString(email)}" +
               $"?secret={secretKey}&issuer={Uri.EscapeDataString(Issuer)}&digits={TotpDigits}&period={TotpStepSeconds}";
    }

    public byte[] GenerateQRCode(string qrCodeUri)
    {
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(qrCodeUri, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrCodeData);
        return qrCode.GetGraphic(20);
    }

    public bool ValidateTotp(string secretKey, string code)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Length != TotpDigits)
        {
            return false;
        }

        var key = Base32Decode(secretKey);
        var unixTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var timestep = unixTime / TotpStepSeconds;

        // Check current timestep and one step before/after (to account for clock drift)
        for (var offset = -1; offset <= 1; offset++)
        {
            var expectedCode = GenerateTotpCode(key, timestep + offset);
            if (code == expectedCode)
            {
                return true;
            }
        }

        return false;
    }

    public List<string> GenerateBackupCodes(int count = 10)
    {
        var codes = new List<string>();
        for (var i = 0; i < count; i++)
        {
            var code = GenerateBackupCode();
            codes.Add(code);
        }
        return codes;
    }

    public string HashBackupCodes(List<string> codes)
    {
        // Store hashed codes (one hash per line)
        var hashes = codes.Select(code => HashSingleCode(code));
        return string.Join(Environment.NewLine, hashes);
    }

    public bool ValidateBackupCode(string code, string hash)
    {
        var codeHash = HashSingleCode(code);
        var hashes = hash.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries);
        return hashes.Contains(codeHash);
    }

    // Private helper methods

    private string GenerateTotpCode(byte[] key, long timestep)
    {
        var timestepBytes = BitConverter.GetBytes(timestep);
        if (BitConverter.IsLittleEndian)
        {
            Array.Reverse(timestepBytes);
        }

        using var hmac = new HMACSHA1(key);
        var hash = hmac.ComputeHash(timestepBytes);

        var offset = hash[^1] & 0x0F;
        var binary =
            ((hash[offset] & 0x7F) << 24) |
            ((hash[offset + 1] & 0xFF) << 16) |
            ((hash[offset + 2] & 0xFF) << 8) |
            (hash[offset + 3] & 0xFF);

        var otp = binary % (int)Math.Pow(10, TotpDigits);
        return otp.ToString($"D{TotpDigits}");
    }

    private string GenerateBackupCode()
    {
        // Generate 8-character alphanumeric code
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding ambiguous chars
        var code = new char[8];
        using var rng = RandomNumberGenerator.Create();
        var data = new byte[8];
        rng.GetBytes(data);

        for (var i = 0; i < 8; i++)
        {
            code[i] = chars[data[i] % chars.Length];
        }

        return new string(code);
    }

    private string HashSingleCode(string code)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(code);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    private static string Base32Encode(byte[] data)
    {
        const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var result = new StringBuilder((data.Length * 8 + 4) / 5);

        for (var i = 0; i < data.Length; i += 5)
        {
            var byteCount = Math.Min(5, data.Length - i);
            ulong buffer = 0;

            for (var j = 0; j < byteCount; j++)
            {
                buffer = (buffer << 8) | data[i + j];
            }

            var bitCount = byteCount * 8;
            while (bitCount > 0)
            {
                var index = bitCount >= 5
                    ? (int)((buffer >> (bitCount - 5)) & 0x1F)
                    : (int)((buffer & (ulong)((1 << bitCount) - 1)) << (5 - bitCount));

                result.Append(alphabet[index]);
                bitCount -= 5;
            }
        }

        return result.ToString();
    }

    private static byte[] Base32Decode(string encoded)
    {
        const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        encoded = encoded.TrimEnd('=').ToUpperInvariant();

        var result = new List<byte>();
        var buffer = 0;
        var bitsRemaining = 0;

        foreach (var c in encoded)
        {
            var value = alphabet.IndexOf(c);
            if (value < 0)
            {
                throw new ArgumentException("Invalid Base32 character", nameof(encoded));
            }

            buffer = (buffer << 5) | value;
            bitsRemaining += 5;

            if (bitsRemaining >= 8)
            {
                result.Add((byte)(buffer >> (bitsRemaining - 8)));
                bitsRemaining -= 8;
            }
        }

        return result.ToArray();
    }
}
```

### 4. MFA Enrollment API

**Controllers/MfaController.cs**

```csharp
using Identity.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Identity.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MfaController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IMfaService _mfaService;

    public MfaController(UserManager<ApplicationUser> userManager, IMfaService mfaService)
    {
        _userManager = userManager;
        _mfaService = mfaService;
    }

    [HttpPost("enroll")]
    public async Task<IActionResult> Enroll()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return Unauthorized();
        }

        if (user.IsMfaEnabled)
        {
            return BadRequest(new { message = "MFA is already enabled" });
        }

        // Generate secret key
        var secretKey = _mfaService.GenerateSecretKey();
        user.MfaSecretKey = secretKey; // TODO: Encrypt before storing!
        await _userManager.UpdateAsync(user);

        // Generate QR code
        var qrCodeUri = _mfaService.GenerateQRCodeUri(user.Email!, secretKey);
        var qrCodeImage = _mfaService.GenerateQRCode(qrCodeUri);

        return Ok(new
        {
            secretKey,
            qrCodeUri,
            qrCodeImage = Convert.ToBase64String(qrCodeImage)
        });
    }

    [HttpPost("verify-and-enable")]
    public async Task<IActionResult> VerifyAndEnable([FromBody] VerifyMfaRequest request)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(user.MfaSecretKey))
        {
            return BadRequest(new { message = "MFA enrollment not started. Call /enroll first." });
        }

        // Validate TOTP code
        if (!_mfaService.ValidateTotp(user.MfaSecretKey, request.Code))
        {
            return BadRequest(new { message = "Invalid verification code" });
        }

        // Generate backup codes
        var backupCodes = _mfaService.GenerateBackupCodes(10);
        user.MfaBackupCodesHash = _mfaService.HashBackupCodes(backupCodes);
        user.MfaBackupCodesRemaining = backupCodes.Count;

        // Enable MFA
        user.IsMfaEnabled = true;
        user.MfaEnabledAt = DateTimeOffset.UtcNow;
        await _userManager.UpdateAsync(user);

        return Ok(new
        {
            message = "MFA enabled successfully",
            backupCodes // Show once, user must save them
        });
    }

    [HttpPost("disable")]
    public async Task<IActionResult> Disable([FromBody] DisableMfaRequest request)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return Unauthorized();
        }

        if (!user.IsMfaEnabled)
        {
            return BadRequest(new { message = "MFA is not enabled" });
        }

        // Verify password before disabling
        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            return BadRequest(new { message = "Invalid password" });
        }

        // Disable MFA
        user.IsMfaEnabled = false;
        user.MfaSecretKey = null;
        user.MfaBackupCodesHash = null;
        user.MfaBackupCodesRemaining = 0;
        await _userManager.UpdateAsync(user);

        return Ok(new { message = "MFA disabled successfully" });
    }
}

public record VerifyMfaRequest(string Code);
public record DisableMfaRequest(string Password);
```

### 5. Update Login Flow

**Pages/Account/Login.cshtml.cs**

```csharp
// After password validation success:
if (user.IsMfaEnabled)
{
    // Redirect to MFA challenge page
    return RedirectToPage("./LoginWith2fa", new { ReturnUrl = returnUrl });
}

// Otherwise, sign in normally
await _signInManager.SignInAsync(user, isPersistent: false);
```

**Pages/Account/LoginWith2fa.cshtml**

```html
@page
@model LoginWith2faModel
<h1>Two-factor authentication</h1>
<form method="post">
    <p>Enter the 6-digit code from your authenticator app.</p>
    <input asp-for="Input.Code" />
    <button type="submit">Verify</button>
    
    <p>Or use a backup code:</p>
    <a asp-page="./LoginWithBackupCode">Use backup code</a>
</form>
```

**Pages/Account/LoginWith2fa.cshtml.cs**

```csharp
public async Task<IActionResult> OnPostAsync()
{
    var user = await _signInManager.GetTwoFactorAuthenticationUserAsync();
    if (user == null)
    {
        return RedirectToPage("./Login");
    }

    if (!_mfaService.ValidateTotp(user.MfaSecretKey, Input.Code))
    {
        ModelState.AddModelError(string.Empty, "Invalid verification code");
        return Page();
    }

    await _signInManager.SignInAsync(user, isPersistent: false);
    return LocalRedirect(ReturnUrl ?? "/");
}
```

### 6. Register Services

**Program.cs**

```csharp
builder.Services.AddScoped<IMfaService, MfaService>();
```

## Security Considerations

### 1. Encrypt MFA Secrets

**NEVER** store TOTP secrets in plaintext! Use Data Protection API:

```csharp
public class EncryptedMfaService : IMfaService
{
    private readonly IDataProtector _protector;
    private readonly IMfaService _inner;

    public EncryptedMfaService(
        IDataProtectionProvider provider,
        IMfaService inner)
    {
        _protector = provider.CreateProtector("MediTrack.MFA.SecretKey");
        _inner = inner;
    }

    public string EncryptSecret(string secret)
    {
        return _protector.Protect(secret);
    }

    public string DecryptSecret(string encryptedSecret)
    {
        return _protector.Unprotect(encryptedSecret);
    }

    // Wrap other methods...
}
```

### 2. Rate Limiting

Prevent brute-force attacks on MFA codes:

```csharp
[RateLimit(5, "1m")] // Max 5 attempts per minute
[HttpPost("verify-and-enable")]
public async Task<IActionResult> VerifyAndEnable([FromBody] VerifyMfaRequest request)
{
    // ...
}
```

### 3. Backup Codes

- Generate 10 single-use backup codes
- Store as hashed values (SHA-256)
- Display only once at enrollment
- Allow user to regenerate (but deactivates old codes)

### 4. Account Recovery

If user loses MFA device:
1. Require additional verification (email + SMS, or security questions)
2. Notify via email of MFA reset
3. Log security event in audit trail

## Testing

### Manual Testing

1. Install Google Authenticator on phone
2. Enroll in MFA via `/api/mfa/enroll`
3. Scan QR code
4. Verify with generated code
5. Save backup codes
6. Log out and test login with MFA

### Unit Testing

```csharp
[Fact]
public void ValidateTotp_WithCorrectCode_ReturnsTrue()
{
    var service = new MfaService();
    var secret = service.GenerateSecretKey();
    
    // Manually calculate expected code for current timestep
    var code = CalculateExpectedCode(secret);
    
    var result = service.ValidateTotp(secret, code);
    
    Assert.True(result);
}
```

## HIPAA Compliance

MFA satisfies:
- **§164.312(a)(2)(i)** — Unique User Identification (Required)
- **§164.312(d)** — Person or Entity Authentication (Required)

### Audit Requirements

Log all MFA events:
- MFA enrollment
- MFA verification success/failure
- MFA disabled
- Backup code usage
- Failed MFA attempts (potential security incident)

## References

- [RFC 6238 - TOTP](https://datatracker.ietf.org/doc/html/rfc6238)
- [RFC 4226 - HOTP](https://datatracker.ietf.org/doc/html/rfc4226)
- [NIST SP 800-63B - Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
