import { test as base } from "@playwright/test";

/**
 * The key oidc-client-ts uses to store the authenticated user in sessionStorage.
 * Format: `oidc.user:<authority>:<client_id>`
 */
export const OIDC_SESSION_KEY = "oidc.user:https://localhost:5001:meditrack-web";

/**
 * The localStorage key used to back up the OIDC session across page contexts.
 * Playwright's storageState captures localStorage but NOT sessionStorage —
 * this backup is how we bridge the gap between global-setup and test contexts.
 */
export const OIDC_BACKUP_KEY = `__playwright_oidc__${OIDC_SESSION_KEY}`;

/**
 * Init script injected into every page before any JavaScript runs.
 * Restores the OIDC user entry from the localStorage backup into sessionStorage
 * so oidc-client-ts finds it on startup and treats the user as authenticated.
 */
export const OIDC_RESTORE_SCRIPT = `
  (() => {
    try {
      var key = "${OIDC_SESSION_KEY}";
      var backupKey = "${OIDC_BACKUP_KEY}";
      var backup = window.localStorage.getItem(backupKey);
      if (backup && !window.sessionStorage.getItem(key)) {
        window.sessionStorage.setItem(key, backup);
      }
    } catch (_) {}
  })();
`;

/**
 * Extended Playwright test with an automatic OIDC session restore.
 *
 * When tests use `test.use({ storageState: "doctor-auth.json" })`, Playwright
 * creates a context with saved localStorage + cookies but NOT sessionStorage.
 * This fixture override injects a script that copies the OIDC backup from
 * localStorage back into sessionStorage before any page JavaScript runs,
 * so oidc-client-ts boots in an authenticated state.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript({ content: OIDC_RESTORE_SCRIPT });
    await use(context);
  },
});

export { expect } from "@playwright/test";
