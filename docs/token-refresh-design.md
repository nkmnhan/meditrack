# Token Refresh & Silent Renew Design

## Overview

OAuth 2.0 access tokens are short-lived by design (5-30 minutes) to minimize the impact of token theft. Refresh tokens allow the client to obtain new access tokens without requiring the user to re-authenticate, providing a seamless user experience while maintaining security.

## Token Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User logs in                                             │
│    → IdentityServer returns:                                │
│       • access_token (5 min expiry)                         │
│       • refresh_token (7 days expiry, long-lived)           │
│       • id_token (identity claims)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ 2. React app uses access_token for API calls               │
│    → API validates JWT signature + expiration              │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ 3. Access token expires after 5 minutes                     │
│    → API returns 401 Unauthorized                           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ 4. Silent renew (automatic, background)                     │
│    → Exchange refresh_token for new access_token           │
│    → User stays logged in, no interruption                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ 5. Refresh token expires after 7 days (or revoked)         │
│    → User must re-authenticate                              │
│    → Redirect to login page                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Configuration (Duende IdentityServer)

### 1. Enable Refresh Tokens

```csharp
// Identity.API/IdentityServerConfig.cs

public static class IdentityServerConfig
{
    public static IEnumerable<Client> GetClients()
    {
        return new List<Client>
        {
            new Client
            {
                ClientId = "meditrack-web",
                ClientName = "MediTrack Web Application",
                
                AllowedGrantTypes = GrantTypes.Code, // Authorization Code Flow
                RequirePkce = true, // PKCE required for public clients
                RequireClientSecret = false, // React is a public client (no secret)
                
                RedirectUris = { "http://localhost:3000/callback" },
                PostLogoutRedirectUris = { "http://localhost:3000" },
                AllowedCorsOrigins = { "http://localhost:3000" },
                
                AllowedScopes = 
                {
                    IdentityServerConstants.StandardScopes.OpenId,
                    IdentityServerConstants.StandardScopes.Profile,
                    "patient-api",
                    "appointment-api",
                    "medicalrecords-api",
                    IdentityServerConstants.StandardScopes.OfflineAccess // Required for refresh tokens
                },
                
                // Token lifetimes
                AccessTokenLifetime = 300, // 5 minutes
                RefreshTokenLifetime = 604800, // 7 days (in seconds)
                
                // Refresh token behavior
                RefreshTokenUsage = TokenUsage.OneTimeOnly, // Refresh token is invalidated after use
                RefreshTokenExpiration = TokenExpiration.Absolute, // 7 days from issuance
                
                // Allow refresh token renewal
                AbsoluteRefreshTokenLifetime = 2592000, // 30 days maximum
                SlidingRefreshTokenLifetime = 604800, // 7 days sliding window
                UpdateAccessTokenClaimsOnRefresh = true, // Update user claims on refresh
                
                // Silent renew support
                AllowOfflineAccess = true // Enable refresh tokens (same as offline_access scope)
            }
        };
    }
}
```

### 2. Refresh Token Security

```csharp
// Identity.API/Program.cs

builder.Services.AddIdentityServer()
    .AddInMemoryClients(IdentityServerConfig.GetClients())
    .AddInMemoryIdentityResources(IdentityServerConfig.GetIdentityResources())
    .AddInMemoryApiScopes(IdentityServerConfig.GetApiScopes())
    .AddAspNetIdentity<ApplicationUser>()
    .AddProfileService<ProfileService>()
    
    // Token cleanup (remove revoked/expired tokens)
    .AddOperationalStore(options =>
    {
        options.EnableTokenCleanup = true;
        options.TokenCleanupInterval = 3600; // Run cleanup every hour
    });
```

### 3. Token Revocation Endpoint

```csharp
// Identity.API/Controllers/TokenController.cs

[ApiController]
[Route("api/tokens")]
public class TokenController : ControllerBase
{
    private readonly IPersistedGrantStore _persistedGrantStore;
    
    [Authorize]
    [HttpPost("revoke")]
    public async Task<IActionResult> RevokeToken([FromBody] string token)
    {
        var userId = User.FindFirst("sub")?.Value;
        
        // Revoke all refresh tokens for this user
        await _persistedGrantStore.RemoveAllAsync(new PersistedGrantFilter
        {
            SubjectId = userId,
            Type = "refresh_token"
        });
        
        return Ok();
    }
    
    [Authorize]
    [HttpPost("revoke-all")]
    public async Task<IActionResult> RevokeAllSessions()
    {
        var userId = User.FindFirst("sub")?.Value;
        
        // Revoke all grants (refresh tokens, authorization codes, etc.)
        await _persistedGrantStore.RemoveAllAsync(new PersistedGrantFilter
        {
            SubjectId = userId
        });
        
        return Ok();
    }
}
```

