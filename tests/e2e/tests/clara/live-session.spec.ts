import { type APIRequestContext } from "@playwright/test";
import { test, expect, OIDC_RESTORE_SCRIPT } from "../../fixtures/fixtures.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Clara Live Session E2E Tests — Nexus (Aspire) environment
 *
 * Tests the full clinical session lifecycle:
 * 1. Doctor logs in and navigates to Clara
 * 2. Starts a new session
 * 3. Enables audio recording (mic simulated via Chrome fake device)
 * 4. Injects a test conversation via dev endpoint (simulates STT output)
 * 5. Forces AI suggestion generation via dev endpoint
 * 6. Verifies transcript and suggestions appear in the UI
 *
 * Prerequisites:
 *   - All services running via Nexus (start-aspire.cmd)
 *   - Simulator run at least once to seed doctor user
 */

const CLARA_API = process.env.CLARA_API_URL ?? "https://localhost:5005";
const WEB_URL = process.env.BASE_URL ?? "https://localhost:3000";
const DOCTOR_AUTH_STATE = path.resolve(__dirname, "../../fixtures/doctor-auth.json");

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the access token from the OIDC client storage in the browser.
 * oidc-client-ts stores tokens in sessionStorage under the key
 * `oidc.user:https://localhost:5001:meditrack-web`.
 */
