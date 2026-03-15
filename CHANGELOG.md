# Changelog

All notable changes to MediTrack are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## [Unreleased]

### Added
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
