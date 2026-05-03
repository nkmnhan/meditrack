# Changelog

All notable changes to MediTrack are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## [Unreleased]

### Changed
- Migrate IdentityServer from in-memory to PostgreSQL (EF Core) persistence (2026-05-01)
  - Replaced `AddInMemoryIdentityResources`, `AddInMemoryApiScopes`, `AddInMemoryClients` with `AddConfigurationStore` + `AddOperationalStore` backed by PostgreSQL
  - Added `Duende.IdentityServer.EntityFramework 7.4.6` package to `Identity.API` and `Simulator`
  - Added EF migrations for `ConfigurationDbContext` (clients/scopes/resources) and `PersistedGrantDbContext` (tokens/grants) in `Identity.API`
  - Upgraded EF Core and ASP.NET Core Identity packages to 10.0.0 to match .NET 10 + Duende IS EF requirements
  - Added design-time factories `ConfigurationDbContextFactory` + `PersistedGrantDbContextFactory`
  - Deleted `Identity.API/Data/UsersSeed.cs` — Simulator is the single source of seeding
- `IdentitySeeder` now upsert-style for all data (2026-05-01)
  - Users: update `FirstName`/`LastName`/`EmailConfirmed` + sync roles on re-run instead of skip
  - IdentityServer clients, API scopes, and identity resources: seeded from `IdentityServerConfig` into `ConfigurationDbContext` using insert-if-not-exists

### Security
- Remove patient FullName/email from log statements — PHI/HIPAA compliance (2026-04-30)
  - `PatientService.cs`: removed `patient.FullName` from 4 `LogInformation` calls (Create, Update, Deactivate, Activate)
  - `UsersSeed.cs`: removed `email` from user creation log call
- Fix access token lifetime to 1 hour per BR-S004 (was 8 hours) (2026-04-30)
  - `IdentityServerConfig.cs`: `AccessTokenLifetime` changed from 28800 to 3600
- Block Patient role from enumerating provider schedules (OWASP A01 IDOR) (2026-04-30)
  - `AppointmentsApi.cs` `GetByProviderId`: added staff-only guard
- Block Patient role from probing provider schedule via conflicts endpoint (OWASP A01 IDOR) (2026-04-30)
  - `AppointmentsApi.cs` `CheckConflicts`: added staff-only guard
- Register `clara-api` OAuth2 scope in IdentityServer (2026-04-30)
  - Added to `GetApiScopes()` and SPA client `AllowedScopes` in `IdentityServerConfig.cs`
- Remove DevController and MVC scaffolding — IDOR attack surface eliminated (2026-04-30)
  - Removed `AddControllers()` and `MapControllers()` from `Clara.API/Program.cs`
  - `DevController.cs` content cleared (dev-only test endpoints removed)

### Fixed
- Enforce BR-A001: appointment minimum 1-hour advance booking (2026-04-30)
  - `AppointmentValidators.cs`: fixed static `GreaterThan(DateTime.UtcNow)` capture (FluentValidation gotcha); added `.Must()` delegates with 1-hour minimum to `CreateAppointmentRequestValidator`, `UpdateAppointmentRequestValidator`, and `RescheduleAppointmentRequestValidator`
  - `AppointmentValidators.cs`: removed redundant `dt > UtcNow` rule (subsumed by the 1-hour rule — was causing double validation errors for past dates)
- Enforce BR-A010: only active patients can book appointments (2026-04-30)
  - `Patient.API`: new `GET /api/patients/{id}/active` endpoint + `PatientActiveStatusResponse` DTO
  - `Patient.API` `PatientsApi.cs`: endpoint now requires `RequireAdminOrReceptionist` policy (was missing role guard — IDOR fix)
  - `Appointment.API`: `IPatientResolver.IsPatientActiveAsync` returns `bool?` (null = not found, true/false = active status); guard returns `404` for unknown patient vs `400` for inactive patient
  - `Appointment.API` `AppointmentsApi.cs`: request validation now runs before cross-service BR-A010 check (avoids wasted HTTP call on invalid requests)
