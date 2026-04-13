# E2E Self-Test Execution Plan

> **For agentic workers:** This plan is designed to be executed BY the AI agent using Bash + Playwright MCP tools. It is NOT for human execution. Use `superpowers:executing-plans` to run it task-by-task in this session.

**Goal:** Run the full Clara E2E Playwright suite against Nexus, then Docker, and produce a pass/fail report for both environments.

**Architecture:** Two sequential phases sharing the same test suite and URLs (`https://localhost:3000`, `https://localhost:5001–5005`). Phase 1 assumes Nexus is already running; Phase 2 starts Docker via `docker-compose`. Between phases the agent confirms the port conflict is resolved before proceeding.

**Tech Stack:** Playwright 1.58, `npx playwright test`, Playwright MCP tools for failure investigation, `docker-compose` CLI for Docker phase, `curl` health checks for readiness polling.

---

## Service URLs (same for both environments)

| Service | Host URL | Health endpoint |
|---|---|---|
| Web (React SPA) | `https://localhost:3000` | `https://localhost:3000` (200 = up) |
| Identity API | `https://localhost:5001` | `https://localhost:5001/health/live` |
| Patient API | `https://localhost:5002` | `https://localhost:5002/health/live` |
| Appointment API | `https://localhost:5003` | `https://localhost:5003/health/live` |
| MedicalRecords API | `https://localhost:5004` | `https://localhost:5004/health/live` |
| Clara API | `https://localhost:5005` | `https://localhost:5005/health/live` |

## Test Suite Summary

**File:** `tests/e2e/tests/clara/live-session.spec.ts`  
**Project:** `clara-nexus` (Chrome with fake mic device)  
**Total:** 9 tests across 2 describe blocks

| # | Group | Test name |
|---|---|---|
| 1 | Clara Live Session | navigates to Clara and shows session start screen |
| 2 | Clara Live Session | clicking Start Session with Clara opens live session view |
| 3 | Clara Live Session | simulates voice audio via seed-transcript and shows transcript lines in UI |
| 4 | Clara Live Session | generates AI suggestions after seeding transcript |
| 5 | Clara Live Session | starts recording with fake audio device (mic simulation) |
| 6 | Clara Live Session | completes full session lifecycle: start → voice simulation → suggestions → end |
| 7 | Clara Dev Endpoints | seed-transcript endpoint injects conversation into session |
| 8 | Clara Dev Endpoints | scenarios endpoint lists all available test conversations |
| 9 | Clara Dev Endpoints | force-suggest endpoint generates AI suggestions immediately |

---

## Phase 1 — Nexus

---

### Task 1: Pre-flight checks

**Files:** none — read-only verification

- [ ] **Step 1.1: Verify Playwright dependencies are installed**

```bash
cd C:/nkmn/Projects/meditrack/tests/e2e && npx playwright --version
```

Expected: `Version 1.x.x`. If `npx: command not found` or Playwright not found:
```bash
cd C:/nkmn/Projects/meditrack/tests/e2e && npm install
```

- [ ] **Step 1.2: Verify Playwright browser binaries are installed**

```bash
cd C:/nkmn/Projects/meditrack/tests/e2e && npx playwright install chromium --with-deps 2>&1 | tail -5
```

Expected: `chromium` either already installed or freshly downloaded. This is idempotent.

- [ ] **Step 1.3: Verify the auth fixture file exists**

```bash
ls -la C:/nkmn/Projects/meditrack/tests/e2e/fixtures/doctor-auth.json
```

Expected: file exists with non-zero size. This fixture is committed in git — it always exists. `globalSetup` will refresh it automatically before the test run.

- [ ] **Step 1.4: Confirm no Docker containers are occupying the service ports**

```bash
cd C:/nkmn/Projects/meditrack && docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "5001|5002|5003|5004|5005|3000" || echo "No Docker containers on service ports"
```

Expected: `No Docker containers on service ports` — or confirm that any containers shown are NOT MediTrack services. If MediTrack Docker containers are already running, skip to Phase 2 (Docker is the environment that is up, not Nexus).

---

### Task 2: Nexus service health checks

**Files:** none — network probes

All 6 health checks must pass before running the suite. Run them in sequence — a failure means that service is not up in Nexus.

- [ ] **Step 2.1: Check Identity API**

```bash
curl -sk https://localhost:5001/health/live -o /dev/null -w "%{http_code}"
```

