// Centralized auth token retrieval for OIDC
// Used by both axios interceptor and RTK Query

export function getOidcAccessToken(): string | null {
  const storageKey = `oidc.user:${import.meta.env.VITE_IDENTITY_URL}:${import.meta.env.VITE_CLIENT_ID}`;
  const oidcStorage = localStorage.getItem(storageKey);
  
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
