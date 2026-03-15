# Multi-Factor Authentication (MFA) Design

## Overview

MFA adds an additional layer of security beyond username/password authentication. For healthcare applications handling PHI, MFA is strongly recommended (and often required) for compliance with HIPAA Security Rule § 164.312(a)(2)(i) "Unique user identification".

## Recommended Approach: TOTP (Time-based One-Time Password)

### Why TOTP?
- **Standard**: RFC 6238 compliant, widely supported
- **Offline**: Works without SMS infrastructure (more reliable, cheaper)
- **User-friendly**: Compatible with Google Authenticator, Microsoft Authenticator, Authy, etc.
- **Secure**: Not vulnerable to SMS interception attacks

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | ASP.NET Core Identity + Duende IdentityServer | MFA enrollment, verification |
| **TOTP Library** | `OtpNet` NuGet package | Generate/verify TOTP codes |
| **QR Code** | `QRCoder` NuGet package | Generate QR codes for authenticator apps |
| **Frontend** | React + `qrcode.react` | Display QR code, collect TOTP input |

---

## Architecture

### Database Schema

Add to `Identity.API/Data/ApplicationDbContext.cs`:

```sql
-- Extend AspNetUsers table
ALTER TABLE AspNetUsers ADD 
    TwoFactorEnabled BIT NOT NULL DEFAULT 0,
    TwoFactorSecret NVARCHAR(256) NULL,
    TwoFactorRecoveryCodes NVARCHAR(MAX) NULL;  -- JSON array of backup codes
```

### Backend Implementation

#### 1. MFA Enrollment Endpoint

```csharp
// Identity.API/Controllers/MfaController.cs

[Authorize]
[ApiController]
[Route("api/mfa")]
public class MfaController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    
    [HttpPost("enable")]
    public async Task<IActionResult> EnableMfa()
    {
        var user = await _userManager.GetUserAsync(User);
        
        // Generate secret key
        var key = KeyGeneration.GenerateRandomKey(20);
        var secret = Base32Encoding.ToString(key);
        
        // Store secret (encrypted)
        user.TwoFactorSecret = secret;
        await _userManager.UpdateAsync(user);
        
        // Generate QR code URI
        var issuer = "MediTrack";
        var uri = $"otpauth://totp/{issuer}:{user.Email}?secret={secret}&issuer={issuer}";
        
        // Generate recovery codes
        var recoveryCodes = GenerateRecoveryCodes(8);
        user.TwoFactorRecoveryCodes = JsonSerializer.Serialize(recoveryCodes);
        await _userManager.UpdateAsync(user);
        
        return Ok(new 
        { 
            QrCodeUri = uri,
            ManualEntryKey = secret,
            RecoveryCodes = recoveryCodes
        });
    }
    
    [HttpPost("verify")]
    public async Task<IActionResult> VerifyMfa([FromBody] string code)
    {
        var user = await _userManager.GetUserAsync(User);
        
        // Verify TOTP code
        var otp = new Totp(Base32Encoding.ToBytes(user.TwoFactorSecret));
        if (otp.VerifyTotp(code, out _, new VerificationWindow(2, 2)))
        {
            user.TwoFactorEnabled = true;
            await _userManager.UpdateAsync(user);
            return Ok(new { Success = true });
        }
        
        return BadRequest(new { Error = "Invalid code" });
    }
    
    [HttpPost("disable")]
    public async Task<IActionResult> DisableMfa([FromBody] string password)
    {
        var user = await _userManager.GetUserAsync(User);
        
        // Require password confirmation to disable MFA
        if (!await _userManager.CheckPasswordAsync(user, password))
        {
            return Unauthorized(new { Error = "Invalid password" });
        }
        
        user.TwoFactorEnabled = false;
        user.TwoFactorSecret = null;
        user.TwoFactorRecoveryCodes = null;
        await _userManager.UpdateAsync(user);
        
        return Ok(new { Success = true });
    }
    
    private List<string> GenerateRecoveryCodes(int count)
    {
        var codes = new List<string>();
        for (int i = 0; i < count; i++)
        {
            var bytes = RandomNumberGenerator.GetBytes(4);
            codes.Add(Convert.ToHexString(bytes).ToLower());
        }
        return codes;
    }
}
```