Expected: `200`. If `000` (connection refused) or anything other than `200`, Identity API is not running in Nexus. The user must start Nexus via `start-aspire.cmd` before proceeding.

- [ ] **Step 2.2: Check Patient API**

```bash
curl -sk https://localhost:5002/health/live -o /dev/null -w "%{http_code}"
```

Expected: `200`.

- [ ] **Step 2.3: Check Appointment API**

```bash
curl -sk https://localhost:5003/health/live -o /dev/null -w "%{http_code}"
```

Expected: `200`.

- [ ] **Step 2.4: Check MedicalRecords API**

```bash
curl -sk https://localhost:5004/health/live -o /dev/null -w "%{http_code}"
```

Expected: `200`.

- [ ] **Step 2.5: Check Clara API**

```bash
curl -sk https://localhost:5005/health/live -o /dev/null -w "%{http_code}"
```

Expected: `200`.

- [ ] **Step 2.6: Check Web SPA**

```bash
curl -sk https://localhost:3000 -o /dev/null -w "%{http_code}"
```

Expected: `200`. The web returns a Vite dev server page (Nexus runs `npm run dev` for it).

**If any check fails:** Stop. Report which service is down. The agent cannot start Nexus — it is an interactive `dotnet run` process. The user must run `start-aspire.cmd` and re-trigger this plan.

---

### Task 3: Verify doctor account exists (Nexus DB)

The `globalSetup` will attempt to log in as `doctor@meditrack.local`. If the account doesn't exist, the entire test run fails at the setup phase (not as individual test failures). Verify it proactively.

- [ ] **Step 3.1: Hit the Identity login page**

```bash
curl -sk https://localhost:5001/Account/Login -o /dev/null -w "%{http_code}"
```

Expected: `200`. If `000` or `5xx`, Identity is unhealthy. If `200`, the login page is reachable and `globalSetup` can proceed.

- [ ] **Step 3.2: Verify Clara dev endpoint is accessible (requires auth)**

```bash
curl -sk https://localhost:5005/api/dev/scenarios -o /dev/null -w "%{http_code}"
```

Expected: `401` (unauthorized — auth required, which is correct). If `404`, the dev endpoints are not registered (wrong environment or build mismatch). If `000`, Clara API is unreachable despite Step 2.5 passing — wait 5 seconds and retry once.

---

### Task 4: Run E2E test suite against Nexus

- [ ] **Step 4.1: Execute the full suite**

```bash
cd C:/nkmn/Projects/meditrack/tests/e2e && npx playwright test --project=clara-nexus 2>&1
```

The `globalSetup` runs first (logs in, refreshes `doctor-auth.json`), then all 9 tests run sequentially (workers: 1).

**Reading the output:**

The list reporter prints each test result as it runs:
```
Running 9 tests using 1 worker

  ✓  1 [clara-nexus] › clara/live-session.spec.ts:155:3 › Clara Live Session — Nexus › navigates to Clara...
  ✓  2 ...
  ...
  9 passed (47.2s)
```

Or on failure:
```
  ✗  3 [clara-nexus] › ...
     Error: ...
  ...
  2 failed, 7 passed
```

- [ ] **Step 4.2: Parse and record Nexus results**

