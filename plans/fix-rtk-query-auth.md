# Plan: Fix RTK Query Auth Token Handling

## Problem

RTK Query and Axios use **two separate auth mechanisms** that are not unified:

| Concern | Axios (manual API calls) | RTK Query (`fetchBaseQuery`) |
|---------|--------------------------|------------------------------|
| Token source | `auth.user.access_token` via ref | `sessionStorage` via `getOidcAccessToken()` |
| 401 handling | Interceptor → `signinRedirect()` | None — request silently fails |
| Token refresh | Not implemented | Not implemented |
| Stale token | Ref always current | Reads from storage on each call (OK) |

**The critical gap:** When RTK Query gets a 401 response, it does nothing — no redirect, no token refresh, no retry. The user sees a failed request with no recovery.

### Current Code

**`src/MediTrack.Web/src/features/patients/store/patientApi.ts`:**

```ts
baseQuery: fetchBaseQuery({
  baseUrl: `${PATIENT_API_URL}/api`,
  prepareHeaders: (headers) => {
    // Get token from centralized auth utility
    // Note: RTK Query uses fetch, not the axios instance, so we can't reuse
    // the axios interceptor directly. This utility centralizes the storage key logic.
    const token = getOidcAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
}),
```

**`src/MediTrack.Web/src/shared/auth/axiosInstance.ts`:**

```ts
// Has 401 handling:
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      onUnauthorized?.();  // → signinRedirect()
    }
    return Promise.reject(error);
  },
);
```

## Solution: Custom `baseQuery` with Re-auth Wrapper

Use RTK Query's recommended [re-authentication pattern](https://redux-toolkit.js.org/rtk-query/usage/customizing-queries#automatic-re-authorization-by-extending-fetchbasequery) — wrap `fetchBaseQuery` with a function that handles 401 responses.

### Implementation

#### 1. Create shared `baseQueryWithReauth` utility

**New file:** `src/MediTrack.Web/src/shared/auth/baseQueryWithReauth.ts`

```ts
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { getOidcAccessToken } from "./getOidcAccessToken";

/**
 * Creates a baseQuery that:
 * 1. Attaches the OIDC access token to every request
 * 2. On 401, triggers OIDC silent renew or redirect
 *
 * This replaces the duplicated prepareHeaders + getOidcAccessToken pattern
 * in every RTK Query API slice.
 */
export function createBaseQueryWithReauth(baseUrl: string): BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      const token = getOidcAccessToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  });

  return async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions);

    if (result.error?.status === 401) {
      // Token expired or invalid — redirect to login
      // oidc-client-ts will handle the redirect flow
      const identityUrl = import.meta.env.VITE_IDENTITY_URL ?? "https://localhost:5001";
      const storageKey = `oidc.user:${identityUrl}:meditrack-web`;

      // Clear stale token from storage
      sessionStorage.removeItem(storageKey);

      // Redirect to login — uses the same mechanism as the axios interceptor
      window.location.href = "/";
    }

    return result;
  };
}
```

#### 2. Update `patientApi.ts` to use the shared utility

```ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQueryWithReauth } from "@/shared/auth/baseQueryWithReauth";

const PATIENT_API_URL = import.meta.env.VITE_PATIENT_API_URL || "https://localhost:5002";

export const patientApi = createApi({
  reducerPath: "patientApi",
  baseQuery: createBaseQueryWithReauth(`${PATIENT_API_URL}/api`),
  tagTypes: ["Patient"],
  endpoints: (builder) => ({
    // ... same endpoints, no changes needed
  }),
});
```

#### 3. Export from shared auth barrel

Add to `src/MediTrack.Web/src/shared/auth/index.ts`:

```ts
export { createBaseQueryWithReauth } from "./baseQueryWithReauth";
```

#### 4. Use for all future RTK Query API slices

Every new API slice (appointment, medical records, AI secretary) uses the same pattern:

```ts
baseQuery: createBaseQueryWithReauth(`${SERVICE_URL}/api`),
```

No more duplicating `prepareHeaders` + `getOidcAccessToken` in every slice.

## Files Affected

| File | Change |
|------|--------|
| `src/MediTrack.Web/src/shared/auth/baseQueryWithReauth.ts` | **New** — shared baseQuery wrapper |
| `src/MediTrack.Web/src/shared/auth/index.ts` | Add export |
| `src/MediTrack.Web/src/features/patients/store/patientApi.ts` | Use `createBaseQueryWithReauth` |

## Benefits

- **Single place** for auth logic used by all RTK Query slices (DRY)
- **401 handling** that matches the Axios interceptor behavior
- **No more critical comment** — the gap between Axios and RTK Query is closed
- **Ready for future slices** — appointment, records, AI secretary APIs all get auth for free

## Future Enhancement: Silent Token Renewal

When the token refresh feature (from `docs/token-refresh-design.md`) is implemented, update `createBaseQueryWithReauth` to attempt a silent renew before redirecting:

```ts
if (result.error?.status === 401) {
  // 1. Try silent renew first
  // 2. If renew succeeds, retry the original request
  // 3. If renew fails, redirect to login
}
```

This is deferred until the token refresh feature is implemented.
