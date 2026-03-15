# UX Engagement Plan — Reduce Bounce, Increase Exploration

**Date**: 2026-03-11
**Status**: ✅ Complete (17/17 items implemented)
**Baseline Metrics** (30-day, from Lovable Analytics):
- 72 visitors, 165 pageviews, 2.29 views/visit
- 21s avg visit duration, 84% bounce rate
- Top pages: `/` (62), `/clara/session/new` (10), `/dashboard` (4), all others (3 each)
- 70.8% desktop, 29.2% mobile

**Goals**:
- Bounce rate: 84% → <60%
- Avg duration: 21s → 60s+
- Views/visit: 2.29 → 4+

---

## Phase A — Kill the Bounce (Landing Page)

### ✅ A1. Hero Rewrite
- Replaced generic headline with specific value prop: "Clara listens to your consults and writes the notes"
- Subline targeting persona, concrete stats
- **Implemented in**: Main app (`HeroSection.tsx`) + Design (`Landing.tsx`)

### ✅ A2. Interactive Clara Mini-Chat on Landing
- Scripted 3-4 exchange demo with pre-written prompts
- Purely client-side, no auth, no API calls
- **Implemented in**: Main app only (`ClaraMiniDemo.tsx`) — design has its own Landing page

### ✅ A3. Guest Demo Mode
- `/demo/*` routes with seeded data, no login required
- Persistent dismissible banner, sessionStorage persistence
- **Implemented in**: Main app only (`DemoContext.tsx`, `DemoBanner.tsx`, 3 demo routes)

### ✅ A4. Sticky Bottom CTA
- Mobile: sticky bottom bar → scrolls to Clara mini-chat
- Desktop: floating pill CTA, appears after scroll, dismissible via sessionStorage
- **Implemented in**: Main app only (`StickyLandingCta.tsx`)

### ✅ A5. Mobile Bottom Navigation Bar
- 4-tab bottom bar: Dashboard, Patients, Clara, More
- Active tab indicator, only shown on interior pages
- **Implemented in**: Main app (`Layout.tsx`) + Design (`AppShell.tsx`)

---

## Phase B — Make Interior Pages Sticky

### ✅ B1. Command Palette (Cmd+K / Ctrl+K)
- Global keyboard shortcut opens search modal (shadcn CommandDialog)
- Pages group + Quick Actions group, keyboard navigation
- **Implemented in**: Main app (`CommandPalette.tsx`) + Design (`CommandPalette.tsx`)

### ✅ B2. Notification Center
- Bell icon with Popover dropdown, 6 categorized demo notifications
- Read/unread state, "Mark all as read" button
- **Implemented in**: Main app (`NotificationCenter.tsx`) + Design (`NotificationCenter.tsx`)

### ✅ B3. Patient Timeline View
- Vertical timeline on PatientDetail page (Details/Timeline tabs)
- 10 demo events: encounters, labs, medications, notes, Clara sessions
- Expandable details, distinct colors/icons per event type
- **Implemented in**: Main app (`PatientTimeline.tsx`) + Design (`PatientTimeline.tsx`)

### ✅ B4. Page Transitions
- CSS fade + 8px slide animation (300ms ease-out) on route changes
- `animate-page-in` class on content wrappers, respects `prefers-reduced-motion`
- **Implemented in**: Main app (`index.css`, `Layout.tsx`) + Design (`index.css`, `AppShell.tsx`)

### ✅ B5. Clara Floating Sidebar on Patient Charts
- ClaraPanel with context-aware insights, collapsible
- Desktop: open by default, Mobile: FAB trigger
- **Implemented in**: Main app (`ClaraPanel.tsx`) + Design (`ClaraPanel.tsx`, `ClaraFab.tsx`)

---

## Phase C — AI Wow Factor

### ✅ C1. Voice-to-SOAP Note
- Mic button on Clara session pages, Web Speech API / MediaRecorder
- Speech → structured SOAP format
- **Implemented in**: Main app (`useAudioRecording.ts`) + Design (`ClaraSession.tsx`)

### ✅ C2. AI-Powered Natural Language Search
- Enhanced search: "show diabetic patients over 60"
- Client-side NLP parsing (regex keyword extraction + filter mapping)
- Parsed filters shown as removable tags
- **Implemented in**: Main app (`NaturalLanguageSearch.tsx`) + Design (`NaturalLanguageSearch.tsx`)

### ✅ C3. Customizable Dashboard Widgets
- Dashboard cards draggable/reorderable via HTML5 DnD
- Toggle widget visibility via Switch controls
- Persist layout in localStorage
- **Implemented in**: Main app (`DashboardCustomizer.tsx`, `useDashboardLayout.ts`) + Design (same)

---

## Phase D — Developer & Admin Polish

### ✅ D1. FHIR Resource Viewer
- Admin page: `/admin/fhir-viewer`
- 6 resource types, raw JSON + collapsible tree view, copy bundle
- **Implemented in**: Main app (`AdminFhirViewerPage.tsx`) + Design (`AdminFhirViewer.tsx`)

### ✅ D2. Integration Status Dashboard
- Admin page: `/admin/integrations`
- 4 EHR cards: MediTrack Internal (connected), Epic/Cerner/Generic (not configured)
- Status badges with color indicators, last sync timestamps, record counts
- **Implemented in**: Main app (`AdminIntegrationsPage.tsx`) + Design (`AdminIntegrations.tsx`)

### ✅ D3. Provider Performance Dashboard
- Analytics: provider leaderboard with sessions, drafts, save rate
- **Implemented in**: Main app (`AdminReportsPage.tsx`) + Design (`AdminReports.tsx`)

### ✅ D4. Data Import Wizard
- 4-step flow: Upload → Map Fields → Preview → Confirm
- Drag-and-drop file upload, field mapping, simulated progress
- **Implemented in**: Main app (`AdminImportWizardPage.tsx`) + Design (`AdminImportWizard.tsx`)

---

## Summary

| Phase | Items | Done |
|-------|-------|------|
| A — Landing | 5 | 5 |
| B — Interior | 5 | 5 |
| C — AI | 3 | 3 |
| D — Admin | 4 | 4 |
| **Total** | **17** | **17** |
