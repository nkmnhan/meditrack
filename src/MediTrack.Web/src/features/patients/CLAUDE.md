# Patients Feature — Frontend Context

## Overview
Patient management UI: list with search/filters, detail page with timeline, create/edit form, natural language search.

## Components
| Component | Purpose |
|-----------|---------|
| `PatientList` | Searchable/filterable patient table with status badges |
| `PatientDetail` | Full patient profile — demographics, contact, medical info, insurance |
| `PatientForm` | Create/edit form with address, emergency contact, insurance sub-forms |
| `PatientTimeline` | Chronological view of patient events (appointments, records) |
| `NaturalLanguageSearch` | AI-powered search ("patients with diabetes diagnosed last month") |

## Store (`patientApi.ts`)
RTK Query endpoints:
- `getPatients` (with search/filter/pagination)
- `getPatientById`
- `createPatient` / `updatePatient`
- `deactivatePatient` / `activatePatient`

## Types (`types.ts`)
- `Patient`, `PatientListItem` — main types
- `Address`, `EmergencyContact`, `Insurance` — value object types
- `CreatePatientRequest`, `UpdatePatientRequest` — mutation DTOs
- `PatientSearchParams` — query params

## Routes
- `/patients` → list page
- `/patients/:id` → detail page
- `/patients/new` → create form
- `/patients/:id/edit` → edit form
