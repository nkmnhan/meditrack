# Clara — Gap Analysis

**Date**: 2026-03-01
**Branch**: feat/medical-ai-secretary
**Scope**: Technical and requirements review against `plans/clara-mvp-plan.md` and `docs/medical-ai-architecture-summary.md`
**Status**: All 15 issues resolved ✓

---

## Critical Bugs — Will cause runtime failures

### #1 Hub method name mismatch (audio streaming is broken) ✓ RESOLVED

`useSession.ts:160` invoked `"SendAudioChunk"` but the backend hub method is named `StreamAudioChunk`. SignalR invocations that don't match a hub method fail silently — audio never reaches Deepgram.

**Fix applied**: Renamed invocation to `"StreamAudioChunk"` in `useSession.ts`.

---

### #2 Audio data type mismatch (compounds #1) ✓ RESOLVED

`useAudioRecording.ts` passed `ArrayBuffer` to `onAudioChunk → sendAudioChunk`. The hub expects a base64 `string`. The `ArrayBuffer → base64` conversion was never implemented.

**Fix applied**: Added `arrayBufferToBase64` conversion in `useSession.ts` before invoking the hub.

---

### #3 Missing hub methods — `RequestSuggestions` and `EndSession` ✓ RESOLVED

`useSession.ts` exposed two functions that invoked hub methods which don't exist in `SessionHub.cs`:
- `RequestSuggestions` (hub method) — doesn't exist; REST endpoint used instead
- `EndSession` (hub method) — doesn't exist; REST endpoint used instead

**Fix applied**: Removed both hub invocations from `useSession.ts`. `LiveSessionView` now uses `useEndSessionMutation` from `claraApi` directly. On-demand suggestions use `useRequestSuggestionsMutation`.

---

### #4 On-demand suggestions never appear in the UI (functional dead path) ✓ RESOLVED

The "Ask Clara" button flow had a disconnect:
1. REST endpoint generated and saved suggestions
2. REST endpoint never broadcast to the SignalR group
3. `LiveSessionView` discarded the HTTP response
4. UI only populated suggestions from `SuggestionAdded` SignalR events

**Fix applied**: `SessionApi.RequestSuggestion` now injects `IHubContext<SessionHub>` and broadcasts each suggestion via `SuggestionAdded`. No frontend changes needed.

---

## Functional Gaps — Feature incomplete or misaligned with requirements

### #5 LLM call has no structured output enforcement ✓ RESOLVED

`SuggestionService.CallLlmAsync` called the LLM with no `ChatOptions`. Fragile string parsing via `IndexOf('{')` / `LastIndexOf('}')` failed silently when LLM wrapped output in markdown.

**Fix applied**: Added `ChatOptions` with `Temperature = 0.3f`, `MaxOutputTokens = 300`, `ResponseFormat = ChatResponseFormat.Json` to ensure structured JSON output from the LLM.

---

### #6 Session type (Consultation / Follow-up / Review) is a dead UI element ✓ RESOLVED

`SessionStartScreen` had a session type selector whose selection was never sent to the backend. `StartSessionRequest` had no `Type` field. `Session` domain model had no `Type` field.

**Fix applied** (full-stack):
- `Session` domain model: added `SessionType` property (default `"Consultation"`)
- `StartSessionRequest` / `SessionResponse` / `SessionSummaryResponse` DTOs: added `SessionType`
- `ClaraDbContext`: added `session_type` column mapping with default value
- EF Core migration `20260301000001_AddSessionType` created
- `SessionService.StartSessionAsync` and `MapToResponse`: maps `SessionType`
- Frontend `types.ts`: added `SessionType` union type and `SessionSummary` interface
- `SessionStartScreen.tsx`: passes `selectedSessionType` in the `startSession` mutation

---

### #7 SessionStartScreen is filled with hardcoded fake data ✓ RESOLVED

