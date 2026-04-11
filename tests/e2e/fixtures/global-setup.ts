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

  // Navigate to the landing page
  await page.goto(baseURL ?? "https://localhost:3000", { waitUntil: "networkidle" });

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

  // Let oidc-client-ts store tokens in sessionStorage
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // Playwright's storageState captures localStorage but NOT sessionStorage.
  // oidc-client-ts stores the authenticated user in sessionStorage by default.
  // Copy it to localStorage under a backup key so storageState preserves it.
  // The OIDC_RESTORE_SCRIPT in fixtures.ts moves it back to sessionStorage on page load.
  const backupCount = await page.evaluate(
    ({ sessionKey, backupKey }: { sessionKey: string; backupKey: string }) => {
      const token = window.sessionStorage.getItem(sessionKey);
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

  // Save auth state (cookies + localStorage — now includes OIDC backup)
  await context.storageState({ path: authStatePath });

  console.log(`[global-setup] Doctor auth state saved to ${authStatePath}`);

  await browser.close();
}

export default globalSetup;
