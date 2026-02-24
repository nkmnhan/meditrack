// Centralized auth token retrieval for OIDC
// Used by both axios interceptor and RTK Query
//
// oidc-client-ts v3 stores the user in sessionStorage by default.

export function getOidcAccessToken(): string | null {
  const identityUrl = import.meta.env.VITE_IDENTITY_URL ?? "https://localhost:5001";
  const storageKey = `oidc.user:${identityUrl}:meditrack-web`;
  const oidcStorage = sessionStorage.getItem(storageKey);

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