Three sections showed fake data with no API backing:
- "Upcoming Appointments" — 3 hardcoded items
- "Recent Sessions" — 3 hardcoded items
- Stats bar ("3 sessions today", "12 suggestions accepted", "1.2 hrs saved") — hardcoded constants

**Fix applied**:
- Added `GET /api/sessions` endpoint to `SessionApi.cs`
- Added `GetSessionsAsync` method to `SessionService.cs` (newest first, limit 10)
- Added `getSessions` RTK Query endpoint and `useGetSessionsQuery` hook in `claraApi.ts`
- `SessionStartScreen.tsx`: removed hardcoded arrays, removed "Upcoming Appointments" section (Appointment.API integration is Phase 7), removed hardcoded stats bar, uses real API data for recent sessions

---

### #8 ClaraPanel (global floating chat) is a pure mock — no backend ✓ RESOLVED

`ClaraPanel.tsx` used `claraSuggestions` from `data/clara-suggestions.ts` with hardcoded mock responses. An unplanned UI addition that users could mistake for a functional feature.

**Fix applied**: Removed all mock logic (`findMockResponse`, `mockConversations`, `claraSuggestions` import, chat state, input bar). Simplified to a "Start Clinical Session" CTA plus an informational message card.

---

### #9 DevPanel API calls missing auth header → will return 401 ✓ RESOLVED

```ts
// DevPanel.tsx — no Authorization header
const response = await fetch(
  `/api/dev/sessions/${sessionId}/seed-transcript?scenario=${scenario}`,
  { method: 'POST' }
);
```

`DevController` has `[Authorize(Roles = UserRoles.Doctor)]`. Every `fetch()` returned 401.

**Fix applied**: `DevPanel.tsx` now uses the axios instance (which includes the Authorization header via interceptors) instead of raw `fetch()`.

---

### #10 No integration tests project ✓ RESOLVED

The plan specifies `tests/Clara.IntegrationTests/` with `SessionLifecycleTests`, `KnowledgeSearchTests`, `SignalRHubTests`. No test project existed.

**Fix applied**: Created `tests/Clara.IntegrationTests/` containing:
- `Clara.IntegrationTests.csproj` — references Clara.API, xUnit, FluentAssertions, SignalR.Client, Mvc.Testing
- `ClaraApiFactory.cs` — `WebApplicationFactory<Program>` that overrides `ConnectionStrings:ClaraDb` via config (requires real PostgreSQL with pgvector; set `CLARA_TEST_DB` env var)
- `SessionLifecycleTests.cs` — 4 tests: start (201), unknown GET (404), end (200+completed), double-end (400)
- `KnowledgeSearchTests.cs` — 2 tests: empty base returns empty, blank query returns 400
- `SignalRHubTests.cs` — 2 tests: connect to hub, join session without throwing
- `InternalsVisibleTo` added to `Clara.API.csproj` so `Program` is accessible to `WebApplicationFactory<Program>`
- Test package versions added to `Directory.Packages.props`
- Project added to `MediTrack.sln` (nested in `tests` solution folder)

> **Note**: Tests require a PostgreSQL instance with the pgvector extension. They do NOT run against an in-memory database because the EF Core model uses pgvector column types and JSONB which are incompatible with the InMemory provider.

---

## Minor / Antipattern Issues

### #11 Synchronous blocking EF Core in async SignalR hub ✓ RESOLVED

`SessionHub.StreamAudioChunk` called `_speakerDetection.InferSpeaker(Guid.Parse(sessionId))` — the synchronous method running `FirstOrDefault()` on EF Core. Under load this causes thread-pool starvation inside the async hub.

**Fix applied**: Changed to `await _speakerDetection.InferSpeakerAsync(Guid.Parse(sessionId))`. Added `using Microsoft.EntityFrameworkCore;` import.

---

### #12 Audio chunk interval: 500ms actual vs 1000ms planned ✓ RESOLVED

`useAudioRecording.ts` defaulted to `chunkIntervalMs = 500`. The plan specifies 1-second chunks. At 500ms, Deepgram receives twice as many API calls, doubling transcription cost.