---

## Frontend Implementation (React + oidc-client-ts)

### 1. Configure UserManager for Automatic Renewal

```ts
// src/shared/auth/authConfig.ts

import { UserManagerSettings } from "oidc-client-ts";

export const authConfig: UserManagerSettings = {
  authority: import.meta.env.VITE_IDENTITY_URL,
  client_id: import.meta.env.VITE_CLIENT_ID,
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile patient-api appointment-api medicalrecords-api offline_access",
  
  // Automatic silent renew
  automaticSilentRenew: true, // Enable automatic token refresh
  silent_redirect_uri: `${window.location.origin}/silent-renew.html`, // iframe endpoint
  
  // Token management
  accessTokenExpiringNotificationTimeInSeconds: 60, // Alert 60s before expiry
  monitorSession: true, // Monitor session state (detect logout in other tabs)
  checkSessionIntervalInSeconds: 2, // Check every 2 seconds
  
  // Security
  loadUserInfo: true, // Fetch user profile after login
  filterProtocolClaims: true, // Remove protocol claims from user object
  
  // Storage (default is sessionStorage)
  userStore: new WebStorageStateStore({ store: window.localStorage })
};
```

### 2. Silent Renew HTML Page

Create a minimal HTML page that handles the silent renew callback in an iframe:

```html
<!-- public/silent-renew.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Silent Renew</title>
</head>
<body>
    <script src="https://unpkg.com/oidc-client-ts@3.0.1/dist/browser/oidc-client-ts.min.js"></script>
    <script>
        // This page runs in a hidden iframe and processes the silent renew callback
        new oidc.UserManager({ response_mode: "query" })
            .signinSilentCallback()
            .catch((error) => {
                console.error("Silent renew error:", error);
            });
    </script>
</body>
</html>
```

### 3. AuthProvider with Token Monitoring

```tsx
// src/shared/auth/AuthProvider.tsx

import { useEffect, useCallback } from "react";
import { AuthProvider as OidcAuthProvider, useAuth } from "react-oidc-context";
import { authConfig } from "./authConfig";

function TokenMonitor({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  // Handle access token expiring
  useEffect(() => {
    if (!auth.isAuthenticated) return;

    const handleAccessTokenExpiring = () => {
      console.log("Access token expiring soon, attempting silent renew...");
    };

    const handleAccessTokenExpired = () => {
      console.log("Access token expired, forcing silent renew...");
      auth.signinSilent().catch((error) => {
        console.error("Silent renew failed:", error);
        // Force user to re-login
        auth.signinRedirect();
      });
    };

    const handleSilentRenewError = (error: Error) => {
      console.error("Silent renew error:", error);
      
      // Common errors and recovery strategies
      if (error.message.includes("login_required")) {
        // User session expired on server, redirect to login
        auth.signinRedirect();
      } else if (error.message.includes("consent_required")) {
        // Consent was revoked, redirect to consent page
        auth.signinRedirect();
      } else {
        // Other errors, try one more time before giving up
        setTimeout(() => {
          auth.signinSilent().catch(() => auth.signinRedirect());
        }, 5000);
      }
    };

    const userManager = auth.settings;
    userManager.events.addAccessTokenExpiring(handleAccessTokenExpiring);
    userManager.events.addAccessTokenExpired(handleAccessTokenExpired);
    userManager.events.addSilentRenewError(handleSilentRenewError);

    return () => {
      userManager.events.removeAccessTokenExpiring(handleAccessTokenExpiring);
      userManager.events.removeAccessTokenExpired(handleAccessTokenExpired);
      userManager.events.removeSilentRenewError(handleSilentRenewError);
    };
  }, [auth]);

  // Handle user signed out (in another tab)
  useEffect(() => {
    if (!auth.isAuthenticated) return;

    const handleUserSignedOut = () => {
      console.log("User signed out in another tab");
      // Clear local state and redirect to login
      auth.removeUser();
      window.location.href = "/";
    };

    auth.settings.events.addUserSignedOut(handleUserSignedOut);

    return () => {
      auth.settings.events.removeUserSignedOut(handleUserSignedOut);
    };
  }, [auth]);

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <OidcAuthProvider {...authConfig}>
      <TokenMonitor>{children}</TokenMonitor>
    </OidcAuthProvider>
  );
}
```

