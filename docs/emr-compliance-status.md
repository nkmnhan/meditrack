# EMR Compliance Status — ONC / USCDI v3 Scorecard

> Tracks MediTrack's current conformance with ONC Health IT Certification and USCDI v3 data classes.

**Last updated**: 2026-02-25

**Note**: This is a **reference document**, not a roadmap deliverable with acceptance criteria. For an educational project at 3,000 users, full USCDI v3 compliance is scope creep. Use this scorecard to guide prioritization (Tier 1 items only), not as a checklist for completion.

---

## USCDI v3 Data Classes

| Data Class | Data Element | MediTrack Status | Gap |
|------------|-------------|-----------------|-----|
| **Patient Demographics** | Name | Done | — |
| | Date of Birth | Done | — |
| | Sex | Done | — |
| | Race | Not started | Add to Patient model |
| | Ethnicity | Not started | Add to Patient model |
| | Preferred Language | Not started | Add to Patient model |
| | Address | Done | — |
| | Phone | Done | — |
| | Email | Done | — |
| **Allergies & Intolerances** | Substance (Medication) | Not started | MedicalRecords domain |
| | Substance (Non-Medication) | Not started | MedicalRecords domain |
| | Reaction | Not started | MedicalRecords domain |
| **Medications** | Medications | Partial | Exists in MedicalRecords, no RxNorm coding |
| | Medication Allergies | Not started | MedicalRecords domain |
| **Problems** | Date of Diagnosis | Partial | Exists, no SNOMED CT coding |
| | Date of Resolution | Not started | Add to Condition model |
| | SNOMED CT Code | Not started | Add terminology field |
| **Procedures** | Procedure | Not started | MedicalRecords domain |
| | Date | Not started | MedicalRecords domain |
| | SNOMED CT Code | Not started | Terminology support |
| **Health Concerns** | Health Concern | Not started | New resource type |
| **Assessment & Plan** | Assessment | Partial | Exists as clinical notes |
| | Plan of Treatment | Not started | Structured care plans |
| **Goals** | Patient Goals | Not started | New resource type |
| **Immunizations** | Immunization | Not started | New resource type |
| **Clinical Notes** | Consultation Note | Not started | Planned via Session MCP |
| | History & Physical | Not started | Planned via clinical skills |
| | Progress Note | Partial | Exists as encounter notes |
| | Discharge Summary | Not started | Planned via clinical skills |
| **Vital Signs** | Blood Pressure | Not started | LOINC-coded Observations |
| | Heart Rate | Not started | LOINC-coded Observations |
| | Body Temperature | Not started | LOINC-coded Observations |
| | BMI | Not started | LOINC-coded Observations |
| | Weight | Not started | LOINC-coded Observations |
| | Height | Not started | LOINC-coded Observations |
| **Laboratory** | Lab Tests | Not started | LOINC-coded Observations |
| | Lab Values/Results | Not started | LOINC-coded Observations |
| **Provenance** | Author | Partial | Audit log captures user |
| | Timestamp | Done | Audit log timestamps |

---

## FHIR R4 Resource Coverage

| FHIR Resource | MediTrack Mapping | Status |
|---------------|-------------------|--------|
| Patient | Patient.API domain model | Partial — needs USCDI v3 fields |
| Encounter | Appointment.API | Partial — appointment only, not full encounter |
| Condition | MedicalRecords diagnoses | Partial — no SNOMED CT |
| MedicationRequest | MedicalRecords prescriptions | Partial — no RxNorm |
| AllergyIntolerance | — | Not started |
| Observation (vitals) | — | Not started |
| Observation (labs) | — | Not started |
| Procedure | — | Not started |
| Immunization | — | Not started |
| DocumentReference | — | Planned via Session MCP |
| DiagnosticReport | — | Not started |

---

## Interoperability Standards

| Standard | Status | Notes |
|----------|--------|-------|
| FHIR R4 | Not started | Tier 1 — FHIR API facade planned |
| SMART on FHIR | Not started | Tier 1 — OAuth2 for EMR auth |
| US Core IG | Not started | Tier 3 — full profile conformance |
| USCDI v3 | Partial | Patient demographics partially covered |
| SNOMED CT | Not started | Tier 1 — Conditions |
| LOINC | Not started | Tier 1 — Observations |
| RxNorm | Not started | Tier 1 — Medications |
| ICD-10 | Not started | Tier 2 — Diagnoses coding |
| HL7 CDS Hooks | Not started | Tier 3 |
| NCPDP SCRIPT | Not started | Tier 3 — e-prescribing |

---

## Summary

| Category | Total Items | Done | Partial | Not Started |
|----------|------------|------|---------|-------------|
| USCDI v3 Data Elements | 30 | 5 | 5 | 20 |
| FHIR R4 Resources | 11 | 0 | 3 | 8 |
| Interop Standards | 10 | 0 | 1 | 9 |

**Next milestone**: Tier 1 items from [EMR Compliance Roadmap](../plans/emr-compliance-roadmap.md) — FHIR R4 facade, standard terminologies, PostgreSQL migration.