- Fix event publish ordering in `AppointmentService` — `PublishAsync` moved after `CommitAsync` in all lifecycle methods (Reschedule, Confirm, CheckIn, Start, Complete, Cancel, MarkNoShow): event-bus failure must never rollback a committed DB state (2026-05-03)
- Fix event publish ordering in `PatientService` — `PublishAsync` moved after `CommitAsync` in `CreateAsync`, `UpdateAsync`, `DeactivateAsync` (2026-05-03)
- Fix `JsonSerializerOptions` allocation per call in `PatientResolver` — extracted to `static readonly` field (2026-05-03)
- Rename `PatientCheckedInIntegrationEvent` → `AppointmentCheckedInIntegrationEvent` for naming consistency with siblings (2026-05-03)
- Fix `GET /api/patients/{id}/active` missing role guard — added `RequireAdminOrReceptionist` (IDOR remediation) (2026-05-03)
- Remove hardcoded `Password=postgres` from `IdentityServerDbContextFactory` — replaced with `IDENTITY_DB_URL` env var (dev-only fallback retained) (2026-05-03)
- Fix duplicate `### Documentation` heading in CHANGELOG `[Unreleased]` block (2026-05-03)
- Fix broken Clara.API ASCII box in `observability.md` — Clara.API now shown as 5th peer service column (2026-05-03)
- Document `MediTrack.Simulator` hard-dependency for bare Identity.API deployments in `Identity.API/CLAUDE.md` (2026-05-03)
- Fix test method naming in `Appointment.UnitTests` to follow `MethodName_Scenario_ExpectedResult` convention; add `PatientActiveStatusTests` covering null/false/true resolver responses (2026-05-03)

### Features
- Add missing appointment lifecycle integration events (2026-04-30)
  - `MediTrack.Shared`: 4 new event types — `PatientCheckedInIntegrationEvent`, `AppointmentStartedIntegrationEvent`, `AppointmentCompletedIntegrationEvent`, `AppointmentNoShowIntegrationEvent`
  - `AppointmentService`: CheckIn, Start, Complete, MarkNoShow now publish events inside transactions
- New test project: `Appointment.UnitTests` (2026-04-30)
  - 5 validator tests covering BR-A001 (1-hour advance booking) and the static DateTime capture fix

### Documentation
- Fix `business-logic.md` doc errors (2026-04-30)
  - Removed duplicate BR-M007/M008 table rows
  - Removed malformed duplicate BR-S006/S007/S008 block
  - Removed duplicate approval section at bottom of file
  - Fixed lockout note: "5 min" → "15-minute lockout" (matches actual code)
  - Updated BR-S004 refresh token lifetime: "14 days" → "30-day absolute / 15-day sliding"
  - Updated implementation notes for access token and refresh token lifetimes
- Fix `emr-compliance-status.md` dead link to non-existent roadmap file (2026-04-30)
- Add Clara.API (port 5005) to `observability.md` architecture diagram (2026-04-30)
- Claude settings standards sync (2026-04-17) — Anthropic official compliance
  - HTML maintainer comments added to all 15 `.claude/rules/**/*.md` files (zero token cost)
  - `InstructionsLoaded` hook: logs per-file which instruction files load, when, and why
    (`.claude/hooks/instructions-loaded.mjs` + registered in `.claude/settings.json`)
  - `meta-settings-guide.md` updated with `@import` syntax, HTML comments, 200-line limit,
    and `InstructionsLoaded` hook documentation
  - `.claude/logs/` added to `.gitignore` for hook log output
- Documentation gap fill (2026-04-16) — feat/theme-consistency
  - **15 new CLAUDE.md files** covering all previously undocumented services and features:
    - Backend: `EventBus`, `EventBusRabbitMQ`, `IntegrationEventLogEF`, `MediTrack.ServiceDefaults`, `MediTrack.Shared`, `MediTrack.Simulator`, `MedicalRecords.API`, `MedicalRecords.Infrastructure`, `Notification.Worker`
    - Frontend: `features/admin`, `features/dashboard`, `features/landing`
    - Tests: `Clara.UnitTests`, `MedicalRecords.UnitTests`, `Clara.IntegrationTests`
  - **HIPAA compliance checklist** — replaced 7 stale SQL Server/TDE references with PostgreSQL equivalents; added stack note at top
  - **TDE configuration doc** — strengthened OBSOLETE banner with explicit PostgreSQL migration table and historical section separator
  - **Improvement roadmap** — updated last-modified date + added phase status note (Phase 6b in progress)
  - **PatientResolver.cs** — removed stale TODO comment (`by-user` endpoint was implemented in Phase 5)

