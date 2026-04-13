import type { UserManagerSettings } from "oidc-client-ts";

const identityUrl = import.meta.env.VITE_IDENTITY_URL ?? "https://localhost:5001";

export const oidcConfig: UserManagerSettings = {
  authority: identityUrl,
  client_id: "meditrack-web",
  redirect_uri: `${globalThis.location.origin}/callback`,
  // Dedicated lightweight page for silent token renewal (automaticSilentRenew).
  // Without this, oidc-client-ts uses the main redirect_uri, which loads the
  // full React bundle in a hidden iframe on every renewal — expensive and
  // causes Playwright networkidle timeouts in E2E tests.
  silent_redirect_uri: `${globalThis.location.origin}/silent-renew.html`,
  post_logout_redirect_uri: globalThis.location.origin,
  response_type: "code",
  scope: "openid profile roles patient-api appointment-api medicalrecords-api offline_access",
  automaticSilentRenew: true,
  // Security hardening (OWASP A07:2025 - Identification and Authentication Failures)
  // monitorSession disabled: check_session_iframe fires a server-side session check;
  // in dev/Docker the identity-api runs with in-memory operational store, so any
  // container restart invalidates all sessions and oidc-client-ts immediately logs
  // users out — causing auth redirect loops that break E2E tests. Tokens expire
  // naturally via accessTokenExpiringNotificationTimeInSeconds instead.
  monitorSession: false,
  revokeTokensOnSignout: true,
  accessTokenExpiringNotificationTimeInSeconds: 60,
};
