import type { UserManagerSettings } from "oidc-client-ts";

const identityUrl = import.meta.env.VITE_IDENTITY_URL ?? "https://localhost:5001";

export const oidcConfig: UserManagerSettings = {
  authority: identityUrl,
  client_id: "meditrack-web",
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile roles patient-api appointment-api medicalrecords-api offline_access",
  automaticSilentRenew: true,
};