### Security
- HTTPS production-parity — OWASP A04/A02 compliant inter-container TLS (2026-04-12) — feat/clara-agentic-ai
  - **No plain HTTP ports** — removed `http://+:8080` from `ASPNETCORE_URLS` on all 5 .NET API services; `EXPOSE 8080` removed from all affected Dockerfiles
  - **HTTPS IdentityUrl everywhere** — `IdentityUrl=https://identity-api:8443` in both `docker-compose.yml` (production base) and `docker-compose.override.yml` (dev); `http://identity-api:8080` is gone
  - **HTTPS PatientApiUrl** — hardcoded `http://patient-api:8080` fallback replaced with `https://patient-api:8443` in `Appointment.API` and `MedicalRecords.API`; `PatientApiUrl` added as explicit env var in both compose files
  - **Proper CA chain validation** — `dev-certs/setup-certs.cmd` regenerates mkcert cert with all container hostnames as SANs (`identity-api`, `patient-api`, `appointment-api`, `medicalrecords-api`, `clara-api`); exports `rootCA.pem` to `dev-certs/certs/`
  - **Shared entrypoint script** — `scripts/docker-entrypoint.sh` installs mkcert CA into container system trust store at startup via `update-ca-certificates`; strict no-op in production (file never mounted)
  - **`RequireHttpsMetadata = true`** — enforced in `AuthenticationExtensions.cs` (all 4 downstream services) and `Identity.API/Program.cs`; `DangerousAcceptAnyServerCertificateValidator` bypass never used

### Fixed
- Claude hook path resolution (2026-04-12)
  - `.claude/settings.json` hook commands now resolve through `CLAUDE_PROJECT_DIR` instead of relative `.claude/hooks/...` paths, fixing `PostToolUse:Bash hook error` / `node:internal/modules/cjs/loader:1458` when Claude fires hooks outside the repo root cwd.
- Clara code review + live session improvements (2026-04-11) — feat/clara-agentic-ai
  - **Chat persistence on refresh** — `useSession` now seeds state from REST data (`initialTranscriptLines`/`initialSuggestions`) immediately on mount; `SessionUpdated` merges rather than replaces to handle reconnect deduplication; `LiveSessionView` passes `sessionData` to the hook. Transcript and suggestions now survive full page refresh.
  - **Agent memory no-op fixed** — `IAgentMemoryService` was registered in DI but never injected into `ClaraDoctorAgent`; wired `RecallSimilarMemoriesAsync` (before prompt build) and `StoreMemoryAsync` (after verified suggestions). Both calls are non-fatal (try-catch).
  - **Duplicate validation removed** — `SessionHub.SendTranscriptLine` had an exact copy of the ownership check block (lines 163–176 = lines 143–162), causing a redundant DB query on every transcript message.
  - **`BroadcastAgentEvent` deduplicated** — identical switch expression in `BatchTriggerService` and `SessionApi` extracted to `SignalREvents.GetAgentEventName()`.
  - **HNSW recall tuned** — `SET hnsw.ef_search = 100` added before cosine distance queries in `KnowledgeService` and `AgentMemoryService` (default 40 gives poor recall on clinical data).
  - **PHI audit gap fixed** — `JsonException` catch in `PatientContextService` now publishes a failed audit event (HIPAA compliance).
  - **`MemoryTypes` constants** — `MemoryTypes.Episodic`/`MemoryTypes.Semantic` replace free-form strings in `AgentMemory` usage.
  - **Test quality** — `ClaraDoctorAgentTests` replaced `PassThroughCriticService` hand-written stub with `Substitute.For<ISuggestionCriticService>()` (InternalsVisibleTo already set); added `IAgentMemoryService` mock; 2 new `BuildAgentPrompt` memory tests.

