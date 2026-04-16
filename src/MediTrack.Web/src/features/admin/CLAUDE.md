# Admin Feature — Multi-Page Admin Dashboard

## Overview
Role-gated admin area (`RequireAdmin` policy). Covers user management, PHI audit trail, analytics, FHIR viewer, CSV import wizard, reports, integrations config, and system settings.

## Pages
| Component | Route | Data Source |
|-----------|-------|-------------|
| `AdminDashboardPage.tsx` | `/admin` | Patient.API analytics + Clara.API audit |
| `AdminUsersPage.tsx` | `/admin/users` | Identity.API user management |
| `AdminAuditPage.tsx` | `/admin/audit` | Clara.API `/api/clara/audit` |
| `AdminReportsPage.tsx` | `/admin/reports` | Patient.API analytics, static chart data |
| `AdminFhirViewerPage.tsx` | `/admin/fhir` | Patient.API FHIR-shaped endpoints |
| `AdminImportWizardPage.tsx` | `/admin/import` | ⏳ Stub — no backend import endpoint yet |
| `AdminIntegrationsPage.tsx` | `/admin/integrations` | ⏳ Stub — UI only, no backend |
| `AdminSystemPage.tsx` | `/admin/system` | ⏳ Stub — UI only, no backend |

## Supporting Components
- `AutoRefreshIndicator.tsx` — polling status badge (shared within admin)
- `charts/` — Recharts wrappers for analytics charts

## API Slices
Use existing RTK Query slices from `src/shared/api/`. Do not create new slices for admin-only calls without checking the shared API layer first.