#### 2. Login Flow with MFA

```csharp
// Identity.API/Pages/Account/Login/Index.cshtml.cs

public async Task<IActionResult> OnPostAsync()
{
    var result = await _signInManager.PasswordSignInAsync(
        Input.Email, 
        Input.Password, 
        Input.RememberMe, 
        lockoutOnFailure: true);
    
    if (result.Succeeded)
    {
        // Check if MFA is enabled
        var user = await _userManager.FindByEmailAsync(Input.Email);
        if (user.TwoFactorEnabled)
        {
            // Redirect to MFA verification page
            return RedirectToPage("/Account/LoginWith2fa", new 
            { 
                ReturnUrl = Input.ReturnUrl,
                RememberMe = Input.RememberMe 
            });
        }
        
        return LocalRedirect(Input.ReturnUrl);
    }
    
    // Handle other result cases...
}
```

```csharp
// Identity.API/Pages/Account/LoginWith2fa/Index.cshtml.cs

public class LoginWith2faModel : PageModel
{
    [BindProperty]
    public InputModel Input { get; set; }
    
    public class InputModel
    {
        [Required]
        [StringLength(6, MinimumLength = 6)]
        [Display(Name = "Authenticator code")]
        public string TwoFactorCode { get; set; }
        
        [Display(Name = "Remember this device")]
        public bool RememberDevice { get; set; }
    }
    
    public async Task<IActionResult> OnPostAsync()
    {
        var user = await _signInManager.GetTwoFactorAuthenticationUserAsync();
        
        // Verify TOTP
        var otp = new Totp(Base32Encoding.ToBytes(user.TwoFactorSecret));
        if (otp.VerifyTotp(Input.TwoFactorCode, out _, new VerificationWindow(2, 2)))
        {
            await _signInManager.SignInAsync(user, isPersistent: false);
            return LocalRedirect(ReturnUrl);
        }
        
        ModelState.AddModelError(string.Empty, "Invalid authenticator code");
        return Page();
    }
    
    public async Task<IActionResult> OnPostWithRecoveryCodeAsync()
    {
        var user = await _signInManager.GetTwoFactorAuthenticationUserAsync();
        var codes = JsonSerializer.Deserialize<List<string>>(user.TwoFactorRecoveryCodes);
        
        if (codes.Contains(Input.RecoveryCode.ToLower()))
        {
            // Remove used recovery code
            codes.Remove(Input.RecoveryCode.ToLower());
            user.TwoFactorRecoveryCodes = JsonSerializer.Serialize(codes);
            await _userManager.UpdateAsync(user);
            
            await _signInManager.SignInAsync(user, isPersistent: false);
            return LocalRedirect(ReturnUrl);
        }
        
        ModelState.AddModelError(string.Empty, "Invalid recovery code");
        return Page();
    }
}
```

---

### Frontend Implementation

#### 1. MFA Setup Component