### 4. Axios Interceptor for Token Refresh

```ts
// src/shared/api/axiosInstance.ts

import axios from "axios";
import { getAuthToken, refreshAuthToken, isTokenExpired } from "../auth/authUtils";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Request interceptor: attach token
axiosInstance.interceptors.request.use(
  async (config) => {
    let token = await getAuthToken();

    // Check if token is expired or about to expire (within 30 seconds)
    if (isTokenExpired(token, 30)) {
      try {
        // Attempt to refresh token
        token = await refreshAuthToken();
      } catch (error) {
        console.error("Token refresh failed:", error);
        // Redirect to login if refresh fails
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const newToken = await refreshAuthToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        // Retry original request with new token
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
```

### 5. Auth Utilities

```ts
// src/shared/auth/authUtils.ts

import { User } from "oidc-client-ts";

export async function getAuthToken(): Promise<string | null> {
  const oidcStorage = localStorage.getItem(`oidc.user:${import.meta.env.VITE_IDENTITY_URL}:${import.meta.env.VITE_CLIENT_ID}`);
  
  if (!oidcStorage) return null;
  
  const user: User = JSON.parse(oidcStorage);
  return user.access_token;
}

export async function refreshAuthToken(): Promise<string> {
  // react-oidc-context handles this automatically via automaticSilentRenew
  // This is a manual trigger if needed
  const userManager = new UserManager(authConfig);
  const user = await userManager.signinSilent();
  return user.access_token;
}

export function isTokenExpired(token: string | null, bufferSeconds: number = 0): boolean {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiry = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const buffer = bufferSeconds * 1000;
    
    return expiry - buffer < now;
  } catch {
    return true;
  }
}

export async function revokeAllTokens(): Promise<void> {
  // Call backend to revoke all refresh tokens
  await fetch(`${import.meta.env.VITE_IDENTITY_URL}/api/tokens/revoke-all`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getAuthToken()}`,
    },
  });
  
  // Clear local storage
  const userManager = new UserManager(authConfig);
  await userManager.removeUser();
}
```

---

## User Experience Considerations

### 1. Loading States

Show visual feedback during token refresh:

```tsx
// src/shared/components/TokenRefreshIndicator.tsx

import { useAuth } from "react-oidc-context";
import { Loader2 } from "lucide-react";

export function TokenRefreshIndicator() {
  const auth = useAuth();

  if (!auth.isLoading) return null;

  return (
    <div className="fixed top-4 right-4 bg-primary-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">Refreshing session...</span>
    </div>
  );
}
```

### 2. Session Expiry Warning

Warn users before refresh token expires:

```tsx
// src/shared/components/SessionExpiryWarning.tsx

