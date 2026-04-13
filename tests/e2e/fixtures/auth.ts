import { type Page, expect } from "@playwright/test";

/**
 * Test credentials seeded by the Simulator.
 * Matches IdentitySeeder.cs defaults.
 */
export const DOCTOR_CREDENTIALS = {
  email: "doctor@meditrack.local",
  password: "Doctor123!",
} as const;

export const ADMIN_CREDENTIALS = {
  email: "admin@meditrack.local",
  password: "Admin123!",
} as const;

/** Base URL for the web app running under Nexus. */
export const WEB_URL = process.env.BASE_URL ?? "https://localhost:3000";

/** Clara API base URL running under Nexus. */
export const CLARA_API_URL = process.env.CLARA_API_URL ?? "https://localhost:5005";

/**
 * Sign in as a doctor through the web app OIDC login flow.
 * Navigates to the landing page, clicks Sign In, fills the Identity server
 * login form, and waits until the dashboard loads.
 */
export async function signInAsDoctor(page: Page): Promise<void> {
  await page.goto(WEB_URL, { waitUntil: "networkidle" });

  // Click Sign In — landing page has a "Sign In to Explore" button (not a link)
  const signInButton = page
    .getByRole("button", { name: /sign in/i })
    .or(page.getByRole("link", { name: /sign in/i }))
    .first();
  await signInButton.click();

  // Identity server login page — fill credentials
  await page.waitForURL(/localhost:5001/, { timeout: 15_000 });
  await page.fill('input[name="Input.Email"], input[name="email"], #Input_Email', DOCTOR_CREDENTIALS.email);
  await page.fill('input[name="Input.Password"], input[name="password"], #Input_Password', DOCTOR_CREDENTIALS.password);
  await page.click('button[type="submit"], input[type="submit"]');

  // Wait for redirect back to the web app
  await page.waitForURL(/localhost:3000/, { timeout: 15_000 });

  // Confirm we landed on the dashboard (authenticated state)
  await expect(page.getByText(/dashboard|welcome|Dr\./i).first()).toBeVisible({ timeout: 10_000 });
}

/**
 * Get a bearer token for the doctor using the resource owner password grant.
 * Used for direct API calls from tests (bypasses the browser OIDC flow).
 *
 * Returns null if the Identity server is not reachable.
 */
/**
 * Extract access token from the browser's sessionStorage.
 * oidc-client-ts stores tokens in sessionStorage (not localStorage).
 */
export async function extractTokenFromPage(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const key = "oidc.user:https://localhost:5001:meditrack-web";
    try {
      const entry = JSON.parse(sessionStorage.getItem(key) ?? "{}");
      return (entry.access_token as string) ?? null;
    } catch {
      return null;
    }
  });
}
