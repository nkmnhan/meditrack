# Medical Records Feature — Frontend Context

## Overview
Patient medical records viewer: list with search/filters, detail page with clinical notes, prescriptions, vitals, attachments.

## Components
| Component | Purpose |
|-----------|---------|
| `MedicalRecordList` | Searchable list with severity/status badges |
| `MedicalRecordDetail` | Full record view with tabs for notes, prescriptions, vitals, attachments |
| `MedicalRecordDetailPage` | Page wrapper with breadcrumb navigation |
| `PatientMedicalRecordsPage` | All records for a specific patient |
| `MedicalRecordBadges` | Severity and status badge components |

## Hooks
| Hook | Purpose |
|------|---------|
| `useMedicalRecordsSearch` | Search/filter state management |

## Store (`medicalRecordsApi.ts`)
RTK Query endpoints:
- `getMedicalRecords` (with search/filter)
- `getMedicalRecordById`
- `createMedicalRecord`
- `updateDiagnosis` / `addClinicalNote` / `addPrescription` / `recordVitalSigns` / `addAttachment`
- `resolveRecord` / `archiveRecord`
- `getRecordStats`

## Types (`types/index.ts`)
- Enums: `DiagnosisSeverity`, `RecordStatus`, `PrescriptionStatus`, `ClinicalNoteType`
- Response types for all child entities (ClinicalNote, Prescription, VitalSigns, Attachment)
- Request DTOs matching backend commands

## Routes
- `/medical-records` → list page
- `/medical-records/:id` → detail page
- `/patients/:patientId/medical-records` → patient-specific records
