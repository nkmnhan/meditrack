# Token Refresh and Silent Renew Implementation

## Overview

Implementing automatic token refresh and silent renew ensures:
- Users stay authenticated without interruption
- Expired tokens are refreshed before API calls fail
- Security: short-lived access tokens with longer-lived refresh tokens
- Better UX: no unexpected logouts during active sessions

## Token Types

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| **Access Token** | 15-60 minutes | Memory only | API authorization (JWT Bearer) |
| **Refresh Token** | 7-30 days | Secure storage | Obtain new access tokens |
| **ID Token** | Same as access | Memory only | User identity claims |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     React Application                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │           oidc-client-ts User Manager                  │  │
│  │  - Monitors token expiration                           │  │
│  │  - Triggers silent renew 5 min before expiry           │  │
│  │  - Opens hidden iframe for silent authentication       │  │
│  └───────────────────┬────────────────────────────────────┘  │
│                      │                                        │
│                      ▼                                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Hidden Iframe                             │  │
│  │  /silent-renew.html                                    │  │
│  │  - Redirects to Identity Server                        │  │
│  │  - Receives new tokens                                 │  │
│  │  - Posts message back to parent window                 │  │
│  └───────────────────┬────────────────────────────────────┘  │
│                      │                                        │
└──────────────────────┼────────────────────────────────────────┘
                       │
                       ▼
           ┌────────────────────────┐
           │   Identity Server      │
           │  - Validates session   │
           │  - Issues new tokens   │
           └────────────────────────┘
```

## Implementation Steps

### 1. Configure Identity Server for Silent Renew

Update `IdentityServerConfig.cs` to allow silent renew:

```csharp
new Client
{
    ClientId = "meditrack-web",
    ClientName = "MediTrack Web Client",
    AllowedGrantTypes = GrantTypes.Code,
    RequirePkce = true,
    RequireClientSecret = false,
    
    // Redirect URIs
    RedirectUris = {
        "http://localhost:3000/callback",
        "http://localhost:3000/silent-renew"  // ← Add this
    },
    PostLogoutRedirectUris = {
        "http://localhost:3000"
    },
    AllowedCorsOrigins = {
        "http://localhost:3000"
    },
    
    // Token lifetimes
    AccessTokenLifetime = 3600,        // 1 hour
    IdentityTokenLifetime = 3600,      // 1 hour
    RefreshTokenUsage = TokenUsage.ReusableToken,
    RefreshTokenExpiration = TokenExpiration.Sliding,
    AbsoluteRefreshTokenLifetime = 2592000,  // 30 days
    SlidingRefreshTokenLifetime = 1296000,   // 15 days
    
    AllowOfflineAccess = true,  // ← Enable refresh tokens
    
    AllowedScopes = {
        IdentityServerConstants.StandardScopes.OpenId,
        IdentityServerConstants.StandardScopes.Profile,
        IdentityServerConstants.StandardScopes.Email,
        IdentityServerConstants.StandardScopes.OfflineAccess,  // ← Required for refresh tokens
        "patient-api",
        "appointment-api",
        "records-api"
    }
}
```

### 2. Create Silent Renew Page

**public/silent-renew.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Silent Renew</title>
    <script src="https://cdn.jsdelivr.net/npm/oidc-client-ts@3/dist/browser/oidc-client-ts.min.js"></script>
</head>
<body>
    <script>
        // This page is loaded in a hidden iframe
        // It completes the silent authentication and returns tokens to the parent window
        new oidc.UserManager({}).signinSilentCallback();
    </script>
</body>
</html>
```

### 3. Update AuthContext Configuration

**src/features/auth/context/AuthContext.tsx**