import { useState, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { AlertTriangle } from "lucide-react";

export function SessionExpiryWarning() {
  const auth = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!auth.user) return;

    const checkExpiry = () => {
      const expiresAt = auth.user!.expires_at! * 1000;
      const now = Date.now();
      const remaining = expiresAt - now;

      // Show warning if less than 5 minutes remaining
      if (remaining < 300000 && remaining > 0) {
        setShowWarning(true);
        setTimeRemaining(Math.floor(remaining / 1000 / 60)); // Minutes
      } else {
        setShowWarning(false);
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [auth.user]);

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-warning-50 border border-warning-200 p-4 rounded-lg shadow-lg max-w-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-warning-600" />
        <div>
          <p className="text-sm font-medium text-warning-800">
            Session expiring soon
          </p>
          <p className="text-sm text-warning-700 mt-1">
            Your session will expire in {timeRemaining} minute{timeRemaining !== 1 ? "s" : ""}.
            Save your work or refresh the page to extend your session.
          </p>
          <button
            onClick={() => auth.signinSilent()}
            className="mt-3 text-sm text-warning-800 hover:text-warning-900 underline"
          >
            Extend session now
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Logout All Sessions

Provide a way for users to revoke all active sessions:

```tsx
// src/features/profile/SecuritySettings.tsx

import { revokeAllTokens } from "@/shared/auth/authUtils";

export function SecuritySettings() {
  const handleRevokeAllSessions = async () => {
    if (confirm("This will log you out from all devices. Continue?")) {
      await revokeAllTokens();
      window.location.href = "/login";
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-neutral-900">
        Active Sessions
      </h3>
      
      <div className="bg-neutral-50 p-4 rounded-lg">
        <p className="text-sm text-neutral-600 mb-3">
          Revoke all active sessions on all devices. You'll need to log in again.
        </p>
        <button
          onClick={handleRevokeAllSessions}
          className="bg-error-600 hover:bg-error-700 text-white px-4 py-2 rounded-lg"
        >
          Log out all devices
        </button>
      </div>
    </div>
  );
}
```

---

## Security Best Practices

### 1. Refresh Token Rotation
- **One-time use**: Invalidate refresh token after use, issue a new one
- **Prevents replay attacks**: Stolen tokens become useless after first use

### 2. Token Binding
- Bind refresh tokens to device fingerprint (IP, user-agent)
- Detect suspicious refresh attempts (different IP/device)

### 3. Refresh Token Revocation
- Immediate revocation on logout
- Automatic revocation on password change
- Admin can force-revoke user sessions

### 4. Audit Logging

```csharp
// Log all token refresh events
await _auditService.PublishAuthEventAsync(
    userId: user.Id,
    action: "TOKEN_REFRESHED",
    ipAddress: httpContext.Connection.RemoteIpAddress?.ToString(),
    userAgent: httpContext.Request.Headers["User-Agent"]
);

// Alert on suspicious patterns
if (IsUnusualRefreshPattern(user.Id))
{
    await _auditService.PublishSecurityEventAsync(
        userId: user.Id,
        severity: "HIGH",
        description: "Unusual token refresh pattern detected"
    );
}
```

---

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `login_required` | Session expired on server | Redirect to login |
| `consent_required` | Consent was revoked | Re-authenticate with consent prompt |
| `invalid_grant` | Refresh token expired/revoked | Redirect to login |
| `iframe_blocked` | Third-party cookies disabled | Use popup or redirect flow |

### Fallback Strategies

```tsx
// If silent renew fails, try manual redirect
const handleSilentRenewError = async (error: Error) => {
  if (error.message.includes("iframe_blocked")) {
    // Browser blocks third-party cookies, use popup instead
    try {
      await auth.signinPopup();
    } catch {
      // Popup blocked, use full redirect
      auth.signinRedirect();
    }
  } else {
    // Other errors, redirect to login
    auth.signinRedirect();
  }
};
```

---

## Testing

### Unit Tests

```ts
// Test token expiry detection
test("isTokenExpired returns true for expired token", () => {
  const expiredToken = createMockToken({ exp: Date.now() / 1000 - 3600 });
  expect(isTokenExpired(expiredToken)).toBe(true);
});

test("isTokenExpired respects buffer period", () => {
  const almostExpiredToken = createMockToken({ exp: Date.now() / 1000 + 20 });
  expect(isTokenExpired(almostExpiredToken, 30)).toBe(true); // Expires in 20s, buffer 30s
});
```

### Integration Tests

```ts
// Test silent renew flow
test("automatically refreshes token before expiry", async () => {
  // 1. Login
  const user = await userManager.signinRedirect();
  
  // 2. Fast-forward time to near expiry
  vi.advanceTimersByTime(4 * 60 * 1000); // 4 minutes (token expires in 5)
  
  // 3. Trigger access token expiring event
  await waitFor(() => {
    expect(mockSilentRenew).toHaveBeenCalled();
  });
  
  // 4. Verify new token
  const newUser = await userManager.getUser();
  expect(newUser!.access_token).not.toBe(user.access_token);
});
```

---

## HIPAA Compliance Notes

Token refresh addresses:
- **HIPAA Security Rule § 164.312(a)(2)(iii)**: "Automatic logoff" (short-lived tokens)
- **HIPAA Security Rule § 164.312(d)**: "User authentication" (continuous session validation)

Audit requirements:
- Log all token refresh events with timestamps
- Detect unusual refresh patterns (rapid refreshes, different IPs)
- Alert on failed refresh attempts (potential token theft)

---

## References

- [OAuth 2.0 RFC 6749 - Refresh Token](https://datatracker.ietf.org/doc/html/rfc6749#section-1.5)
- [OAuth 2.0 Token Revocation RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009)
- [oidc-client-ts Documentation](https://authts.github.io/oidc-client-ts/)
- [Duende IdentityServer - Refresh Tokens](https://docs.duendesoftware.com/identityserver/v7/tokens/refresh/)