```tsx
// src/features/auth/MfaSetup.tsx

import { useState } from "react";
import QRCode from "qrcode.react";
import { enableMfa, verifyMfa } from "./services/mfaService";

export function MfaSetup() {
  const [step, setStep] = useState<"setup" | "verify">("setup");
  const [qrData, setQrData] = useState<{
    qrCodeUri: string;
    manualEntryKey: string;
    recoveryCodes: string[];
  } | null>(null);
  const [code, setCode] = useState("");

  const handleEnableMfa = async () => {
    const data = await enableMfa();
    setQrData(data);
    setStep("verify");
  };

  const handleVerifyCode = async () => {
    const result = await verifyMfa(code);
    if (result.success) {
      // Show success + recovery codes
      alert("MFA enabled successfully! Save your recovery codes.");
    }
  };

  if (step === "setup") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-neutral-900">
          Enable Multi-Factor Authentication
        </h2>
        <p className="text-neutral-600">
          Add an extra layer of security to your account. You'll need an
          authenticator app like Google Authenticator or Microsoft Authenticator.
        </p>
        <button
          onClick={handleEnableMfa}
          className="bg-primary-700 hover:bg-primary-800 text-white px-6 py-3 rounded-lg"
        >
          Get Started
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-neutral-900">
        Scan QR Code
      </h2>
      
      {/* QR Code */}
      <div className="bg-white p-6 rounded-lg border border-neutral-200">
        <QRCode value={qrData!.qrCodeUri} size={256} />
      </div>

      {/* Manual entry */}
      <div className="bg-neutral-50 p-4 rounded-lg">
        <p className="text-sm text-neutral-600 mb-2">
          Can't scan? Enter this code manually:
        </p>
        <code className="text-sm font-mono bg-white px-3 py-2 rounded border border-neutral-200">
          {qrData!.manualEntryKey}
        </code>
      </div>

      {/* Verify code */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-neutral-700">
          Enter 6-digit code from your authenticator app
        </label>
        <input
          type="text"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="w-full px-4 py-3 text-center text-2xl tracking-widest font-mono border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          placeholder="000000"
        />
        <button
          onClick={handleVerifyCode}
          disabled={code.length !== 6}
          className="w-full bg-primary-700 hover:bg-primary-800 disabled:bg-neutral-300 text-white px-6 py-3 rounded-lg"
        >
          Verify & Enable MFA
        </button>
      </div>

      {/* Recovery codes warning */}
      <div className="bg-warning-50 border border-warning-200 p-4 rounded-lg">
        <p className="text-sm font-medium text-warning-800 mb-2">
          Save your recovery codes
        </p>
        <p className="text-sm text-warning-700 mb-3">
          Keep these codes safe. You'll need them if you lose access to your
          authenticator app.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {qrData!.recoveryCodes.map((code) => (
            <code
              key={code}
              className="text-sm font-mono bg-white px-3 py-2 rounded border border-warning-300"
            >
              {code}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### 2. MFA Login Component

```tsx
// src/features/auth/MfaLogin.tsx

import { useState } from "react";
import { verifyMfaCode, useRecoveryCode } from "./services/mfaService";

