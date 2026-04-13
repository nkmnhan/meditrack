import { chromium, type FullConfig } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { OIDC_SESSION_KEY, OIDC_BACKUP_KEY } from "./fixtures.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Logs in as a doctor once and saves auth state (cookies + localStorage) to a file.
 * Individual tests load this state instead of logging in on every run — much faster.
 *
 * Run automatically before the first test via playwright.config.ts `globalSetup`.
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const authStatePath = path.resolve(__dirname, "doctor-auth.json");

  const browser = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    permissions: ["microphone"],
  });

  const page = await context.newPage();

  // Navigate to the landing page.
  // Use "domcontentloaded" instead of "networkidle" — Docker nginx serves a production
  // bundle that may have background API calls from RTK Query keeping the network active,
  // which causes "networkidle" to never fire (or take >30s) in the Docker environment.
  await page.goto(baseURL ?? "https://localhost:3000", { waitUntil: "domcontentloaded" });

  // Click Sign In — landing page has a "Sign In to Explore" button (not a link)
  const signInButton = page
    .getByRole("button", { name: /sign in/i })
    .or(page.getByRole("link", { name: /sign in/i }))
    .first();
  await signInButton.waitFor({ timeout: 15_000 });
  await signInButton.click();

  // Wait for Identity server login page
  await page.waitForURL(/localhost:5001/, { timeout: 20_000 });

  // Fill credentials using accessible role selectors (matches Duende Razor page labels)
  await page.getByRole("textbox", { name: "Email" }).fill("doctor@meditrack.local");
  await page.getByRole("textbox", { name: "Password" }).fill("Doctor123!");
  await page.getByRole("button", { name: "Sign In" }).click();

  // Wait for redirect back to dashboard
  await page.waitForURL(/localhost:3000\/dashboard/, { timeout: 20_000 });

  // oidc-client-ts stores tokens in sessionStorage BEFORE navigating to /dashboard
  // (the navigate call in CallbackPage fires only after isAuthenticated=true).
  // Use a fixed delay instead of waitForLoadState("networkidle") — networkidle is
  // unreliable when automaticSilentRenew or RTK Query polls create background requests.
  await page.waitForTimeout(2000);

  // Playwright's storageState captures localStorage but NOT sessionStorage.
  // oidc-client-ts stores the authenticated user in sessionStorage by default.
  // Copy it to localStorage under a backup key so storageState preserves it.
  // The OIDC_RESTORE_SCRIPT in fixtures.ts moves it back to sessionStorage on page load.

  // Dump all sessionStorage keys for diagnostics — helps detect key mismatches between
  // oidc-client-ts versions (e.g. authority trailing-slash normalization differences).
  const sessionStorageKeys = await page.evaluate(() => {
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k) keys.push(k);
    }
    return keys;
  });
  console.log(`[global-setup] sessionStorage keys: ${JSON.stringify(sessionStorageKeys)}`);
  console.log(`[global-setup] expected OIDC key: "${OIDC_SESSION_KEY}"`);

  const backupCount = await page.evaluate(
    ({ sessionKey, backupKey }: { sessionKey: string; backupKey: string }) => {
      // Try the exact key first
      let token = window.sessionStorage.getItem(sessionKey);
      if (!token) {
        // Fallback: find any oidc.user key (covers authority URL normalization differences)
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k && k.startsWith("oidc.user:")) {
            token = window.sessionStorage.getItem(k);
            break;
          }
        }
      }
      if (token) {
        window.localStorage.setItem(backupKey, token);
        return 1;
      }
      return 0;
    },
    { sessionKey: OIDC_SESSION_KEY, backupKey: OIDC_BACKUP_KEY }
  );

  if (backupCount === 0) {
    console.warn("[global-setup] OIDC token not found in sessionStorage — auth state may be incomplete");
  } else {
    console.log("[global-setup] OIDC token backed up to localStorage for storageState capture");
  }

  // Verify the saved token is not already expired.
  // This catches the edge case where oidc-client-ts restored an old backup from
  // a previous login rather than using the freshly-issued token (e.g. after an
  // identity-api restart that wiped its in-memory session store).
  const tokenEntry = await page.evaluate((sessionKey: string) => {
    try {
      return JSON.parse(sessionStorage.getItem(sessionKey) ?? "{}") as Record<string, unknown>;
    } catch {
      return {} as Record<string, unknown>;
    }
  }, OIDC_SESSION_KEY);

  if (tokenEntry.expires_at) {
    const nowSeconds = Date.now() / 1000;
    const remainingSeconds = (tokenEntry.expires_at as number) - nowSeconds;
    if (remainingSeconds < 300) {
      throw new Error(
        `[global-setup] Access token expires in ${Math.round(remainingSeconds)}s — ` +
        "identity-api may have issued a stale token. Ensure identity-api is healthy " +
        "and restart it before re-running the tests."
      );
    }
    const remainingHours = Math.round((remainingSeconds / 3600) * 10) / 10;
    console.log(`[global-setup] Access token is fresh — valid for ${remainingHours}h`);
  }

  // Save auth state (cookies + localStorage — now includes OIDC backup)
  await context.storageState({ path: authStatePath });

  console.log(`[global-setup] Doctor auth state saved to ${authStatePath}`);

  await browser.close();
}

export default globalSetup;