From the output, record:
- Total tests: 9
- Passed: N
- Failed: N
- Skipped: N (tests with `test.skip(!accessToken, ...)` skip if globalSetup didn't capture the token)
- Total duration (seconds)

**If 0 tests ran:** globalSetup failed. Look for `globalSetup` in the error message. The most common cause is the doctor account not being seeded. The user must run the simulator: in Nexus, this means the `simulator` service ran (check Aspire dashboard at `https://localhost:17178`).

**If some tests skip:** The OIDC token was not found in sessionStorage after login. This is a timing issue — re-run once. If it persists, proceed to Step 4.3.

**If all 9 passed:** Record ✅ Nexus: 9/9 passed. Proceed to Task 5 (environment switch).

**If any failed:** Proceed to Task 4.3 to investigate with Playwright MCP.

- [ ] **Step 4.3: Investigate failures with Playwright MCP (skip if all passed)**

First, load the Playwright MCP schemas:

Use `ToolSearch` with query `select:mcp__playwright__browser_navigate,mcp__playwright__browser_snapshot,mcp__playwright__browser_take_screenshot,mcp__playwright__browser_evaluate,mcp__playwright__browser_click,mcp__playwright__browser_close`

Then for each failed test, reproduce it manually using the MCP tools:

**For test 1 (navigates to Clara):**
```
browser_navigate: https://localhost:3000/clara
browser_snapshot → look for heading "Start New Session" and button "Start Session with Clara"
browser_take_screenshot → save for report
```

**For test 2 (start session):**
```
browser_navigate: https://localhost:3000/clara
browser_click: button with name matching /Start Session with Clara/i
browser_wait_for: URL matches /\/clara\/session\/[a-f0-9-]+$/
browser_snapshot → look for "Live Transcript" and "Clara's Suggestions" headings
```

**For API-dependent tests (3–9):** Check OIDC token first:
```
browser_navigate: https://localhost:3000
browser_evaluate: (() => { const k = "oidc.user:https://localhost:5001:meditrack-web"; return sessionStorage.getItem(k) ? "token_found" : "no_token"; })()
```
If `no_token`: the OIDC restore script didn't fire. Check fixtures.ts is importing correctly.

**For SignalR test (3, 5):** Open the browser console:
```
browser_console_messages → look for SignalR connection errors
```

- [ ] **Step 4.4: Re-run individual failing tests after investigation**

```bash
cd C:/nkmn/Projects/meditrack/tests/e2e && npx playwright test --project=clara-nexus -g "TEST_NAME_HERE" 2>&1
```

Replace `TEST_NAME_HERE` with the exact test title (partial match works).

- [ ] **Step 4.5: Close the MCP browser before switching environments**

```
browser_close
```

This frees the browser process and avoids port/session conflicts during the Docker phase.

---

### Task 5: Record Nexus phase result

Before switching to Docker, write down the Nexus result:

```
NEXUS RESULTS
=============
Environment: Nexus (start-aspire.cmd, --launch-profile https)
Date: 2026-04-12
Tests: 9
Passed: [N]
Failed: [N]
Skipped: [N]
Duration: [Xs]
Failed tests (if any):
  - [test name]: [error summary]
```

---

## Phase 2 — Docker

---

### Task 6: Switch environment — stop Nexus, start Docker

Nexus and Docker both bind ports 5001–5005 and 3000. They cannot run simultaneously.

- [ ] **Step 6.1: Detect if Nexus is still running**

```bash
curl -sk https://localhost:5001/health/live -o /dev/null -w "%{http_code}"
```

If `200`: Nexus (or Docker) is still up. Check which one:

```bash
cd C:/nkmn/Projects/meditrack && docker ps --filter "name=meditrack" --format "{{.Names}}" 2>&1
```

- If Docker container names appear → Docker is already running! Skip Steps 6.2–6.4 and go directly to Task 7.
- If no Docker containers → Nexus is running. The user must stop it.

- [ ] **Step 6.2: Wait for user to stop Nexus**

Use `AskUserQuestion` tool:

> "Nexus is still running on localhost:5001. Please stop it now (press Ctrl+C in the start-aspire.cmd terminal window) and confirm when done."

Wait for user confirmation before continuing.

- [ ] **Step 6.3: Confirm ports are free**

```bash
curl -sk https://localhost:5001/health/live -o /dev/null -w "%{http_code}"
```

Expected: `000` (connection refused — port is free). If still `200`, wait 5 seconds and retry. If Nexus takes longer to shut down, poll up to 3 times with 5-second intervals.

- [ ] **Step 6.4: Start Docker services**

```bash
cd C:/nkmn/Projects/meditrack && docker-compose up -d 2>&1
```

Expected output ends with:
```
✔ Container meditrack-identity-api-1  Started
✔ Container meditrack-patient-api-1   Started
...
✔ Container meditrack-clara-api-1     Started
✔ Container meditrack-web-1           Started
```

If any container fails to start, check logs:
```bash
cd C:/nkmn/Projects/meditrack && docker-compose logs --tail=50 <service-name>
```

Common failure: `port already in use` → Step 6.3 wasn't complete, Nexus is still holding the port.

---

### Task 7: Run Docker simulator to seed test data

The simulator creates the doctor account (`doctor@meditrack.local`) and test patients in the PostgreSQL databases. It must complete before E2E tests run.

- [ ] **Step 7.1: Wait for postgres to be healthy**

```bash
cd C:/nkmn/Projects/meditrack && docker-compose ps postgres 2>&1
```

Expected: `postgres` shows `healthy`. Poll up to 30 seconds.

```bash
cd C:/nkmn/Projects/meditrack && docker-compose ps postgres --format json 2>&1 | python -c "import sys,json; [print(s.get('Health','')) for s in json.load(sys.stdin)]" 2>/dev/null || docker-compose ps postgres
```

- [ ] **Step 7.2: Run the simulator**

```bash
cd C:/nkmn/Projects/meditrack && docker-compose --profile seed run --rm simulator 2>&1
```

Expected: the simulator exits 0. Output includes lines like:
```
[Seeder] Seeding identity database...
[Seeder] Created user doctor@meditrack.local
[Seeder] Seeding patient database...
[Seeder] Done.
```

If the simulator fails with a database connection error, postgres isn't ready yet — wait 10 seconds and retry once.

If the simulator fails with `already exists` errors, the data was already seeded from a previous run — this is fine, treat as success.

---

### Task 8: Docker service health checks

Same health checks as Task 2 but now verifying Docker containers are up and TLS is working correctly (this validates the entire HTTPS production-parity implementation).

- [ ] **Step 8.1: Check Identity API — HTTPS with mkcert CA**

```bash
curl -sk https://localhost:5001/health/live -o /dev/null -w "%{http_code}"
```

Expected: `200`. The `-s` (silent) and `-k` (ignore cert errors) flags are used because the Playwright host machine doesn't need to trust the mkcert cert — only the containers need to trust each other's certs internally. From the host, `-k` is acceptable for dev.

- [ ] **Step 8.2: Check Patient API**

```bash
curl -sk https://localhost:5002/health/live -o /dev/null -w "%{http_code}"
```

Expected: `200`.

- [ ] **Step 8.3: Check Appointment API**

```bash
curl -sk https://localhost:5003/health/live -o /dev/null -w "%{http_code}"
```

Expected: `200`.

- [ ] **Step 8.4: Check MedicalRecords API**

```bash
curl -sk https://localhost:5004/health/live -o /dev/null -w "%{http_code}"
```

Expected: `200`.

- [ ] **Step 8.5: Check Clara API**

```bash
curl -sk https://localhost:5005/health/live -o /dev/null -w "%{http_code}"
```

Expected: `200`.

- [ ] **Step 8.6: Check Web (nginx on port 443 → host 3000)**

```bash
curl -sk https://localhost:3000 -o /dev/null -w "%{http_code}"
```

Expected: `200`. Docker's web container runs nginx serving the built React SPA on port 443 mapped to host 3000.

- [ ] **Step 8.7: Verify inter-container JWT validation is working (HTTPS-parity test)**

This verifies that patient-api can reach identity-api over HTTPS inter-container, which is the core of our HTTPS production-parity change:

```bash
cd C:/nkmn/Projects/meditrack && docker-compose exec patient-api sh -c "curl -s https://identity-api:8443/.well-known/openid-configuration" 2>&1 | head -c 200
```

Expected: JSON starting with `{"issuer":"https://localhost:5001"`. If this fails with `SSL certificate problem` or `Could not resolve host`, the HTTPS inter-container change has a problem — investigate the CA trust setup before running E2E tests.

- [ ] **Step 8.8: Verify no HTTP port 8080 is bound**

```bash
cd C:/nkmn/Projects/meditrack && docker-compose exec identity-api sh -c "ss -tlnp | grep LISTEN" 2>&1
```

Expected: only `8443` listed. `8080` must NOT appear.

---

### Task 9: Run E2E test suite against Docker

- [ ] **Step 9.1: Execute the full suite**

```bash
cd C:/nkmn/Projects/meditrack/tests/e2e && npx playwright test --project=clara-nexus 2>&1
```

The test URLs are identical to Nexus (`https://localhost:3000`, `https://localhost:5001`, `https://localhost:5005`). No config change needed.

**Key difference from Nexus:** The web in Docker serves the pre-built static SPA via nginx (not the Vite dev server). The OIDC configuration is baked in at build time via `VITE_*` args in `docker-compose.yml`. If OIDC endpoints differ from what oidc-client-ts expects, auth will fail.

- [ ] **Step 9.2: Parse and record Docker results**

From the output, record:
- Passed: N
- Failed: N
- Skipped: N
- Duration: Xs

**If globalSetup fails on Docker:** The doctor account wasn't seeded. Go back to Task 7.2 and re-run the simulator.

**If auth tests skip:** The OIDC token wasn't captured in sessionStorage. In Docker the web is nginx-served (not Vite HMR). Check if the OIDC redirect is going to the wrong issuer URL. The `doctor-auth.json` fixture uses `oidc.user:https://localhost:5001:meditrack-web` as the session key — this must match what the Docker-built frontend uses.

**If all 9 passed:** Record ✅ Docker: 9/9 passed.

**If any failed:** Proceed to Step 9.3.

- [ ] **Step 9.3: Investigate Docker-specific failures with Playwright MCP**

Load Playwright MCP tools (same ToolSearch as Step 4.3).

**Docker-specific issues to check:**

Check for CSP or mixed-content errors (nginx may have stricter headers than Vite dev server):
```
browser_navigate: https://localhost:3000
browser_console_messages → look for CSP violations, CORS errors, or mixed-content warnings
browser_take_screenshot → capture the landing page state
```

Check the OIDC issuer URL baked into the Docker build matches identity:
```
browser_navigate: https://localhost:3000/clara
browser_evaluate: (() => JSON.parse(localStorage.getItem("__playwright_oidc__oidc.user:https://localhost:5001:meditrack-web") ?? "null"))()
```
If `null`: the OIDC key prefix doesn't match — the frontend was built with a different `VITE_IDENTITY_URL`.

Check Clara API SignalR in Docker:
```
browser_navigate: https://localhost:3000/clara/session/<any-valid-uuid>
browser_console_messages → look for "HubConnection" errors or WebSocket failures
```

- [ ] **Step 9.4: Close MCP browser after investigation**

```
browser_close
```

---

### Task 10: Record Docker phase result and compare

- [ ] **Step 10.1: Write Docker result**

```
DOCKER RESULTS
==============
Environment: Docker (docker-compose up -d)
Date: 2026-04-12
Tests: 9
Passed: [N]
Failed: [N]
Skipped: [N]
Duration: [Xs]
Failed tests (if any):
  - [test name]: [error summary]
```

- [ ] **Step 10.2: Compare Nexus vs Docker results**

Report the comparison:

```
COMPARISON
==========
                    Nexus     Docker
Passed              [N]/9     [N]/9
Failed              [N]       [N]
Skipped             [N]       [N]
Duration            [Xs]      [Xs]

Parity: [YES if same pass/fail pattern] / [NO — list divergences]
```

If results diverge, note which tests fail in Docker but pass in Nexus (or vice versa). These are environment-specific regressions:
- Nexus-only failure → issue with dotnet run / dev cert / Aspire config
- Docker-only failure → issue with nginx build, Docker cert chain, inter-container HTTPS, or baked VITE vars

- [ ] **Step 10.3: Tear down Docker (optional)**

Only tear down if the user requested cleanup:
```bash
cd C:/nkmn/Projects/meditrack && docker-compose down
```

Leave running if the user wants the environment up for manual inspection.

---

## Failure Reference

| Symptom | Likely cause | Fix |
|---|---|---|
| `curl: (7) Failed to connect` on any health check | Service not running | Start Nexus or check `docker-compose ps` |
| `globalSetup` error: can't find Sign In button | Web SPA not loading | Check web health check Step 2.6 / 8.6 |
| `globalSetup` error: redirected but no token | Doctor account not in DB | Run simulator |
| Tests skip (not fail) | No OIDC token in sessionStorage | Check OIDC restore script, re-run once |
| Test 2 fails: URL doesn't match `/clara/session/` | `POST /api/sessions` failed | Check Clara API logs for JWT validation errors |
| Tests 3–6 fail with 401 | Token extraction failed | Check `extractAccessToken` in beforeAll |
| Tests 3–6 fail with SignalR error | SignalR hub not connecting | Check Clara API logs, check MaxReceiveMessageSize |
| Docker inter-container curl fails with SSL error | CA not installed in containers | Rebuild with `docker-compose build --no-cache` after running `dev-certs\setup-certs.cmd` |
| Docker port conflict on `docker-compose up` | Nexus still running | Ask user to stop Nexus (Ctrl+C in terminal) |
| Docker web returns 502 | nginx started before API is healthy | Wait 30s and retry health checks |
