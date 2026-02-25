import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { getOidcAccessToken, clearOidcSession } from "./getOidcAccessToken";

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
      // Token expired or invalid — clear stale session and redirect.
      // ProtectedRoute will detect !isAuthenticated and call signinRedirect().
      clearOidcSession();
      window.location.href = "/";
    }

    return result;
  };
}