export function MfaLogin({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  const handleSubmit = async () => {
    const result = useRecovery
      ? await useRecoveryCode(code)
      : await verifyMfaCode(code);

    if (result.success) {
      onSuccess();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-neutral-900">
        Two-Factor Authentication
      </h2>

      {!useRecovery ? (
        <>
          <p className="text-neutral-600">
            Enter the 6-digit code from your authenticator app
          </p>
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-full px-4 py-3 text-center text-2xl tracking-widest font-mono border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="000000"
            autoFocus
          />
        </>
      ) : (
        <>
          <p className="text-neutral-600">
            Enter one of your 8-character recovery codes
          </p>
          <input
            type="text"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
            className="w-full px-4 py-3 text-center text-xl tracking-wider font-mono border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="abcd1234"
            autoFocus
          />
        </>
      )}

      <button
        onClick={handleSubmit}
        disabled={code.length < (useRecovery ? 8 : 6)}
        className="w-full bg-primary-700 hover:bg-primary-800 disabled:bg-neutral-300 text-white px-6 py-3 rounded-lg"
      >
        Verify
      </button>

      <button
        onClick={() => {
          setUseRecovery(!useRecovery);
          setCode("");
        }}
        className="w-full text-primary-700 hover:text-primary-800 text-sm"
      >
        {useRecovery ? "Use authenticator app" : "Use recovery code"}
      </button>
    </div>
  );
}
```

---

## Security Considerations

### 1. Secret Key Storage
- ❌ **Never** store TOTP secrets in plaintext
- ✅ Encrypt secrets using ASP.NET Core Data Protection API:

```csharp
public class MfaService
{
    private readonly IDataProtector _protector;
    
    public MfaService(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector("MediTrack.MfaSecrets");
    }
    
    public string EncryptSecret(string secret)
    {
        return _protector.Protect(secret);
    }
    
    public string DecryptSecret(string encryptedSecret)
    {
        return _protector.Unprotect(encryptedSecret);
    }
}
```

### 2. Recovery Codes
- Hash recovery codes before storing (like passwords)
- Invalidate used codes immediately
- Allow generating new recovery codes (requires password confirmation)
- Recommend storing offline (printed or in password manager)

### 3. Rate Limiting
- Limit attempts to prevent brute force (5 attempts → lockout for 30 minutes)
- Apply rate limiting to both TOTP and recovery code endpoints

### 4. Audit Logging
- Log all MFA events for compliance:
  - MFA enabled/disabled
  - Successful/failed verification attempts
  - Recovery code usage

```csharp
await _auditService.PublishMfaEventAsync(
    userId: user.Id,
    action: "MFA_ENABLED",
    success: true,
    ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString()
);
```

---

## User Experience Best Practices

### 1. Gradual Rollout
- **Optional by default** → encourage adoption with UI prompts
- **Mandatory for admins** after 30 days grace period
- **Mandatory for all users** after 90 days (configurable)

### 2. Device Trust (Optional)
- "Remember this device for 30 days" checkbox
- Store device fingerprint cookie (signed, httpOnly)
- Skip MFA prompt for trusted devices

### 3. Backup Methods
- Always provide recovery codes as backup
- Consider SMS backup (less secure, but better than account lockout)

### 4. Clear Instructions
- Step-by-step onboarding wizard
- Video/screenshots showing how to use authenticator apps
- FAQ: "What if I lose my phone?"

---

## Testing

### Unit Tests

```csharp
[Fact]
public void VerifyTotp_ValidCode_ReturnsTrue()
{
    // Arrange
    var secret = "JBSWY3DPEHPK3PXP";
    var otp = new Totp(Base32Encoding.ToBytes(secret));
    var code = otp.ComputeTotp();
    
    // Act
    var result = otp.VerifyTotp(code, out _);
    
    // Assert
    Assert.True(result);
}

[Fact]
public void VerifyTotp_ExpiredCode_ReturnsFalse()
{
    // Use mocked time to test time windows
}
```

### Integration Tests

```csharp
[Fact]
public async Task MfaLogin_ValidCode_ReturnsToken()
{
    // 1. Enable MFA for test user
    // 2. Login with password
    // 3. Submit valid TOTP code
    // 4. Assert token is returned
}
```

---

## HIPAA Compliance Notes

MFA addresses:
- **HIPAA Security Rule § 164.312(a)(2)(i)**: "Unique user identification" (person and possession factors)
- **HIPAA Security Rule § 164.312(d)**: "Person or entity authentication"

Audit requirements:
- Log all authentication attempts (successful and failed)
- Monitor for unusual patterns (repeated failures, recovery code usage spikes)
- Include MFA status in user access reports

---

## Future Enhancements

1. **WebAuthn / FIDO2** — hardware security keys (YubiKey, Touch ID, Windows Hello)
2. **Push notifications** — approve logins via mobile app (like Duo, Okta Verify)
3. **Risk-based MFA** — only prompt for suspicious logins (new device, location, time)
4. **Adaptive authentication** — vary challenge based on risk score
5. **Passwordless** — FIDO2 + biometrics only (no password at all)

---

## References

- [RFC 6238 - TOTP](https://datatracker.ietf.org/doc/html/rfc6238)
- [OWASP Multi-Factor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [Duende IdentityServer - Two-Factor Authentication](https://docs.duendesoftware.com/identityserver/v7/ui/login/two_factor/)
- [NIST SP 800-63B - Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
