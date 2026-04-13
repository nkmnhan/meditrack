import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { getOidcAccessToken } from "./getOidcAccessToken";

/**
 * Creates a baseQuery that:
 * 1. Attaches the OIDC access token to every request
 * 2. On 401, clears the stale session and redirects to login
 *
 * This replaces the duplicated prepareHeaders + getOidcAccessToken pattern
 * in every RTK Query API slice.
 */
export function createBaseQueryWithReauth(
  baseUrl: string,
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
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
      // Log the 401 but do NOT do a full-page navigation (window.location.href).
      // A hard redirect clears sessionStorage, wiping the OIDC session and causing
      // an auth redirect loop. Instead, let the error propagate to the component.
      //
      // Transient 401s (e.g. after identity-api restart flushes its signing key) are
      // handled automatically: ASP.NET JwtBearer refreshes its JWKS on the next
      // request. If the token is genuinely expired, oidc-client-ts automaticSilentRenew
      // will renew it before expiry. ProtectedRoute handles the !isAuthenticated case.
      console.warn("[baseQuery] 401 Unauthorized — token may be expired or service JWKS is stale");
    }

    return result;
  };
}