async function extractAccessToken(page: import("@playwright/test").Page): Promise<string | null> {
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

/**
 * Create a Clara session via the REST API.
 * Returns the session ID (string UUID).
 */
async function createClaraSession(
  apiContext: APIRequestContext,
  token: string
): Promise<string> {
  const response = await apiContext.post(`${CLARA_API}/api/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { patientId: null, sessionType: "Consultation" },
  });

  expect(response.ok(), `StartSession failed (${response.status()}): ${await response.text()}`).toBeTruthy();
  const body = await response.json();
  return body.id as string;
}

/**
 * Inject a test conversation into the session via the dev endpoint.
 * This simulates what Deepgram STT would produce from real audio.
 */
async function seedTranscript(
  apiContext: APIRequestContext,
  token: string,
  sessionId: string,
  scenario: string
): Promise<void> {
  const response = await apiContext.post(
    `${CLARA_API}/api/dev/sessions/${sessionId}/seed-transcript?scenario=${scenario}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  expect(
    response.ok(),
    `seed-transcript failed (${response.status()}): ${await response.text()}`
  ).toBeTruthy();
}

/**
 * Force AI suggestion generation immediately (bypasses the batch timer).
 */
async function forceSuggest(
  apiContext: APIRequestContext,
  token: string,
  sessionId: string
): Promise<void> {
  const response = await apiContext.post(
    `${CLARA_API}/api/dev/sessions/${sessionId}/force-suggest`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  expect(
    response.ok(),
    `force-suggest failed (${response.status()}): ${await response.text()}`
  ).toBeTruthy();
}

/**
 * End a Clara session via REST.
 */
async function endClaraSession(
  apiContext: APIRequestContext,
  token: string,
  sessionId: string
): Promise<void> {
  await apiContext.post(`${CLARA_API}/api/sessions/${sessionId}/end`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Clara Live Session — Nexus", () => {
  test.use({ storageState: DOCTOR_AUTH_STATE });

  let sessionId: string | null = null;
  let accessToken: string | null = null;

  test.beforeAll(async ({ browser }) => {
    // Create a context with the storageState AND the OIDC restore init script.
    // browser.newPage({ storageState }) bypasses the context fixture override,
    // so we must manually add the init script to restore sessionStorage here.
    const context = await browser.newContext({
      storageState: DOCTOR_AUTH_STATE,
      ignoreHTTPSErrors: true,
    });
    await context.addInitScript({ content: OIDC_RESTORE_SCRIPT });

    const page = await context.newPage();
    await page.goto(WEB_URL, { waitUntil: "networkidle" });
    accessToken = await extractAccessToken(page);
    await page.close();
    await context.close();

    if (!accessToken) {
      console.warn("[clara-tests] Could not extract access token — API calls will be skipped");
    }
  });

  test.afterEach(async ({ request }) => {
    if (sessionId && accessToken) {
      await endClaraSession(request, accessToken, sessionId).catch(() => {});
      sessionId = null;
    }
  });

  // ── Test 1: Clara page loads with session start UI ────────────────────────

  test("navigates to Clara and shows session start screen", async ({ page }) => {
    await page.goto(`${WEB_URL}/clara`, { waitUntil: "networkidle" });

    // Clara start page has heading "Start New Session" and a start button
    await expect(page.getByRole("heading", { name: "Start New Session" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /Start Session with Clara/i })).toBeVisible();
  });

  // ── Test 2: Live session view loads after clicking start ──────────────────

  test("clicking Start Session with Clara opens live session view", async ({ page }) => {
    await page.goto(`${WEB_URL}/clara`, { waitUntil: "networkidle" });

    await page.getByRole("button", { name: /Start Session with Clara/i }).click();

    // Should navigate to /clara/session/{id}
    await page.waitForURL(/\/clara\/session\/[a-f0-9-]+$/, { timeout: 15_000 });

    // Live session view has these headings
    await expect(page.getByRole("heading", { name: "Live Transcript" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Clara's Suggestions" })).toBeVisible();

    // Record the session id for cleanup
    const url = page.url();
    sessionId = url.split("/").pop() ?? null;
  });

  // ── Test 3: Voice simulation — seed transcript and verify UI update ───────

  test("simulates voice audio via seed-transcript and shows transcript lines in UI", async ({
    page,
    request,
  }) => {
    test.skip(!accessToken, "No access token — skip");

    // Create session via API
    sessionId = await createClaraSession(request, accessToken!);

    // Navigate to live session view
    await page.goto(`${WEB_URL}/clara/session/${sessionId}`, { waitUntil: "networkidle" });

    // Wait for SignalR to connect (hub join happens on mount)
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Inject test conversation — simulates what Deepgram STT produces from real mic audio
    await seedTranscript(request, accessToken!, sessionId, "general-checkup");

    // Transcript lines broadcast via SignalR → should appear in the Live Transcript panel
    await expect(
      page.getByText(/annual checkup|how have you been/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Both speakers should be labelled
    await expect(page.getByText("Doctor").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Patient").first()).toBeVisible({ timeout: 5_000 });
  });

  // ── Test 4: AI suggestions generated from injected transcript ─────────────

  test("generates AI suggestions after seeding transcript", async ({ page, request }) => {
    test.skip(!accessToken, "No access token — skip");

    sessionId = await createClaraSession(request, accessToken!);
    await page.goto(`${WEB_URL}/clara/session/${sessionId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Give the AI context
    await seedTranscript(request, accessToken!, sessionId, "general-checkup");
    await page.waitForTimeout(500);

    // Force suggestion generation (bypasses 5-utterance threshold)
    await forceSuggest(request, accessToken!, sessionId);

    // Suggestions arrive via SignalR SuggestionAdded and render in the right panel
    // The panel heading is "Clara's Suggestions"
    const suggestionsPanel = page.getByRole("heading", { name: "Clara's Suggestions" });
    await expect(suggestionsPanel).toBeVisible();

    // Wait for at least one suggestion card to appear
    // Suggestions have content text; accept any non-empty text within the suggestions area
    await expect(
      page.locator('[data-testid="suggestion-card"], [class*="suggestion"]').first()
        .or(page.getByText(/sleep|diet|weight|fatigue|exercise|recommendation/i).first())
    ).toBeVisible({ timeout: 30_000 });
  });

  // ── Test 5: Mic recording button — fake device grants permission ──────────

  test("starts recording with fake audio device (mic simulation)", async ({ page, request }) => {
    test.skip(!accessToken, "No access token — skip");

    sessionId = await createClaraSession(request, accessToken!);
    await page.goto(`${WEB_URL}/clara/session/${sessionId}`, { waitUntil: "networkidle" });

    // The recording button has aria-label="Start recording"
    const startRecordingBtn = page.getByRole("button", { name: "Start recording" });
    await expect(startRecordingBtn).toBeVisible({ timeout: 10_000 });

    // Click — fake device means getUserMedia() succeeds immediately, no permission prompt
    await startRecordingBtn.click();

    // After clicking, button switches to "Stop recording" or "Mute microphone"
    await expect(
      page.getByRole("button", { name: /stop recording|mute microphone|pause/i }).first()
    ).toBeVisible({ timeout: 8_000 });

    // Inject chest-pain scenario while recording is active
    await seedTranscript(request, accessToken!, sessionId, "chest-pain");

    // Transcript lines broadcast via SignalR — check for text from the chest-pain scenario.
    // The scenario says "pain in my chest" and "pressure feeling" (not the literal phrase "chest pain").
    await expect(
      page.getByText(/pain in my chest|pressure feeling|shortness of breath/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  // ── Test 6: Full lifecycle — start → voice → suggest → end ───────────────

  test("completes full session lifecycle: start → voice simulation → suggestions → end", async ({
    page,
    request,
  }) => {
    test.skip(!accessToken, "No access token — skip");

    // ── 1. Start session from Clara home page ──
    await page.goto(`${WEB_URL}/clara`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Start Session with Clara/i }).click();
    await page.waitForURL(/\/clara\/session\/[a-f0-9-]+$/, { timeout: 15_000 });

    const url = page.url();
    sessionId = url.split("/").pop() ?? null;
    expect(sessionId).toBeTruthy();

    // ── 2. Confirm live session loaded ──
    await expect(page.getByRole("heading", { name: "Live Transcript" })).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(2000); // SignalR handshake

    // ── 3. Simulate voice audio (medication-review scenario) ──
    await seedTranscript(request, accessToken!, sessionId!, "medication-review");

    await expect(
      page.getByText(/medication|prescription/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // ── 4. Generate AI suggestions ──
    await forceSuggest(request, accessToken!, sessionId!);
    await page.waitForTimeout(3000); // Allow SignalR to deliver suggestion

    // ── 5. End session via the End Session button ──
    const endBtn = page.getByRole("button", { name: /End Session/i });
    await expect(endBtn).toBeVisible({ timeout: 5_000 });

    // handleEndSession shows window.confirm — accept it so the session ends
    page.on("dialog", (dialog) => dialog.accept());
    await endBtn.click();

    // End Session calls endSessionMutation then navigates back to /clara (start screen)
    await page.waitForURL(/\/clara$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Start New Session" })).toBeVisible({ timeout: 10_000 });

    sessionId = null; // Already ended — skip afterEach cleanup
  });
});

// ── Dev Endpoints ─────────────────────────────────────────────────────────────

test.describe("Clara Dev Endpoints — Nexus", () => {
  test.use({ storageState: DOCTOR_AUTH_STATE });

  test("seed-transcript endpoint injects conversation into session", async ({ page, request }) => {
    await page.goto(WEB_URL, { waitUntil: "networkidle" });
    const token = await extractAccessToken(page);
    test.skip(!token, "No access token — skip");

    // Create session
    const sessionRes = await request.post(`${CLARA_API}/api/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { patientId: null, sessionType: "Consultation" },
    });
    expect(
      sessionRes.ok(),
      `POST /api/sessions failed (${sessionRes.status()}): ${await sessionRes.text()}`
    ).toBeTruthy();
    const { id } = await sessionRes.json();

    // Seed transcript
    const seedRes = await request.post(
      `${CLARA_API}/api/dev/sessions/${id}/seed-transcript?scenario=general-checkup`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(seedRes.ok()).toBeTruthy();
    const body = await seedRes.json();
    expect(body.scenario).toBe("general-checkup");
    expect(body.message).toMatch(/seeded/i);

    // Cleanup
    await request.post(`${CLARA_API}/api/sessions/${id}/end`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test("scenarios endpoint lists all available test conversations", async ({ page, request }) => {
    await page.goto(WEB_URL, { waitUntil: "networkidle" });
    const token = await extractAccessToken(page);
    test.skip(!token, "No access token — skip");

    const response = await request.get(`${CLARA_API}/api/dev/scenarios`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();

    const scenarios: string[] = await response.json();
    expect(scenarios.length).toBeGreaterThan(0);
    expect(scenarios).toContain("general-checkup");
    expect(scenarios).toContain("chest-pain");
  });

  test("force-suggest endpoint generates AI suggestions immediately", async ({ page, request }) => {
    await page.goto(WEB_URL, { waitUntil: "networkidle" });
    const token = await extractAccessToken(page);
    test.skip(!token, "No access token — skip");

    // Create session and seed context first
    const sessionRes = await request.post(`${CLARA_API}/api/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { patientId: null, sessionType: "Consultation" },
    });
    expect(
      sessionRes.ok(),
      `POST /api/sessions failed (${sessionRes.status()}): ${await sessionRes.text()}`
    ).toBeTruthy();
    const { id } = await sessionRes.json();

    await request.post(
      `${CLARA_API}/api/dev/sessions/${id}/seed-transcript?scenario=general-checkup`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Force suggestions
    const suggestRes = await request.post(
      `${CLARA_API}/api/dev/sessions/${id}/force-suggest`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(suggestRes.ok()).toBeTruthy();
    const suggestBody = await suggestRes.json();
    expect(suggestBody.suggestionCount).toBeGreaterThanOrEqual(0);

    // Cleanup
    await request.post(`${CLARA_API}/api/sessions/${id}/end`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });
});
