# PR #4 Quality Fixes & Documentation Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four code quality issues from PR #4 and prune stale documentation post-PR #3.

**Architecture:** Structural refactors only — no new features, no API changes. Code fixes are localized to Identity.API Razor markup, the theme generator script, one React component, and two React hooks. Doc changes are file edits only.

**Tech Stack:** ASP.NET Core Razor Pages (C#/HTML), Node.js ESM script (`.mjs`), React 19 + TypeScript, Markdown.

**Spec:** `docs/superpowers/specs/2026-04-14-pr4-quality-and-doc-cleanup-design.md`

---

## File Map

| Action | File | Reason |
|--------|------|--------|
| Create | `src/Identity.API/Pages/Shared/_AuthBranding.cshtml` | Extracted branding partial |
| Modify | `src/Identity.API/Pages/Account/Login/Index.cshtml` | Replace duplicate panel with `<partial>` |
| Modify | `src/Identity.API/Pages/Account/Register/Index.cshtml` | Replace duplicate panel with `<partial>` |
| Modify | `scripts/generate-identity-themes.mjs` | Also emit `theme-vars.css` |
| Modify | `src/Identity.API/wwwroot/css/theme-vars.css` | Updated header (auto-generated) |
| Modify | `src/MediTrack.Web/src/shared/components/ThemeSwitcher.tsx:112` | Fix `key={i}` → `key={color}` |
| Modify | `src/MediTrack.Web/src/shared/hooks/use-theme.ts` | Export `initTheme()` |
| Modify | `src/MediTrack.Web/src/shared/hooks/use-color-theme.ts` | Export `initColorTheme()` |
| Modify | `src/MediTrack.Web/src/main.tsx` | Call `initTheme()` / `initColorTheme()` explicitly |
| Modify | `CHANGELOG.md` | Add feat/theme-consistency entry |
| Modify | `docs/clara-agentic-ai-plan.md` | Prune to remaining items only |
| Modify | `docs/hipaa-compliance-checklist.md` | Prune to open technical gaps only |
| Modify | `docs/emr-compliance-status.md` | Update date + add security baseline note |

---

## Task 1: Extract `_AuthBranding.cshtml` Razor Partial

> **No unit tests** — Razor markup has no test surface; verification is `dotnet build`.

**Files:**
- Create: `src/Identity.API/Pages/Shared/_AuthBranding.cshtml`
- Modify: `src/Identity.API/Pages/Account/Login/Index.cshtml`
- Modify: `src/Identity.API/Pages/Account/Register/Index.cshtml`

- [ ] **Step 1: Create the partial file**

Create `src/Identity.API/Pages/Shared/_AuthBranding.cshtml` with this exact content (extracted from Login):

```html
<!-- Left branding panel (desktop only, hidden by CSS < 1024px) -->
<div class="auth-branding">
    <div class="auth-branding-overlay"></div>
    <div class="auth-branding-content">
        <!-- Stethoscope icon -->
        <svg class="auth-branding-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" /><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" /><circle cx="20" cy="10" r="2" />
        </svg>
        <h1 class="auth-branding-title">MediTrack</h1>
        <p class="auth-branding-tagline">Enterprise Medical Records System</p>

        <div class="auth-branding-features">
            <div class="auth-branding-feature">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                <span>Secure patient record management</span>
            </div>
            <div class="auth-branding-feature">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                <span>Clara — your AI medical secretary</span>
            </div>
            <div class="auth-branding-feature">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                <span>Real-time appointment scheduling</span>
            </div>
        </div>

        <div class="auth-branding-trust">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            <span>Trusted by healthcare professionals</span>
        </div>
    </div>
</div>
```

- [ ] **Step 2: Replace the duplicate block in `Login/Index.cshtml`**

In `src/Identity.API/Pages/Account/Login/Index.cshtml`, replace lines 5–36 (the entire `<!-- Left branding panel ... </div>` block) with:

```html
<partial name="_AuthBranding" />
```

The file should now start:

```html
@page
@model MediTrack.Identity.Pages.Account.Login.Index

<div class="auth-page">
    <partial name="_AuthBranding" />

    <!-- Right form panel -->
    <div class="auth-form-panel">
```

- [ ] **Step 3: Replace the duplicate block in `Register/Index.cshtml`**

In `src/Identity.API/Pages/Account/Register/Index.cshtml`, replace lines 8–38 (the entire branding `<div class="auth-branding">...</div>` block) with:

```html
    <partial name="_AuthBranding" />
```

- [ ] **Step 4: Build to verify**

```bash
dotnet build src/Identity.API
```

Expected: `Build succeeded. 0 Warning(s). 0 Error(s).`

- [ ] **Step 5: Commit**

```bash
git add src/Identity.API/Pages/Shared/_AuthBranding.cshtml \
        src/Identity.API/Pages/Account/Login/Index.cshtml \
        src/Identity.API/Pages/Account/Register/Index.cshtml
git commit -m "refactor(identity): extract auth branding panel to _AuthBranding partial"
```

---

## Task 2: Fix React Key in PaletteRow

> **No unit tests** — the key prop is consumed by React's reconciler, not user-visible logic. Verification is `npm run lint`.

**Files:**
- Modify: `src/MediTrack.Web/src/shared/components/ThemeSwitcher.tsx:111`

- [ ] **Step 1: Fix the key**

In `src/MediTrack.Web/src/shared/components/ThemeSwitcher.tsx`, find the swatch map (around line 111):

```tsx
{config.swatches.map((color, i) => (
  <span key={i} className="inline-block h-5 w-5 rounded-full border border-border/30" style={{ backgroundColor: color }} />
))}
```

Replace with:

```tsx
{config.swatches.map((color) => (
  <span key={color} className="inline-block h-5 w-5 rounded-full border border-border/30" style={{ backgroundColor: color }} />
))}
```

- [ ] **Step 2: Lint**

```bash
cd src/MediTrack.Web && npm run lint
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/MediTrack.Web/src/shared/components/ThemeSwitcher.tsx
git commit -m "fix(web): use color value as key in PaletteRow swatch map"
```

---

## Task 3: Replace Side-Effect Imports with Explicit Init Functions

> **No unit tests** — this is a structural refactor; the runtime behavior is identical. Verification is `npm run build`.

**Files:**
- Modify: `src/MediTrack.Web/src/shared/hooks/use-theme.ts`
- Modify: `src/MediTrack.Web/src/shared/hooks/use-color-theme.ts`
- Modify: `src/MediTrack.Web/src/main.tsx`

### use-theme.ts

- [ ] **Step 1: Wrap module-level apply call in `initTheme()`**

In `src/MediTrack.Web/src/shared/hooks/use-theme.ts`, find these two lines at module level (around lines 35–36):

```ts
// Apply immediately at module load so the correct theme is visible
// before any React component mounts (prevents light flash on F5).
applyTheme(currentPreference);
```

Replace them with an exported function (keeping the comment):

```ts
/**
 * Apply the persisted theme preference to <html> immediately.
 * Call once in main.tsx before createRoot to prevent flash on hard refresh.
 * Safe to call multiple times — idempotent.
 */
export function initTheme(): void {
  applyTheme(currentPreference);
}
```

The `let currentPreference` block and localStorage read above it stay exactly as they are (module-level variable init is still needed so `getSnapshot` works).

### use-color-theme.ts

- [ ] **Step 2: Wrap module-level apply call in `initColorTheme()`**

In `src/MediTrack.Web/src/shared/hooks/use-color-theme.ts`, find these lines at module level (around lines 49–51):

```ts
// Apply immediately at module load so the correct color palette is visible
// before any React component mounts (prevents theme flash on F5).
applyColorTheme(currentThemeId);
```

Replace them with an exported function:

```ts
/**
 * Apply the persisted color theme to <html> immediately.
 * Call once in main.tsx before createRoot to prevent flash on hard refresh.
 * Safe to call multiple times — idempotent.
 */
export function initColorTheme(): void {
  applyColorTheme(currentThemeId);
}
```

### main.tsx

- [ ] **Step 3: Replace side-effect imports with explicit calls**

In `src/MediTrack.Web/src/main.tsx`, find:

```ts
// Eager theme initialization — applies saved theme before first render
// so pages outside <Layout> (e.g. Landing) don't flash light on F5.
import "./shared/hooks/use-theme";
import "./shared/hooks/use-color-theme";
```

Replace with:

```ts
// Eager theme initialization — applies saved theme before first render
// so pages outside <Layout> (e.g. Landing) don't flash light on F5.
import { initTheme } from "./shared/hooks/use-theme";
import { initColorTheme } from "./shared/hooks/use-color-theme";
initTheme();
initColorTheme();
```

- [ ] **Step 4: Build to verify**

```bash
cd src/MediTrack.Web && npm run build
```

Expected: `✓ built in` — zero TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/MediTrack.Web/src/shared/hooks/use-theme.ts \
        src/MediTrack.Web/src/shared/hooks/use-color-theme.ts \
        src/MediTrack.Web/src/main.tsx
git commit -m "refactor(web): replace opaque side-effect imports with explicit initTheme/initColorTheme"
```

---

## Task 4: Extend Generate Script to Auto-emit `theme-vars.css`

> **No unit tests** — the script is a one-shot CLI tool; verification is running it and inspecting the output.

**Files:**
- Modify: `scripts/generate-identity-themes.mjs`
- Modify: `src/Identity.API/wwwroot/css/theme-vars.css` (regenerated by script)

- [ ] **Step 1: Add CSS block extractor and second output to the script**

In `scripts/generate-identity-themes.mjs`, replace the entire file with:

```js
#!/usr/bin/env npx tsx
/**
 * Generate Identity.API theme CSS from the Web project sources.
 *
 * Outputs two files:
 *   1. theme-vars.css  — :root + .dark defaults (extracted from Web's index.css)
 *   2. all-themes.css  — named palette overrides (derived from color-themes.ts)
 *
 * Usage: npx tsx scripts/generate-identity-themes.mjs
 * Re-run when index.css or color-themes.ts changes.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveTheme } from "../src/MediTrack.Web/src/shared/utils/themeDerivation.ts";
import { COLOR_THEME_CONFIGS } from "../src/MediTrack.Web/src/shared/config/color-themes.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

const INDEX_CSS_PATH = resolve(__dirname, "../src/MediTrack.Web/src/index.css");
const THEME_VARS_PATH = resolve(__dirname, "../src/Identity.API/wwwroot/css/theme-vars.css");
const ALL_THEMES_PATH = resolve(__dirname, "../src/Identity.API/wwwroot/css/all-themes.css");

// ── Helper: extract a top-level CSS block by selector ─────────────────────
function extractCssBlock(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) return null;
  const openBrace = css.indexOf("{", start);
  if (openBrace === -1) return null;
  let depth = 0;
  for (let i = openBrace; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  return null;
}

// ── 1. Generate theme-vars.css from Web's index.css ───────────────────────
const indexCss = readFileSync(INDEX_CSS_PATH, "utf-8");

const rootBlock = extractCssBlock(indexCss, ":root");
const darkBlock = extractCssBlock(indexCss, ".dark");

if (!rootBlock || !darkBlock) {
  throw new Error("Could not find :root or .dark block in index.css");
}

const themeVarsLines = [
  "/*",
  " * MediTrack theme tokens — auto-generated by scripts/generate-identity-themes.mjs",
  " * Source: src/MediTrack.Web/src/index.css",
  ` * Generated: ${new Date().toISOString().slice(0, 10)}`,
  " * DO NOT EDIT MANUALLY — re-run the script instead.",
  " */",
  "",
  rootBlock,
  "",
  darkBlock,
  "",
];