### Added
- GitHub Copilot hooks, MCP, and tooling (2026-04-08)
  - `.github/hooks/post-edit-lint.json` — Copilot coding agent PostToolUse hook: ESLint on `.ts/.tsx` files after every edit (equivalent to Claude's `post-edit-lint.mjs`, different format)
  - `.vscode/mcp.json` — VS Code MCP server config translated from `.mcp.json` (`servers` key, `inputs` secret prompt for postgres DSN)
  - `.vscode/settings.json` — VS Code: Copilot agent mode, MCP enabled, ESLint/Prettier on save, Tailwind `clsxMerge` class regex, search exclusions
  - `.vscode/extensions.json` — Recommended extensions: Copilot, C# Dev Kit, ESLint, Prettier, Tailwind, GitLens, Docker, Playwright
  - `.github/workflows/lint.yml` — CI lint gate on all PRs: ESLint (frontend) + dotnet build (backend)
- GitHub Copilot configuration (2026-04-08) — full parity with Claude Code setup
  - `.github/copilot-instructions.md` — repository-wide instructions (engineering principles, naming, service map, tech stack, commands)
  - `.github/instructions/backend.instructions.md` — Clean Architecture, MediatR, NuGet CPM, EF Core rules (scoped to `**/*.cs`)
  - `.github/instructions/frontend.instructions.md` — React 19, RTK Query, semantic tokens, React Compiler rules (scoped to Web + Design)
  - `.github/instructions/security.instructions.md` — OWASP Top 10:2025, PHI audit, secrets rules (broad scope)
  - `.github/instructions/ai-mcp.instructions.md` — Clara MCP architecture, cost routing, ReAct loop (scoped to `src/Clara.API/`)
  - `.github/instructions/dependencies.instructions.md` — license policy, NuGet CPM, npm audit rules
  - `.github/instructions/web-design-sync.instructions.md` — dual-update mandate for shared components (Web ↔ Design)
  - `.github/agents/tech-lead.agent.md` — Staff Tech Lead agent (Claude Opus)
  - `.github/agents/senior-developer.agent.md` — Senior Dev agent with TDD protocol (Claude Sonnet)
  - `.github/agents/code-reviewer.agent.md` — Principal reviewer with structured output format (Claude Sonnet)
  - `.github/agents/system-architect.agent.md` — Distributed systems architect (Claude Opus, max effort)
  - `.github/agents/devils-advocate.agent.md` — Contrarian critic for stress-testing designs (Claude Opus, max effort)
  - `.github/workflows/copilot-setup-steps.yml` — Copilot coding agent environment (.NET 10, Node 22, NuGet + npm restore)
  - `AGENTS.md` — portable root-level agent manifest (Copilot, Cursor, Codex, Jules compatible)
- Cross-session agent memory (2026-04-03) — P3.3
  - `AgentMemory` domain entity — episodic/semantic observations with pgvector embedding for cosine similarity search
  - `IAgentMemoryService` / `AgentMemoryService` — store, recall-by-patient (recency), recall-by-similarity (HNSW cosine)
  - Embedding failure is non-fatal — memories are stored without a vector and fall back to recency recall
  - Access metadata (`LastAccessedAt`, `AccessCount`) updated on every recall as an importance signal
  - `ClaraDbContext.AgentMemories` DbSet + `agent_memories` table with HNSW index (`vector_cosine_ops`, m=16, ef_construction=64)
  - `ClaraDbContext` made provider-aware — pgvector/jsonb columns ignored for InMemory provider (unit test compatibility)
  - 10 unit tests in `AgentMemoryServiceTests.cs` (CRUD, filter by agent/patient, limit, access metadata, embedding failure, fallback)
  - Registered as `IAgentMemoryService` → `AddScoped` in `Program.cs`
- Reflection/Critique loop for suggestion hallucination detection (2026-04-03) — P2.4
  - `SuggestionCriticService` — second LLM call verifies each suggestion against the transcript
  - `ISuggestionCriticService` (internal) — interface in `Interfaces.cs`, keyed to `"batch"` chat client (GPT-4o-mini)
  - `Prompts/critic.txt` — critic prompt: rules for supported/unsupported/revised judgments
  - `SuggestionService.GenerateSuggestionsAsync` — integrates critic after `ParseLlmResponse`, before DB save
  - Unsupported suggestions removed; supported with improved phrasing are revised in-place
  - Graceful degradation: any critic failure returns original suggestions unchanged (never blocks generation)
  - 4 unit tests in `SuggestionCriticServiceTests.cs` (all-supported, removed, revised, LLM-failure paths)
- ReAct agent loop for Clara suggestion generation (2026-04-03) — P1.3
  - `AgentTools.cs` — two AI-callable tools: `search_knowledge` (CorrectiveRAG) and `get_patient_context`
  - `SuggestionService.GenerateSuggestionsAsync` replaced hardcoded pipeline with `FunctionInvokingChatClient` ReAct loop
  - LLM now decides which tools to call based on conversation content (no longer always-RAG + always-patient-context)
  - `BuildAgentPrompt` replaces old 4-param `BuildPrompt` — instructs LLM on available tools, inlines clinical skill
  - `IKnowledgeService` removed from `SuggestionService` constructor (now accessed via `AgentTools` → `CorrectiveRagService`)
  - Token budget increased to 500 (was 300) to accommodate tool-call round-trips
  - 8 new unit tests in `AgentToolsTests.cs` (tool output format, empty results, tool registration)
  - 8 updated tests in `SuggestionServiceBuildPromptTests.cs` for new `BuildAgentPrompt` contract
- PHI audit trail for Clara AI context access (2026-04-03) — HIPAA P2.5
  - `PatientContextService` now injects `IPHIAuditService` and publishes an audit event on every patient context access
  - Success path: logs accessed fields (`age,gender,allergies,medications,conditions,recentVisit`) with `action: AIContextAccess`
  - Failure paths (HTTP error, `HttpRequestException`): logs `success: false` with the error detail
  - Null/empty `patientId` (early-return guard): no audit event published
  - Audit call is best-effort — wrapped in try/catch so failures never interrupt clinical workflows
  - `PHIAuditService` and `RabbitMQ EventBus` registered in `Clara.API/Program.cs`
  - 3 new unit tests in `PHIAuditTests.cs` covering success, HTTP failure, and null patientId paths
- Clara agentic AI improvements — research-driven enhancements (2026-04-02)
  - P0: Urgent keyword bypass in BatchTriggerService (chest pain, seizure, etc. → immediate suggestions)
  - P0: Disconnect cleanup — batch trigger timers cleaned up when SignalR disconnects
  - P0: Config-driven thresholds — `BatchTriggerOptions` via `IOptions<>` (utterance count, timeout, keywords)
  - P1: Tiered model routing — keyed `IChatClient` (batch → GPT-4o-mini, on-demand → GPT-4o)
  - P1: Evidence linking — `SourceTranscriptLineIds` on suggestions traces claims to source transcript
  - P1: Streaming agent event types (`AgentEvent` hierarchy: Thinking, ToolStarted, ToolCompleted, TextChunk)
  - P2: Service interfaces — `ISuggestionService`, `IKnowledgeService`, `IPatientContextService`, `IBatchTriggerService`, `ISessionService`
  - P2: Rich domain model — `Session.Complete()`, `Pause()`, `Resume()`, `Cancel()` with state machine validation
  - P2: Domain enums — `SessionStatusEnum`, `SuggestionTypeEnum`, `SuggestionUrgencyEnum`, `SuggestionSourceEnum`
  - P2: Suggestion tracking — `AcceptedAt`/`DismissedAt` fields + `AcceptSuggestion`/`DismissSuggestion` hub methods
  - P2: Enhanced system prompt — grounding rules, confidence calibration, reasoning field, hallucination prevention
  - `SessionStatus` moved from `SessionService.cs` to `Domain/Constants.cs` (domain concept)
  - New SignalR events: `AgentThinking`, `AgentToolStarted`, `AgentToolCompleted`, `AgentTextChunk`, `SuggestionAccepted`, `SuggestionDismissed`
- Clara agentic AI research & plan — `docs/clara-agentic-ai-plan.md` (2026-04-02)
  - Competitive analysis: Canvas Hyperscribe, Nuance DAX, Abridge, Suki, Nabla, Amazon HealthScribe
  - Architecture patterns: ReAct, Plan-and-Execute, Reflection/Critique, Multi-Agent, Corrective RAG
  - Multi-agent extensibility design for future patient companion agent
- Perceptual color scale system — 100+ CSS variables per theme (2026-03-21)
  - `deriveColorScale()` generates brand scales (50-950) and semantic scales (50-900) from palette
  - `harmonizeHue()` shifts success/warning/error/info toward primary hue for visual cohesion
  - Curated semantic overrides per theme (aurora green for Northern Lights, terracotta for Emerald Forest, etc.)
  - All scales use CSS variables — `bg-success-50 text-success-700` works in any mode without `dark:` overrides
  - `badgeStyles.ts` centralized badge variant classes (web)
- `ThemeSwitcherPopover` — Radix Popover variant for Landing + Login pages (2026-03-21)
- Global thin scrollbar — 4px, `--border` color, auto-adapts to theme (2026-03-21)
- Theme palette button on Landing page navbar + Login page (2026-03-21)
- SOLID theme switcher system with centralized config (2026-03-19)
  - `color-themes.ts` — single source of truth. New tenant theme = add one object
  - `themeDerivation.ts` — engine: 5 hex → 100+ CSS variables (perceptual scales, cached)
  - `use-color-theme.ts` — runtime `<style>` injection, localStorage persistence
  - `ThemeSwitcher.tsx` — popover panel (sidebar on desktop, bottom nav on mobile)
  - 10 curated themes: 5 dark (Northern Lights, Luminous Flow, Dreamscapes, Emerald Forest, Velvet Night) + 5 light (Mimi Pink, Baby Blue Summer, Health Summit, French Riviera, Ethereal Escapes)
  - Light/dark mode per palette (mutually exclusive selection)
- Theme workflow section in CLAUDE.md with shorthand aliases and file map (2026-03-19)
- `scout` and `frontend-theme-design` personal skills in `~/.claude/skills/` (2026-03-19)
- Clara.UnitTests: 106 unit tests covering validators, domain, services, and security (2026-03-17)
  - Validators: StartSessionRequest, KnowledgeSearchRequest
  - Domain: PatientContext.ToPromptSection
  - Services: SuggestionService (BuildPrompt, ParseLlmResponse), KnowledgeSeederService (ChunkText, ExtractCategory), SkillLoaderService, DeepgramService, PatientContextService, BatchTriggerService
  - Security: SessionHub input validation, ConfigValidator
  - Shared: MockHttpMessageHandler test infrastructure

- Competitive analysis & improvement specs — feature gaps, Clara enhancements, UI/UX roadmap (2026-03-15)
- TDD infrastructure — Clara.UnitTests + MedicalRecords.UnitTests projects, NSubstitute + Testcontainers packages (2026-03-15)
- Superpowers plugin integration — workflow section in CLAUDE.md, output directories, .gitignore entries (2026-03-15)
- Claude Code configuration restructure — split 854-line CLAUDE.md into modular rules + domain glossaries (2026-03-14)
- `.claude/rules/` with path-specific rules: backend, frontend, security, dependencies, mcp-ai
- Per-service CLAUDE.md domain glossaries: Appointment, Patient, MedicalRecords, Clara, Identity
- Per-feature frontend CLAUDE.md: appointments, patients, medical-records, clara
- `.claude/settings.json` with team permissions (allow/deny)
- REVIEW.md for code review standards

### Changed
- All color scales in `tailwind.config.ts` now use `hsl(var(--xxx))` via `cssScale()` helper — no hardcoded hex (2026-03-21)
- Removed 287 `dark:` color scale overrides across 21 files — perceptual mapping handles light/dark automatically (2026-03-21)
- `ThemeSwitcher.tsx` refactored: extracted `ThemeSwitcherContent` + `PaletteRow` + `MODES` constant, flattened DOM (~40 fewer elements) (2026-03-21)
- Removed healing `dark:` CSS hacks from both `index.css` files — now CSS variable-backed (2026-03-21)
- DOM flattening: removed wrapper divs in NotificationCenter, ClaraPanel, Layout, PageExplorer (2026-03-21)
- Login page: removed decorative circles and 3D card wrapper (ugly in dark themes) (2026-03-20)
- Theme derivation engine refactored: pre-computed ParsedColor, WCAG luminance for isDark(), muted-foreground AA clamp (2026-03-19)
- Removed dead `applyTheme()` from themeDerivation.ts — superseded by use-color-theme hook (2026-03-19)
- AdminUsersPage: row background tint → `border-l-2 border-l-warning-400` indicator (works in all themes) (2026-03-19)
- AppShell: hardcoded `dark:bg-[hsl()]` → semantic tokens (2026-03-19)
- Semantic token migration: all 90+ component files migrated from hardcoded colors to semantic tokens (2026-03-17)
  - `bg-white` → `bg-card`, `text-neutral-*` → `text-foreground`/`text-muted-foreground`, `border-neutral-*` → `border-border`
  - ~4,600 class replacements across web + design system (dual-update rule enforced)
  - Deleted ~80 lines of `.dark` CSS override hacks — themes now work purely via CSS variables
  - Dark mode works on ALL pages: landing, clara, admin, appointments, patients, medical records
- Theme derivation engine: `themeDerivation.ts` — 5 brand colors → 25+ CSS variables automatically (2026-03-17)
  - Coolors.co URL parser, auto-role assignment by luminance/saturation
  - Runtime theme injection via `applyTheme()`
- Updated `.claude/rules/frontend.md` — semantic tokens mandatory, hardcoded neutrals banned (2026-03-17)
- Developer + AI theming guide: `docs/theming-guide.md` — new palette = 30 min, zero component changes (2026-03-17)

### Fixed
- 15 theming review issues fixed (3 critical, 7 important, 5 low) (2026-03-19)
  - C-1: healing palette added to Web tailwind.config.ts
  - C-2: all banned text-neutral-* replaced with semantic tokens
  - C-3: bg-white/20 → bg-accent-foreground/20 in ClaraPanel
  - I-1–I-7: --radius in deriveTheme, WCAG clamp, OnboardingTour reactive overlay, themeDerivation sync, typing-dot + 12 animation keyframes synced to Web, FeatureGuidePanel opacity sync
  - L-1–L-5: WCAG luminance, parseCoolorsUrl error, SSR guard, hardcoded rgba removed
- ClaraPanel input: added bg-input text-foreground (invisible text on custom themes) (2026-03-19)
- Theme switcher: fix skip guard bug preventing palette switching (2026-03-19)
- Dark mode contrast: calendar event cards, Clara chat bubbles, admin badges now use `dark:` variant pairs (2026-03-18)
  - Appointment events: `bg-primary-100` → `dark:bg-primary-900/30 dark:text-primary-200` (8 status styles)
  - Landing decorative circles: reduced opacity to 7% in dark mode (no more bright blobs)
  - Clara panel: user/assistant message bubbles have dark-appropriate tinted backgrounds
  - Admin pages: audit badges, user role badges, system status indicators all dark-mode-aware
  - 19 files across web + design (dual-update enforced)

### Security
- SessionHub: session ownership validation on all methods — OWASP A01:2025 IDOR prevention (2026-03-17)
- PHI removed from all log statements — HIPAA compliance (2026-03-17)
- Prompt injection defense: XML delimiters for user content in LLM prompts (2026-03-17)
- LLM response sanitization: HTML stripping, content truncation, type/urgency whitelisting (2026-03-17)
- SignalR input validation: speaker whitelist, text length limit, audio size limit (2026-03-17)
- Startup config validation: reject placeholder API keys in production (2026-03-17)
- All OWASP references updated to Top 10:2025 (2026-03-17)

## [0.6.0] — 2026-03-01 — UI Migration Complete

### Added
- Phase 3 (Layout): sidebar, mobile Sheet drawer, NavLink, Clara FAB/Panel, FeatureGuide, CommandPalette
- Phase 4 (Pages): all 11 pages built with 59+ UI enhancement items
- Phase 5 (Admin): 8 admin pages (expanded from 4)
- Phase 6 (Polish): lovable refs removed, colors audited, ESLint config (0 errors)
- UX Engagement Plan: 17/17 items complete
- UI Enhancement Audit: 59/62 items (3 P3 deferred)

### Changed
- Replaced blocking welcome tour with non-blocking feature guide + mobile nav cleanup

## [0.5.0] — 2026-02-22 — Phase 1 Foundation

### Added
- Solution structure: 16 projects (MediTrack.sln)
- Backend services: Identity.API, Patient.API, Appointment.API, MedicalRecords.API, Clara.API, Notification.Worker
- Shared infrastructure: EventBus, EventBusRabbitMQ, IntegrationEventLogEF, ServiceDefaults
- Frontend: React 19 + Vite + TypeScript SPA with feature-based architecture
- Docker Compose with PostgreSQL 17, RabbitMQ 4, OpenTelemetry, Jaeger, Prometheus
- Central Package Management (Directory.Packages.props)
- Clara.API milestones 1-8 scaffolded

### Technical Decisions
- Target framework: net10.0
- Database: PostgreSQL 17 with pgvector (migrated from SQL Server)
- RabbitMQ.Client v7 (fully async API)
- React Compiler (no manual memoization)
- All .csproj hand-written (no `dotnet new`)
