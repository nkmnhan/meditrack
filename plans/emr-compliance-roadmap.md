# EMR Compliance Roadmap

> Phased plan to adopt FHIR R4, SMART on FHIR, and USCDI v3 standards in MediTrack.

---

## Tier 1 — Enables AI + MCP (Phase 6–7)

These items are prerequisites for the FHIR MCP Server and Emergen AI.

| Item | Description | Status |
|------|-------------|--------|
| **FHIR R4 API facade** | Expose MediTrack domain APIs as FHIR R4 endpoints (Patient, Observation, Condition, MedicationRequest, AllergyIntolerance). Thin facade over existing services — no domain model changes. | Planned |
| **FHIR provider pattern** | `IFhirProvider` interface with auth strategy per EMR. Initial implementation: MediTrack internal (direct API calls). | Planned |
| **SMART on FHIR auth flow** | OAuth2 authorization for external EMR integration. Layer 2 of two-layer security model. | Planned |
| **USCDI v3 patient demographics** | Map existing Patient model to USCDI v3 required fields (name, DOB, sex, race, ethnicity, address, phone, email, preferred language). | Planned |
| **Standard terminologies** | Add SNOMED CT, LOINC, RxNorm code fields to relevant domain models. Start with Condition (SNOMED CT) and Observation (LOINC). | Planned |
| **PostgreSQL + pgvector** | Migrate from SQL Server. Required for knowledge base embeddings. See [replace-mssql-with-postgres.md](replace-mssql-with-postgres.md). | Planned |

---

## Tier 2 — EMR Features (Phase 8)

Standard EMR capabilities beyond AI. Build after core MCP infrastructure is working.

| Item | Description | Status |
|------|-------------|--------|
| **Patient portal** | Patient-facing views for records, appointments, medications, lab results. | Planned |
| **Clinical Decision Support (CDS)** | Drug interaction checking via NLM RxNav API (free). Alert doctors to contraindications. | Planned |
| **Break-the-glass** | Emergency access override for PHI with mandatory audit logging and justification. | Planned |
| **External EMR OAuth2** | Epic JWT Bearer Grant (RS384), Cerner Client Credentials Flow. Enables multi-EMR data access. | Planned |
| **Medical research tools** | PubMed (free), ClinicalTrials.gov (free), openFDA (free) integration via Knowledge MCP Server. | Planned |
| **ICD-10 coding** | Add ICD-10 codes to diagnoses for billing and reporting. | Planned |
| **RxNorm medication coding** | Standardize medication data using RxNorm codes. | Planned |

---

## Tier 3 — Future (Phase 9+)

Advanced EMR capabilities. Scope to be refined based on real usage.

| Item | Description | Status |
|------|-------------|--------|
| **CPOE** | Computerized Provider Order Entry for medications, labs, imaging. | Future |
| **E-prescribing** | Electronic prescription transmission (NCPDP SCRIPT standard). | Future |
| **Lab integration** | HL7v2 / FHIR interfaces for laboratory information systems. | Future |
| **Multi-tenant EMR** | Simultaneous Epic + Cerner connections per clinic. Multiple `IFhirProvider` instances. | Future |
| **Bulk FHIR** | FHIR Bulk Data Access (export) for analytics and reporting. | Future |
| **CDS Hooks** | HL7 CDS Hooks standard for clinical decision support integration. | Future |
| **US Core profiles** | Full US Core FHIR Implementation Guide conformance. | Future |

---

## Dependencies

```
Tier 1 (AI + MCP enablers)
  ├── PostgreSQL migration (prerequisite for pgvector)
  ├── FHIR R4 facade (prerequisite for FHIR MCP Server)
  └── FHIR provider pattern (prerequisite for multi-EMR)

Tier 2 (EMR features)
  ├── Tier 1 complete
  ├── External EMR OAuth2 depends on SMART on FHIR auth
  └── CDS depends on RxNorm coding

Tier 3 (future)
  └── Tier 2 complete
```

---

## Free APIs and Tools

All external APIs used in this roadmap are free:

| API | Purpose | Cost |
|-----|---------|------|
| NLM RxNav | Drug interaction checking | Free |
| PubMed E-utilities | Medical literature search | Free |
| ClinicalTrials.gov | Clinical trial search | Free |
| openFDA | Drug/device adverse events | Free |
| NLM UMLS | Terminology mapping (SNOMED, LOINC, RxNorm) | Free (requires license key) |