```tsx
import { AuthProvider, AuthProviderProps } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";

const oidcConfig: AuthProviderProps = {
  authority: import.meta.env.VITE_IDENTITY_URL,
  client_id: import.meta.env.VITE_CLIENT_ID,
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: window.location.origin,
  
  // Silent renew configuration
  silent_redirect_uri: `${window.location.origin}/silent-renew`,
  automaticSilentRenew: true,           // ← Enable automatic silent renew
  silentRequestTimeoutInSeconds: 10,    // Timeout for iframe
  
  // Refresh token configuration
  scope: "openid profile email offline_access patient-api appointment-api records-api",
  
  // Token storage
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  
  // Token monitoring
  accessTokenExpiringNotificationTimeInSeconds: 300,  // Alert 5 min before expiry
  
  // Lifecycle hooks
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
  
  onSigninSilentCallback: () => {
    console.log("Silent renew successful");
  },
  
  onSigninSilentError: (error) => {
    console.error("Silent renew failed:", error);
    // Optionally redirect to login
  },
  
  onAccessTokenExpiring: () => {
    console.log("Access token expiring soon, triggering silent renew...");
  },
  
  onAccessTokenExpired: () => {
    console.warn("Access token expired!");
    // User will be redirected to login if silent renew fails
  },
  
  onUserLoaded: (user) => {
    console.log("User loaded:", user.profile.name);
  },
  
  onUserUnloaded: () => {
    console.log("User unloaded");
  },
  
  onUserSignedOut: () => {
    console.log("User signed out");
    window.location.href = "/";
  }
};

export function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider {...oidcConfig}>
      {children}
    </AuthProvider>
  );
}
```

### 4. Add Token Refresh Logic to Axios

**src/shared/services/axiosConfig.ts**

```tsx
import axios from "axios";
import { useAuth } from "react-oidc-context";

export function configureAxiosAuth(getUserAccessToken: () => string | undefined) {
  // Request interceptor: attach access token
  axios.interceptors.request.use(
    async (config) => {
      const token = getUserAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: handle 401 and trigger refresh
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If 401 and haven't retried yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Token refresh is handled automatically by oidc-client-ts
          // Just wait a moment and retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          const newToken = getUserAccessToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
}

// Setup hook
export function useAxiosAuthSetup() {
  const auth = useAuth();
  
  React.useEffect(() => {
    configureAxiosAuth(() => auth.user?.access_token);
  }, [auth.user?.access_token]);
}
```

### 5. Manual Token Refresh (Optional)

For cases where you need to manually trigger a token refresh:

```tsx
import { useAuth } from "react-oidc-context";

export function useTokenRefresh() {
  const auth = useAuth();
  
  const refreshToken = async () => {
    try {
      if (!auth.user || !auth.user.refresh_token) {
        throw new Error("No refresh token available");
      }
      
      // Trigger silent renew
      await auth.signinSilent();
      
      console.log("Token refreshed successfully");
      return true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      
      // Fallback: redirect to login
      auth.signinRedirect();
      return false;
    }
  };
  
  return { refreshToken };
}

// Usage in component
function MyComponent() {
  const { refreshToken } = useTokenRefresh();
  
  const handleRefresh = async () => {
    const success = await refreshToken();
    if (success) {
      // Token refreshed, retry API call
    }
  };
}
```

### 6. Token Expiration UI Indicator

Show users when their session will expire:

```tsx
import { useAuth } from "react-oidc-context";
import { useEffect, useState } from "react";

export function SessionExpiryIndicator() {
  const auth = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  useEffect(() => {
    if (!auth.user) return;
    
    const interval = setInterval(() => {
      const expiresAt = (auth.user?.expires_at ?? 0) * 1000;
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      setTimeRemaining(remaining);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [auth.user]);
  
  if (!auth.isAuthenticated || timeRemaining > 300000) {
    return null; // Don't show if > 5 minutes remaining
  }
  
  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  
  return (
    <div className="fixed bottom-4 right-4 bg-warning-50 border border-warning-200 rounded-lg p-4">
      <p className="text-sm font-medium text-warning-800">
        Session expiring in {minutes}:{seconds.toString().padStart(2, '0')}
      </p>
      <button
        onClick={() => auth.signinSilent()}
        className="mt-2 text-sm text-primary-700 hover:underline"
      >
        Extend session
      </button>
    </div>
  );
}
```