**Fix applied**: Changed default from `500` to `1000` in `useAudioRecording.ts`. Updated JSDoc comment accordingly.

---

### #13 Knowledge context search uses 0.5 similarity threshold vs plan's 0.7 ✓ RESOLVED

`SearchForContextAsync` (used by `SuggestionService`) passed `minScore: 0.5f`. Weakly related chunks were included in the LLM context, increasing prompt size, cost, and off-topic suggestion risk.

**Fix applied**: Changed `minScore: 0.5f` to `minScore: 0.7f` in `KnowledgeService.SearchForContextAsync`. Updated method docstring to reflect that the same quality threshold as `SearchAsync` is intentional.

---

### #14 `useSession` `session` state is permanently `null` ✓ RESOLVED

`useSession` initialized `session: Session | null = null` and set it only on a `SessionUpdated` SignalR event. The hub never sent `SessionUpdated`. So `session` was permanently `null` for every consumer.

**Fix applied**: `SessionHub.JoinSession` now queries the database (with `Include` for transcript lines and suggestions) and broadcasts `SessionUpdated` to the caller immediately after adding them to the group. Added `using Microsoft.EntityFrameworkCore;` import to the hub.

---

### #15 SuggestionPanel misuses `source` field as a citation ✓ RESOLVED

`SuggestionCard` rendered `suggestion.source` with a `BookOpen` icon as if it were a reference citation. `source` contains `"batch"`, `"on_demand"`, or `"dev_test"` — technical routing labels, not clinical references. Displayed as "📖 batch" which is confusing to doctors.

**Fix applied**: Removed the source display block (`{/* Source */}` paragraph with `BookOpen` icon) from `SuggestionCard` in `SuggestionPanel.tsx`. The `BookOpen` icon remains in `getTypeConfig` for the "guideline"/"reference" suggestion type badge.

---

## Summary Table

| # | Severity | Area | Issue | Status |
|---|----------|------|-------|--------|
| 1 | **Critical** | Backend+Frontend | Hub method name mismatch (`SendAudioChunk` vs `StreamAudioChunk`) | ✓ Resolved |
| 2 | **Critical** | Frontend | Audio data is `ArrayBuffer`, backend expects base64 string | ✓ Resolved |
| 3 | **Critical** | Frontend | `RequestSuggestions` and `EndSession` hub methods don't exist | ✓ Resolved |
| 4 | **Critical** | Backend+Frontend | On-demand "Ask Clara" suggestions never appear in UI (no SignalR broadcast) | ✓ Resolved |
| 5 | **High** | Backend | LLM called without `ChatOptions` — no schema enforcement, fragile parsing | ✓ Resolved |
| 6 | **High** | Full-stack | Session type UI input never sent to or stored by backend | ✓ Resolved |
| 7 | **High** | Frontend | SessionStartScreen appointments, sessions, and stats are all hardcoded | ✓ Resolved |
| 8 | **Medium** | Frontend | ClaraPanel (global chat) is a mock with no backend connection | ✓ Resolved |
| 9 | **Medium** | Frontend | DevPanel `fetch()` calls missing auth header → 401 every time | ✓ Resolved |
| 10 | **Medium** | Testing | Integration tests project doesn't exist | ✓ Resolved |
| 11 | **Low** | Backend | Sync blocking EF Core call inside async SignalR hub | ✓ Resolved |
| 12 | **Low** | Frontend | Audio chunks at 500ms vs planned 1000ms — doubles Deepgram cost | ✓ Resolved |
| 13 | **Low** | Backend | RAG context uses 0.5 similarity threshold vs planned 0.7 | ✓ Resolved |
| 14 | **Low** | Frontend | `session` from `useSession` is always `null` | ✓ Resolved |
| 15 | **Low** | Frontend | `source` field ("batch"/"on_demand") rendered as a citation label | ✓ Resolved |