writeFileSync(THEME_VARS_PATH, themeVarsLines.join("\n"), "utf-8");
console.log(`Generated theme-vars.css → ${THEME_VARS_PATH}`);

// ── 2. Generate all-themes.css from color-themes.ts ──────────────────────
const allThemesLines = [
  "/* Auto-generated by scripts/generate-identity-themes.mjs */",
  "/* Source: src/MediTrack.Web/src/shared/config/color-themes.ts */",
  `/* Generated: ${new Date().toISOString().slice(0, 10)} — ${COLOR_THEME_CONFIGS.length} themes */`,
  "",
];

for (const config of COLOR_THEME_CONFIGS) {
  const theme = deriveTheme(config.palette);
  const vars = Object.entries(theme)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");

  const selector = `html.theme-${config.id}`;
  allThemesLines.push(`${selector} {`);
  allThemesLines.push(vars);
  allThemesLines.push("}");
  allThemesLines.push("");
}

writeFileSync(ALL_THEMES_PATH, allThemesLines.join("\n"), "utf-8");
console.log(`Generated all-themes.css (${COLOR_THEME_CONFIGS.length} themes) → ${ALL_THEMES_PATH}`);
```

- [ ] **Step 2: Run the script and verify output**

```bash
cd C:/nkmn/Projects/meditrack && npx tsx scripts/generate-identity-themes.mjs
```

Expected output:
```
Generated theme-vars.css → ...\src\Identity.API\wwwroot\css\theme-vars.css
Generated all-themes.css (10 themes) → ...\src\Identity.API\wwwroot\css\all-themes.css
```

Then spot-check `theme-vars.css` — it should start with the auto-generated header comment and contain the `:root { ... }` and `.dark { ... }` blocks from `index.css`.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-identity-themes.mjs \
        src/Identity.API/wwwroot/css/theme-vars.css \
        src/Identity.API/wwwroot/css/all-themes.css
git commit -m "feat(scripts): extend generate-identity-themes to auto-emit theme-vars.css"
```

