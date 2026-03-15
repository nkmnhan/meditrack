// Centralized auth token retrieval for OIDC
// Used by both axios interceptor and RTK Query
//
// oidc-client-ts v3 stores the user in sessionStorage by default.

function getOidcStorageKey(): string {
  const identityUrl = import.meta.env.VITE_IDENTITY_URL ?? "https://localhost:5001";
  return `oidc.user:${identityUrl}:meditrack-web`;
}

export function getOidcAccessToken(): string | null {
  const oidcStorage = sessionStorage.getItem(getOidcStorageKey());

  if (oidcStorage) {
    try {
      const user = JSON.parse(oidcStorage);
      return user.access_token || null;
    } catch {
      return null;
    }
  }

  return null;
}

export function clearOidcSession(): void {
  sessionStorage.removeItem(getOidcStorageKey());
}
