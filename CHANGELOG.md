# Changelog

All notable changes to MediTrack are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## [Unreleased]

### Added
- SOLID theme switcher system with centralized config (2026-03-19)
  - `color-themes.ts` — single source of truth. New tenant theme = add one object
  - `themeDerivation.ts` — engine: 5 hex → 25+ CSS variables (pre-computed, cached)
  - `use-color-theme.ts` — runtime `<style>` injection, localStorage persistence
  - `ThemeSwitcher.tsx` — popover panel (sidebar on desktop, bottom nav on mobile)
  - 10 curated themes: 5 dark (Northern Lights, Luminous Flow, Dreamscapes, Emerald Forest, Velvet Night) + 5 light (Mimi Pink, Baby Blue Summer, Health Summit, French Riviera, Ethereal Escapes)
  - Light/dark mode per palette (mutually exclusive selection)
- Theme workflow section in CLAUDE.md with shorthand aliases and file map (2026-03-19)
- `scout` and `frontend-theme-design` personal skills in `~/.claude/skills/` (2026-03-19)

### Changed
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

### Changed
- Theme derivation engine refactored: pre-computed ParsedColor, WCAG luminance for isDark(), muted-foreground AA clamp (2026-03-19)
- Removed dead `applyTheme()` from themeDerivation.ts — superseded by use-color-theme hook (2026-03-19)
- AdminUsersPage: row background tint → `border-l-2 border-l-warning-400` indicator (works in all themes) (2026-03-19)
- Login page: removed decorative circles and 3D card wrapper (ugly in dark themes) (2026-03-20)
- AppShell: hardcoded `dark:bg-[hsl()]` → semantic tokens (2026-03-19)

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

### Added
- Clara.UnitTests: 106 unit tests covering validators, domain, services, and security (2026-03-17)
  - Validators: StartSessionRequest, KnowledgeSearchRequest
  - Domain: PatientContext.ToPromptSection
  - Services: SuggestionService (BuildPrompt, ParseLlmResponse), KnowledgeSeederService (ChunkText, ExtractCategory), SkillLoaderService, DeepgramService, PatientContextService, BatchTriggerService
  - Security: SessionHub input validation, ConfigValidator
  - Shared: MockHttpMessageHandler test infrastructure

### Security
- SessionHub: session ownership validation on all methods — OWASP A01:2025 IDOR prevention (2026-03-17)
- PHI removed from all log statements — HIPAA compliance (2026-03-17)
- Prompt injection defense: XML delimiters for user content in LLM prompts (2026-03-17)
- LLM response sanitization: HTML stripping, content truncation, type/urgency whitelisting (2026-03-17)
- SignalR input validation: speaker whitelist, text length limit, audio size limit (2026-03-17)
- Startup config validation: reject placeholder API keys in production (2026-03-17)
- All OWASP references updated to Top 10:2025 (2026-03-17)

### Added
- Competitive analysis & improvement specs — feature gaps, Clara enhancements, UI/UX roadmap (2026-03-15)
- TDD infrastructure — Clara.UnitTests + MedicalRecords.UnitTests projects, NSubstitute + Testcontainers packages (2026-03-15)
- Superpowers plugin integration — workflow section in CLAUDE.md, output directories, .gitignore entries (2026-03-15)
- Claude Code configuration restructure — split 854-line CLAUDE.md into modular rules + domain glossaries (2026-03-14)
- `.claude/rules/` with path-specific rules: backend, frontend, security, dependencies, mcp-ai
- Per-service CLAUDE.md domain glossaries: Appointment, Patient, MedicalRecords, Clara, Identity
- Per-feature frontend CLAUDE.md: appointments, patients, medical-records, clara
- `.claude/settings.json` with team permissions (allow/deny)
- REVIEW.md for code review standards

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
