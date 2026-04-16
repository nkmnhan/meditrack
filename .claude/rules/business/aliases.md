---
paths:
  - "**/*"
---

<!-- maintainer: paths: ["**/*"] — loads every session.
     Shorthand alias table. When user says a short term, go directly to its path.
     This file is @imported by root CLAUDE.md — editing here updates both places. -->

# Shorthand Aliases

When the user says these terms, go directly to the right location:

| Term | Means | Path |
|------|-------|------|
| **nexus** | Aspire.Nexus orchestrator | `src/Aspire.Nexus/` |
| **design** | Lovable design system (git submodule) | `design/` |
| **clara** | Clara AI clinical companion | `src/Clara.API/` |
| **web** | React frontend | `src/MediTrack.Web/` |
| **identity** | Duende IdentityServer | `src/Identity.API/` |
| **patient** | Patient management | `src/Patient.API/` |
| **appointment** | Appointment scheduling | `src/Appointment.API/` |
| **records** | Medical records (DDD) | `src/MedicalRecords.Domain/` + `.Infrastructure/` + `.API/` |
| **defaults** | Shared service infrastructure | `src/MediTrack.ServiceDefaults/` |
| **eventbus** | RabbitMQ event bus | `src/EventBus/` + `src/EventBusRabbitMQ/` |
| **outbox** | Integration event log | `src/IntegrationEventLogEF/` |
| **notification** | Background worker | `src/Notification.Worker/` |
| **simulator** | Test data seeder | `src/MediTrack.Simulator/` |
| **theme** | Theme system (switcher, derivation, config) | See Theme File Map in CLAUDE.md |
| **theme config** | Centralized color palette definitions | `design/src/shared/config/color-themes.ts` |
| **theme engine** | Derivation: 5 hex → 100+ CSS vars | `src/MediTrack.Web/src/shared/utils/themeDerivation.ts` |
| **theme switcher** | UI: palette picker popover | `design/src/components/ThemeSwitcher.tsx` |
| **theme hook** | Runtime: `<style>` injection + localStorage | `design/src/hooks/use-color-theme.ts` |
| **tokens** | CSS variables (:root / .dark) | `src/MediTrack.Web/src/index.css` + `design/src/index.css` |