### 7. Update App Entry Point

**src/App.tsx**

```tsx
import { AuthProviderWrapper } from "@/features/auth/context/AuthContext";
import { useAxiosAuthSetup } from "@/shared/services/axiosConfig";
import { SessionExpiryIndicator } from "@/features/auth/components/SessionExpiryIndicator";

function AppContent() {
  useAxiosAuthSetup(); // Configure axios with auth tokens

  return (
    <>
      <Router>
        {/* Your routes */}
      </Router>
      <SessionExpiryIndicator />
    </>
  );
}

function App() {
  return (
    <AuthProviderWrapper>
      <AppContent />
    </AuthProviderWrapper>
  );
}

export default App;
```

## Testing

### Manual Testing

1. Log in to the app
2. Open browser DevTools → Network tab
3. Wait 5 minutes before access token expires
4. Observe silent renew iframe request
5. Verify new tokens are issued
6. Confirm API calls continue working

### Automated Testing

```tsx
import { render, waitFor } from "@testing-library/react";
import { AuthProvider } from "react-oidc-context";

test("automatically renews token before expiry", async () => {
  // Mock UserManager
  const mockUserManager = {
    signinSilent: jest.fn().mockResolvedValue({ access_token: "new-token" }),
    events: {
      addAccessTokenExpiring: jest.fn(),
      addAccessTokenExpired: jest.fn(),
    },
  };

  // Trigger expiry event
  await waitFor(() => {
    expect(mockUserManager.signinSilent).toHaveBeenCalled();
  });
});
```

## Security Considerations

### 1. Refresh Token Security

- **Storage**: Store refresh tokens in `sessionStorage` (cleared on tab close) or `localStorage` (persists)
- **HttpOnly cookies** (most secure, but requires backend setup)
- **NEVER** expose refresh tokens in URLs or logs

### 2. Token Rotation

Enable refresh token rotation in Identity Server:

```csharp
RefreshTokenUsage = TokenUsage.OneTimeOnly,  // Rotate on each use
RefreshTokenExpiration = TokenExpiration.Sliding,
```

### 3. Revocation on Logout

```tsx
const handleLogout = async () => {
  try {
    // Revoke tokens server-side
    await auth.revokeTokens();
    
    // Sign out
    await auth.signoutRedirect();
  } catch (error) {
    console.error("Logout failed:", error);
  }
};
```

### 4. Detect Token Theft

Monitor for:
- Multiple simultaneous sessions from different IPs
- Refresh token reuse (indicates theft)
- Unexpected geolocation changes

## HIPAA Compliance

Token refresh satisfies:
- **§164.312(a)(2)(iii)** — Automatic Logoff (Addressable)
  - Tokens expire after inactivity
  - Sessions auto-terminate after absolute timeout

### Audit Requirements

Log all token events:
- Token issued
- Token refreshed
- Token expired
- Token revoked
- Silent renew success/failure

## Troubleshooting

### Silent Renew Fails

**Symptoms**: User gets logged out unexpectedly

**Solutions**:
1. Check `silent-renew.html` is accessible at correct URL
2. Verify CORS is configured on Identity Server
3. Check browser console for iframe errors
4. Ensure `offline_access` scope is granted

### Refresh Token Expired

**Symptoms**: Silent renew returns 400 error

**Solution**: User must re-authenticate (expected after 30 days)

### CORS Errors

**Symptoms**: iframe cannot load Identity Server

**Solution**: Add iframe origin to `AllowedCorsOrigins` in client config

## References

- [oidc-client-ts Documentation](https://github.com/authts/oidc-client-ts)
- [OAuth 2.0 Refresh Tokens - RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-6)
- [OAuth 2.0 for Browser-Based Apps - BCP](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
