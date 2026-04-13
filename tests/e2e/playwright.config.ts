import { defineConfig, devices } from "@playwright/test";

/**
 * MediTrack E2E Playwright Configuration
 *
 * Targets the Nexus (Aspire) dev environment running locally.
 * All services must be running via `start-aspire.cmd` before running tests.
 *
 * Service URLs (Nexus dev):
 *   Web:       https://localhost:3000
 *   Identity:  https://localhost:5001
 *   Clara API: https://localhost:5005
 *
 * First run:
 *   1. Start Nexus: start-aspire.cmd
 *   2. Run simulator to seed test data
 *   3. Run tests: cd tests/e2e && npx playwright test
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]],
  outputDir: "test-results",

  /** Login once as doctor and reuse auth state across all tests. */
  globalSetup: "./fixtures/global-setup.ts",

  use: {
    baseURL: process.env.BASE_URL ?? "https://localhost:3000",
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
    /** Default auth state — overrideable per-suite. */
    storageState: "./fixtures/doctor-auth.json",
  },

  projects: [
    /**
     * Clara live session tests.
     * Uses Chrome with fake media devices for microphone simulation.
     * --use-fake-ui-for-media-stream: auto-grants mic permission
     * --use-fake-device-for-media-stream: provides a synthetic audio stream
     */
    {
      name: "clara-nexus",
      testMatch: "**/clara/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        ignoreHTTPSErrors: true,
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
          ],
        },
        permissions: ["microphone"],
      },
    },

    /** General web UI tests (no mic required). */
    {
      name: "web-nexus",
      testMatch: "**/web/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        ignoreHTTPSErrors: true,
      },
    },
  ],
});