---

## Task 5: Update CHANGELOG.md

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add feat/theme-consistency entry to `[Unreleased]`**

In `CHANGELOG.md`, find the `## [Unreleased]` section and add under `### Added` (create the subsection if it doesn't exist):

```markdown
### Added
- Theme consistency (2026-03-25) — feat/theme-consistency
  - Web ↔ Design CSS variable sync (background, card, border, sidebar values aligned)
  - 5 missing Clara animations added to Web (`transcript-in`, `waveform`, `suggestion-in`, `blink`, `border-gradient`)
  - `ThemeSwitcherPopover` available on Landing page and Identity.API login
  - Eager `initTheme()` / `initColorTheme()` in `main.tsx` — prevents light flash on hard refresh (F5)
  - Identity.API theming: split-panel Login + Register layout (branding gradient + form)
  - Cookie-based theme sharing — Web sets `meditrack-theme-mode` + `meditrack-color-theme`, Identity reads server-side
  - Server-side anti-FOUC in `_Layout.cshtml` (Razor reads cookie, sets `html` class before render)
  - `all-themes.css` + `theme-vars.css` auto-generated by `scripts/generate-identity-themes.mjs`
  - External JS files for logout countdown + redirect (no inline scripts)
  - TDD infrastructure: `Clara.UnitTests` and `MedicalRecords.UnitTests` projects with NSubstitute + Testcontainers

### Security
- CSP hardened on Identity.API (2026-03-25) — feat/theme-consistency
  - Removed `unsafe-inline` from `script-src` and `style-src` (OWASP A02:2025)
  - All scripts served from `wwwroot/js/`, all styles from `wwwroot/css/`

### Fixed
- AutoMapper CVE (2026-03-15) — feat/theme-consistency
  - Bumped AutoMapper 16.0.0 → 16.1.1 (fixes GHSA-rvv3-g6hj-g44x, zero warnings)
- clsxMerge standardization (2026-03-25) — feat/theme-consistency
  - Replaced all `cn()` calls with `clsxMerge()` across 112 files (44 Web + 68 Design)
  - Deleted `src/MediTrack.Web/src/shared/utils/cn.ts` and `design/src/lib/utils.ts`
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add feat/theme-consistency entries to CHANGELOG"
```

---

## Task 6: Prune `docs/clara-agentic-ai-plan.md`

Replace the entire file with a forward-looking document containing only what hasn't shipped yet.

**Files:**
- Modify: `docs/clara-agentic-ai-plan.md`

- [ ] **Step 1: Replace file content**

Replace the entire file with:

```markdown
# Clara Agentic AI — Remaining Roadmap

> PR #3 shipped P0.3, P1.3, P2.1–P2.5, P3.1–P3.3. The items below are what's left.

---

## Remaining Items

### P0 — Quick Wins

#### P0.1 — Urgent Keyword Bypass
**What:** When a patient says "chest pain", "can't breathe", "severe bleeding", skip the 5-utterance/60s batch timer and trigger suggestions immediately.
**Where:** `src/Clara.API/Services/BatchTriggerService.cs` → `OnTranscriptLineAddedAsync()`
**How:** Add a `HashSet<string>` of urgent phrases. Check before the utterance count/timer logic. Call `TriggerBatchSuggestionAsync()` directly with high priority flag.
**Effort:** ~20 lines.

#### P0.2 — Disconnect Cleanup
**What:** Call `BatchTriggerService.CleanupSession()` from `SessionHub.OnDisconnectedAsync()`. Without it, each abandoned session leaks a `Timer` + `ConcurrentDictionary` entry.
**Where:** `src/Clara.API/Hubs/SessionHub.cs` → `OnDisconnectedAsync()`; add `ConcurrentDictionary<string, string>` mapping connectionId → sessionId in `SessionHub`.
**Effort:** ~15 lines.

---

### P1 — Before Next Demo

#### P1.1 — Tiered Model Routing (Cost)
**What:** Route batch suggestions → GPT-4o-mini (cheap), on-demand/urgent → Claude Sonnet (accurate). Two `IChatClient` keyed registrations.
**Where:** `src/Clara.API/Program.cs` → add `AddKeyedSingleton<IChatClient>("batch", ...)` and `AddKeyedSingleton<IChatClient>("ondemand", ...)`. Update `SuggestionService` to inject `[FromKeyedServices("batch")] IChatClient`.
**Note:** `IAgentService` keyed DI already exists — this is specifically for cost-optimised model routing per call type.
**Effort:** ~1 day.

#### P1.2 — Evidence Linking
**What:** Tag each `Suggestion` with the `TranscriptLine.Id`(s) that triggered it. Frontend highlights source transcript lines on suggestion hover.
**Where:** Add `List<Guid> SourceTranscriptLineIds` to `Suggestion` entity + EF migration. Populate in `SuggestionService.ParseLlmResponse()`. Add SignalR event field. Update frontend `SuggestionCard`.
**Effort:** ~1 day backend + ~0.5 day frontend.

#### P1.4 — Full Streaming Agent Events
**What:** Stream the agent's thinking process step by step: `onThinking` → `onToolStarted` → `onToolCompleted` → `onTextChunk` → `onSuggestionComplete`. Currently `AgentEvent` types are wired but suggestions still arrive as finished objects.
**Where:** `src/Clara.API/Services/SuggestionService.cs` → return `IAsyncEnumerable<AgentEvent>`. `src/Clara.API/Hubs/SessionHub.cs` → stream events. Frontend `useSession` hook → handle incremental events.
**Effort:** ~2 days.

---

### P2 — Production Hardening

#### P2.2 — Session State Machine (Partial)
**What:** Add `Session.Complete()`, `Session.Pause()`, `Session.Cancel()` methods with state validation. Enums are done; domain methods are not.
**Where:** `src/Clara.API/Models/Session.cs` — add guard methods. Update callers in `SessionApi.cs`.
**Effort:** ~4 hours.

#### P2.6 — Suggestion Tracking (Accept/Dismiss/Edit)
**What:** Add `AcceptedAt`, `DismissedAt`, `EditedAt`, `EditedContent` columns to `Suggestion`. Frontend sends action events via SignalR. Acceptance rate is the primary quality metric.
**Where:** `src/Clara.API/Models/Suggestion.cs` + EF migration. New `SuggestionAction` SignalR message in `SessionHub`. Frontend `SuggestionCard` action buttons.
**Effort:** ~1 day backend + ~1 day frontend.

---

## References

- [Canvas Hyperscribe (GitHub)](https://github.com/canvas-medical/canvas-hyperscribe) — open-source clinical AI scribe
- [Abridge Confabulation Elimination](https://www.abridge.com/ai/science-confabulation-hallucination-elimination) — 97% hallucination catch rate
- [Microsoft Azure AI Agent Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [Semantic Kernel Multi-Agent Orchestration](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-orchestration/)
- [FDA CDS Guidance (Jan 2026)](https://www.fda.gov/medical-devices/software-medical-device-samd/clinical-decision-support-software)
- [Mem0 Paper](https://arxiv.org/abs/2504.19413) — 26% quality improvement with agent memory
```

- [ ] **Step 2: Commit**

```bash
git add docs/clara-agentic-ai-plan.md
git commit -m "docs: prune clara-agentic-ai-plan to remaining items only (shipped items removed)"
```

---

## Task 7: Prune `docs/hipaa-compliance-checklist.md`

The 572-line checklist is mostly ✅ done technical items and ⏳ organizational tasks (security officer, training, BAAs) that are out of scope for development. Replace with a concise technical gaps reference.

**Files:**
- Modify: `docs/hipaa-compliance-checklist.md`

- [ ] **Step 1: Replace file content**

Replace the entire file with:

```markdown
# HIPAA Technical Gaps

> Technical baseline complete as of PR #3 (PHI audit trail, TLS, RBAC, MFA, account lockout, breach detection).
> This file tracks remaining **technical** implementation gaps only. Organizational requirements (security officer, training, BAAs) are out of scope for development.

## Open Technical Items

### Auth & Access
- **Password expiration** — enforce 90-day expiration + prevent reuse of last 10 passwords. ASP.NET Identity supports this via `IPasswordValidator`. (`src/Identity.API/`)
- **Emergency access** — "break glass" admin account with mandatory justification logging. (`src/Identity.API/`)

### Monitoring
- **Failed login alerting** — trigger alert after N failed attempts per IP (rate limiter exists; alerting does not). (`src/Notification.Worker/`)
- **Audit log review dashboard** — Admin UI to query `PHIAuditLog` with filters (user, patient, date range). (`src/MediTrack.Web/src/features/admin/`)

### Data Protection
- **Encrypted backups** — verify Azure Backup encrypts PostgreSQL snapshots at rest. (Infrastructure)
- **Backup restore test** — documented restore procedure with verified RTO/RPO. (Infrastructure)

### Breach Response
- **Breach notification workflow** — automated email to affected individuals within 60 days of `PHIBreachDetectedIntegrationEvent`. (HIPAA Breach Notification Rule §164.404). (`src/Notification.Worker/`)

## Compliance References

- [HHS Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [HHS Breach Portal](https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf)
- [Azure HIPAA Blueprint](https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-hipaa-us)
- [NIST SP 800-66 Rev. 1](https://csrc.nist.gov/publications/detail/sp/800-66/rev-1/final)
```

- [ ] **Step 2: Commit**

```bash
git add docs/hipaa-compliance-checklist.md
git commit -m "docs: prune HIPAA checklist to open technical gaps only"
```

---

## Task 8: Update `docs/emr-compliance-status.md`

Minor update only — update the date and add a security baseline note. The scorecard rows are still accurate.

**Files:**
- Modify: `docs/emr-compliance-status.md`

- [ ] **Step 1: Update the date and add security note**

At the top of the file, update:

```markdown
**Last updated**: 2026-02-25
```

to:

```markdown
**Last updated**: 2026-04-14
```

And update the note block:

```markdown
**Note**: This is a **reference document**, not a roadmap deliverable with acceptance criteria. For an educational project at 3,000 users, full USCDI v3 compliance is scope creep. Use this scorecard to guide prioritization (Tier 1 items only), not as a checklist for completion.
```

to:

```markdown
**Note**: This is a **reference document**, not a roadmap deliverable with acceptance criteria. For an educational project at 3,000 users, full USCDI v3 compliance is scope creep. Use this scorecard to guide prioritization (Tier 1 items only).

**Security baseline**: HIPAA technical requirements are complete as of PR #3 — PHI audit trail, TLS/HTTPS, RBAC, MFA, account lockout, CSP hardening (OWASP A02:2025). See `docs/hipaa-compliance-checklist.md` for remaining gaps.
```

- [ ] **Step 2: Commit**

```bash
git add docs/emr-compliance-status.md
git commit -m "docs: update EMR compliance status date and add security baseline note"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Full frontend build + lint**

```bash
cd src/MediTrack.Web && npm run lint && npm run build
```

Expected: zero ESLint errors, `✓ built in` — no TypeScript errors.

- [ ] **Step 2: Backend build**

```bash
dotnet build src/Identity.API
```

Expected: `Build succeeded. 0 Warning(s). 0 Error(s).`

- [ ] **Step 3: Regenerate theme files (confirm script still works end-to-end)**

```bash
npx tsx scripts/generate-identity-themes.mjs
```

Expected: two "Generated" lines, no errors.

- [ ] **Step 4: Confirm no `cn(` references remain in Web**

```bash
grep -r "from.*['\"]cn['\"]" src/MediTrack.Web/src --include="*.ts" --include="*.tsx"
```

Expected: no output (cn.ts was already deleted in PR #4).

---

## Self-Review Checklist

- **Spec coverage**: Fix 1 (partial) ✅ Task 1. Fix 2 (generate script) ✅ Task 4. Fix 3 (React key) ✅ Task 2. Fix 4 (initTheme) ✅ Task 3. CHANGELOG ✅ Task 5. Clara plan ✅ Task 6. HIPAA ✅ Task 7. EMR ✅ Task 8.
- **No placeholders**: All steps contain complete code or exact file content.
- **Type consistency**: `initTheme()` / `initColorTheme()` names consistent across Task 3 steps.
- **Task ordering**: Razor partial (Task 1) before verification (Task 9). Generate script (Task 4) runs the regenerated output — correct.
