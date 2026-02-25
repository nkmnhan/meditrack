# EMR Compliance Roadmap

> Phased plan to adopt FHIR R4, SMART on FHIR, and USCDI v3 standards in MediTrack.

---

## Tier 1 — Enables AI + MCP (Phase 6)

Minimal prerequisites for Emergen AI MVP.

| Item | Description | Status |
|------|-------------|--------|
| **FHIR tools in MCP server** | `fhir_read`, `fhir_search`, `fhir_create`, `fhir_update` tools call domain APIs via HTTP, return FHIR R4 JSON. No separate facade service. | Planned |
| **FHIR provider pattern** | `IFhirProvider` interface with MediTrack internal implementation only (direct API calls with existing JWT). | Planned |
| **USCDI v3 patient demographics** | Map existing Patient model to USCDI v3 required fields (name, DOB, sex, race, ethnicity, address, phone, email, preferred language). | Planned |
| **Standard terminologies** | Add SNOMED CT, LOINC, RxNorm code fields to relevant domain models. Start with Condition (SNOMED CT) and Observation (LOINC). | Planned |
| **PostgreSQL + pgvector** | Migrate from SQL Server. Required for knowledge base embeddings. See [replace-mssql-with-postgres.md](replace-mssql-with-postgres.md). | Planned |

---

## Tier 2 — External EMR Integration (Phase 8)

External system integration. Build after Emergen AI MVP is working with internal data.

| Item | Description | Status |
|------|-------------|--------|
| **SMART on FHIR auth flow** | OAuth2 authorization framework for external EMR integration. Layer 2 of two-layer security model. | Planned |
| **External EMR OAuth2** | Epic JWT Bearer Grant (RS384), Cerner Client Credentials Flow. Enables multi-EMR data access. | Planned |
| **Epic provider** | `EpicFhirProvider` implementation with JWT bearer grant, token cache, RS384 signing. | Planned |
| **Cerner provider** | `CernerFhirProvider` implementation with OAuth2 client credentials flow. | Planned |
| **Patient portal** | Patient-facing views for records, appointments, medications, lab results. | Planned |
| **Clinical Decision Support (CDS)** | Drug interaction checking via NLM RxNav API (free). Alert doctors to contraindications. | Planned |
| **Break-the-glass** | Emergency access override for PHI with mandatory audit logging and justification. | Planned |
| **Medical research tools** | PubMed (free), ClinicalTrials.gov (free), openFDA (free) integration via EmergenAI.API knowledge tools. | Planned |
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
  ├── FHIR tools in EmergenAI.API (prerequisite for clinical AI)
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
