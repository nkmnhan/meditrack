# Clinical AI Safety Research — Production Patterns & Guardrails

> Research compiled April 2026 for Clara MVP safety architecture decisions.
> Sources: Abridge, Canvas Hyperscribe, FDB MedProof, MIT Media Lab, npj Digital Medicine, FDA 2026 CDS Guidance.

---

## 1. Hallucination Prevention in Production Clinical AI

### 1.1 Abridge: Confabulation Elimination Pipeline

Abridge (market leader per KLAS Research, 150+ health systems, 1M+ weekly encounters) published their full approach in "The Science of Confabulation Elimination" whitepaper.

**Three-stage pipeline (runs before clinician sees the draft):**

```
Stage 1: DETECTION & ASSESSMENT
  In-house task-specific LM (not off-the-shelf GPT)
  Trained on 50,000+ examples (open-source + domain-specific transcripts/EHR/notes)
  Validated by 1,000+ hours of board-certified physician annotation
  Produces detailed reasoning for each claim assessment

Stage 2: CLASSIFICATION (dual-axis)
  Support axis → 5 categories:
    - Directly Supported: precisely matches transcript
    - Reasonable Inference: logically inferable, other interpretations highly unlikely
    - Questionable Inference: plausible but other interpretations also plausible
    - Unmentioned: not substantiated by transcript at all
    - Contradiction: directly conflicts with transcript statements
  Severity axis → 3 tiers:
    - Major: substantial harm likely (most clinicians would agree)
    - Moderate: non-trivial but low risk, unlikely substantial harm
    - Minimal: little to no impact on clinical care

Stage 3: CORRECTION (3 resolution pathways)
  1. Claim Revision: reformulate to align with clinical context
  2. Deletion: remove entirely when no support exists
  3. False Alarm Override: detection reasoning indicates claim is actually supported
```

**Performance:** Catches 97% of confabulations vs. GPT-4o at 82% (6x fewer misses). Evaluated on internal benchmark of 10,000+ realistic clinical encounters with controlled unsupported claim variants.

**Linked Evidence feature:** Every span in the generated note maps back to substantiating evidence in the source transcript (and underlying audio). Clinicians highlight any portion of a note and see the exact conversation segment that supports it. This is a first-of-its-kind attribution system for clinical AI.

**Key architectural insight:** Abridge builds its own purpose-built LLMs for both ASR and note generation rather than relying on third-party models. Their ASR achieves 12.7% WER vs. 16.6% (Google Medical) and 97% Medical Term Recall. On new medications, 83% relative error reduction vs. competitors.

### 1.2 Self-Reflective RAG (Academic Research)

A 2025 study tested 12 RAG variants on 250 de-identified patient vignettes for clinical decision support:

| RAG Variant | Hallucination Rate | Notes |
|---|---|---|
| Self-Reflective RAG | **5.8%** | Lowest — uses citation + critique loops |
| Standard Dense RAG | ~12-15% | Baseline retrieval |
| No RAG (direct LLM) | ~20-25% | Worst performance |

**Self-Reflective RAG architecture:**
1. Retrieve relevant documents
2. Generate response with explicit citations
3. Self-critique: model evaluates whether each claim is supported by retrieved docs
4. Post-generation fact-checking via external tools (e.g., SciFact)
5. Revise unsupported claims

**Constraint:** Both retrieval and generation must complete within 2 seconds for clinical workflow integration.

### 1.3 Grounded Generation Principles

Production systems converge on these patterns:

1. **Generate only from retrieved context** — never rely on parametric (training) knowledge for clinical facts
2. **Span-level attribution** — every factual claim traces to a specific source document span
3. **Temporal validation** — ensure retrieved data reflects current clinical state (not stale records)
4. **Low temperature** — 0.1-0.3 for clinical output to reduce creative variation
5. **Structured output** — JSON schema enforcement prevents free-form hallucination drift

### 1.4 MIT Media Lab: Medical Hallucination Benchmark (2025)

Tested 11 foundation models (7 general-purpose + 4 medical-specialized) across 200 clinical scenarios:

**Surprising finding:** General-purpose models significantly outperformed medical-specialized models:
- General-purpose median: 76.6% hallucination-free
- Medical-specialized median: 51.3% hallucination-free

**Best mitigation techniques:**
- Chain-of-thought prompting reduced hallucinations in 86.4% of comparisons
- Gemini-2.5 Pro + CoT achieved >97% accuracy (baseline: 87.6%)
- 64-72% of residual hallucinations stemmed from **reasoning failures**, not knowledge gaps

**Clinician survey (n=70, 15 specialties):** 91.8% had encountered medical hallucinations; 84.7% considered them capable of causing patient harm.

---

## 2. Clinical Guardrails — Preventing Dangerous Suggestions

### 2.1 FDB MedProof MCP Server (First Databank)

FDB (the dominant clinical drug knowledge provider, embedded in Epic/Cerner/MEDITECH/athenahealth) launched MedProof MCP in March 2026 — the first MCP server specifically for medication safety in AI workflows.

**Architecture:**
```
AI Agent (e.g., Clara)
  ↓ MCP tool call
FDB MedProof MCP Server
  ↓ queries
FDB MedKnowledge Database
  - Drug-drug interaction checking
  - Drug-allergy interaction checking
  - Dosage range verification
  - Duplicate therapy detection
  - Formulary management
  - RxNorm + NDC + AHFS + DailyMed mapped
  ↓ returns structured safety alerts
AI Agent incorporates alerts into suggestion
```

**Key insight for Clara:** Drug interaction checks should NEVER rely on LLM knowledge. They must query authoritative databases (FDB MedKnowledge, DailyMed, RxNorm) via structured API calls. The LLM's role is to orchestrate these checks and present results — not to independently assess drug safety.

**Integration pattern:** FDB Cloud Connector API (AWS-hosted) or on-premises MedKnowledge database. MCP protocol means any AI agent can connect without vendor lock-in.

### 2.2 Canvas Hyperscribe: Policy-Based Guardrails

Open-source (GitHub: canvas-medical/canvas-hyperscribe) implementation patterns:

**Pipeline architecture:**
```
Audio Capture (configurable chunk intervals, default 20s)
  ↓
Transcription (VendorAudioLLM: OpenAI or Google)
  ↓ CycleTranscriptOverlap (100 words context window)
Command Detection (VendorTextLLM: OpenAI, Google, or Anthropic)
  ↓ HierarchicalDetectionThreshold
Review & Execution (clinician validates before insertion)
```

**Policy-based guardrails:**
- `CommandsList + CommandsPolicy`: Allowlist/blocklist of permitted clinical commands
- `StaffersList + StaffersPolicy`: Role-based access restrictions
- `TrialStaffersList`: Beta access limited to test patients matching `Hyperscribe* ZZTest*`
- `HierarchicalDetectionThreshold`: Switches detection strategy based on command count
- `AuditLLMDecisions`: Step-by-step rationale logging to S3 (partials -> llm_turns -> finals)

**Multi-model vendor abstraction:**
- Separate credentials for audio vs. text LLMs (KeyAudioLLM, KeyTextLLM)
- Audio: OpenAI Whisper or Google
- Text: OpenAI, Google, or Anthropic
- Configurable per deployment — no vendor lock-in

### 2.3 Red-Flag Symptom Detection

Production systems use layered approaches beyond keyword matching:

1. **Semantic matching** — embed known emergency symptoms, cosine similarity against transcript chunks
2. **Structured extraction** — force LLM to output structured JSON with symptom severity fields
3. **Rule engine post-processing** — deterministic rules on extracted data (e.g., "chest pain" + "shortness of breath" + "radiating to arm" = immediate escalation)
4. **Clinical scoring integration** — compute validated scores (SOFA for sepsis, HEART for chest pain, Wells for PE) from extracted vitals/symptoms, escalate when thresholds exceeded

---

## 3. Human-in-the-Loop Patterns

### 3.1 Suggestion Acceptance Workflows

Production clinical AI systems converge on this pattern:

```
AI generates suggestion
  ↓
Suggestion displayed with:
  - Confidence score (visual indicator)
  - Source attribution (linked evidence)
  - Urgency/risk classification
  ↓
Clinician action (REQUIRED before any EHR write):
  [Accept] — logs acceptance + timestamp + user
  [Edit] — clinician modifies, logs diff + reason
  [Reject] — logs rejection + reason code
  ↓
Accepted/edited content written to EHR
Feedback signal used for model improvement
```

**Canvas Hyperscribe implements this** via the `reviewer_button.py` handler: clinicians validate LLM-generated commands before insertion into the EMR. No AI output reaches the patient record without explicit clinician action.

### 3.2 Confidence-Based Escalation (Traffic Light Model)

```
GREEN (high confidence, low risk):
  → Auto-display suggestion, standard review
  → Light sampling for quality monitoring

AMBER (medium confidence OR uncertain):
  → Display with visual warning indicator
  → Require explicit clinician confirmation
  → Log for quality review queue

RED (low confidence OR high clinical risk):
  → Block automatic suggestion
  → Route to human review queue with SLA
  → Require dual-clinician sign-off for critical decisions
```

**Calibration warning:** Research shows LLM self-reported confidence scores are poorly calibrated — GPT-4o's gap between confidence for correct vs. incorrect answers was only 5.4%. Production systems should NOT rely on raw LLM confidence. Instead:
- Use ensemble agreement (multiple model outputs compared)
- Use retrieval confidence (RAG similarity scores)
- Use structured extraction confidence (did the model fill all required fields?)

### 3.3 Edit-Before-Save Pattern

Abridge's approach (used across 150+ health systems):

1. AI generates complete clinical note draft
2. Draft displayed in editor with **Linked Evidence** — every sentence traceable to transcript
3. Clinician reviews, edits, adds clinical judgment
4. Edits tracked as feedback signal (edit frequency, patterns, locations)
5. Only after clinician approval does the note enter the EHR
6. Star ratings (1-5) collected post-save for quality monitoring

**Key metric:** Edit rate serves as a scalable proxy for note quality. High edit rates on specific note sections trigger model retraining focus.

### 3.4 Agree/Override Pattern with Disconfirming Cues

Clinical-specific HITL pattern:
- AI presents diagnosis/recommendation
- Alongside the suggestion, display **disconfirming cues**: "What would make this wrong?"
- Clinician must actively choose Agree or Override
- Override requires a reason code (structured) + optional free text
- This combats **automation bias** — the tendency for clinicians to accept AI suggestions uncritically

### 3.5 Audit Trail Requirements

Every AI-generated clinical content interaction must log:
- Who (authenticated user ID)
- What (AI suggestion content, type, confidence)
- When (timestamp)
- Action taken (accept/edit/reject)
- Edit diff (if modified)
- Source context (transcript segment, RAG chunks used)
- Model version and parameters

HIPAA Security Rule 164.312(b) requires operation-level audit logs — session-level logs are insufficient. Absent audit records are themselves a HIPAA violation.

---

## 4. Evaluation and Testing Frameworks

### 4.1 Abridge's Production Evaluation Pipeline

**Pre-deployment quality gates (all must pass):**

| Gate | Method | Threshold |
|---|---|---|
| Automated metrics | WER, Medical Term Recall, precision/recall on benchmark | Must exceed current production model |
| Clinician spot-check | Curated encounters across clinical scenarios | Sign-off required |
| Blinded head-to-head trial | Licensed clinicians compare current vs. candidate (blind) | Statistical superiority via sequential hypothesis testing |
| Staged rollout | Alpha (trained early adopters) → Beta (wider) → GA | Improved outcomes confirmed at each stage |

**Ongoing production monitoring:**
- Edit-based metrics (corrections required per note)
- Star ratings (1-5 from clinicians)
- Stratified performance across demographics/languages/specialties
- Challenge dataset regression (new medications, accented speech)
- Qualitative feedback analysis

**Key numbers:** 10,000+ hours of internal clinical conversations with gold-standard transcripts for benchmarking. Curated "challenge datasets" targeting known weaknesses.

### 4.2 npj Digital Medicine: Clinical Safety Assessment Framework (2025)

Published framework evaluated 12,999 clinician-annotated sentences from LLM-generated clinical notes:

| Metric | Rate |
|---|---|
| Hallucination rate | 1.47% |
| Omission rate | 3.45% |

**Methodology:**
- Clinicians annotate every sentence in AI-generated notes
- Each sentence classified: correct, hallucinated, or omitted information
- Severity scoring on clinical impact scale
- Reproducibility measured via inter-annotator agreement

### 4.3 MIT Medical Hallucination Benchmark

Open-source evaluation framework (github.com/mitmedialab/medical_hallucination):

**Three benchmark tasks:**
1. FCT (Factual Consistency Testing) — questions with definitive correct answers
2. Fake (Hallucination Detection) — correct answer is "I do not know"
3. NOTA (None of the Above) — recognizing when no options are correct

**Five mitigation methods tested:** Base, System Prompting, Chain-of-Thought, MedRAG, Internet Search

**Evaluation metrics:** Accuracy, pointwise scoring, UMLS-BERT embedding similarity

**Infrastructure:** Reproducible with configurable seeds, intermediate result saving, MedRAG integration with medical textbook corpus (~5GB).

### 4.4 Adversarial Testing

A 2025 Nature Communications Medicine study tested 6 leading LLMs with 300 doctor-designed clinical vignettes containing planted errors:
- Models repeated or elaborated on planted errors in **up to 83% of cases**
- Simple mitigation prompts halved the rate but did not eliminate the risk
- Implication: clinical AI must be tested against adversarial/misleading inputs, not just correct ones

---

## 5. Regulatory Considerations

### 5.1 FDA 2026 CDS Guidance (January 6, 2026)

The FDA's revised CDS guidance supersedes the 2022 version. Key points for Clara:

**Four-criterion exemption test** (all must be met to avoid medical device classification):
1. Does NOT process medical images or diagnostic device signals
2. Displays, analyzes, or prints medical information
3. Supports HCP recommendations for prevention, diagnosis, or treatment
4. Enables HCPs to **independently review the basis** of the recommendation

**Clara's position:** Clara is designed as a clinical decision SUPPORT tool — suggestions are presented to doctors who review and act on them independently. This aligns with exemption criteria IF:
- Recommendations cite sources (clinical guidelines, peer-reviewed literature)
- The UI enables clinicians to review the recommendation basis
- Clara does not replace physician judgment (no autonomous actions)

**Transparency emphasis:** Recommendations must be grounded in "well-understood and accepted sources." Information should "prioritize decision-relevant details and avoid information overload."

**Gap:** The 2026 guidance is notably silent on generative AI specifically — no dedicated guidance on LLM chatbots, AI-generated referrals, or adaptive algorithms. Future updates expected FY26-27.

### 5.2 HIPAA Implications

**AI-generated clinical notes:**
- Storage, transmission, retrieval must be fully encrypted
- Access limited to authorized users
- Every AI action (create, edit, read) must be audit-logged
- Administrators must be able to track who accessed records and when

**Audit trail specifics (Security Rule 164.312(b)):**
- Operation-level logs required (not just session-level)
- Must capture: user auth, timestamp, IP, application activities
- Which agent accessed which PHI, what it did, who authorized the workflow
- Absent audit records are themselves a HIPAA violation

**2025 Security Rule update (proposed):**
- Removes distinction between "required" and "addressable" safeguards
- Stricter expectations for risk management, encryption, resilience
- AI systems processing PHI subject to enhanced standards

### 5.3 SaMD (Software as Medical Device) Classification

**Critical distinction:**
- AI that **informs** clinician judgment → lower regulatory burden (CDS exemption possible)
- AI that **replaces** clinician judgment → medical device classification → FDA 510(k) or De Novo

**Clara's design principle:** Always position as decision SUPPORT. Never autonomous. All suggestions require clinician action. This keeps Clara on the CDS-exempt side of the regulatory line.

---

## 6. Architectural Recommendations for Clara

Based on this research, here are concrete patterns to consider:

### 6.1 Suggestion Generation Pipeline

```
Transcript + Patient Context + RAG Results
  ↓
LLM Generation (low temperature: 0.3, structured JSON output)
  ↓
Claim Extraction (structured: each claim as separate object)
  ↓
Grounding Check (each claim verified against source transcript/RAG chunks)
  ↓
Confidence Scoring (RAG similarity score + claim support level)
  ↓
Safety Checks:
  - Drug interactions → FDB MedKnowledge / RxNorm / DailyMed API (NOT LLM)
  - Red-flag symptoms → semantic match + deterministic rules
  - Dosage ranges → authoritative database lookup
  ↓
Suggestion with:
  - Content (the suggestion text)
  - Confidence (computed, not LLM self-reported)
  - Source attributions (transcript spans + RAG document references)
  - Safety alerts (from database checks)
  - Urgency classification
  ↓
Clinician Review (Accept / Edit / Reject)
  ↓
Audit Log (full trail: suggestion + action + user + timestamp + edit diff)
```

### 6.2 MVP vs. Future Safety Layers

| Safety Layer | MVP (Phase 6) | Phase 7+ |
|---|---|---|
| Grounded generation | RAG with similarity threshold (0.7) | Self-reflective RAG with citation loops |
| Source attribution | RAG chunk references in suggestion metadata | Linked Evidence (span-level transcript mapping) |
| Confidence scoring | RAG similarity score as proxy | Ensemble agreement + structured extraction completeness |
| Drug safety | Keyword flagging + disclaimer | FDB MedKnowledge / RxNorm API integration |
| Red-flag detection | Urgent keyword bypass (existing) | Semantic matching + clinical scoring (HEART, SOFA) |
| Clinician review | Accept/Reject buttons on suggestion cards | Full edit-before-save with diff tracking |
| Audit trail | PHI audit logging (existing) | Operation-level HIPAA-compliant audit with AI action tracking |
| Evaluation | Manual testing + unit tests | Clinician-annotated benchmark + blinded A/B testing |
| Adversarial testing | None | Planted-error clinical vignettes |

### 6.3 Key Principles (From Production Systems)

1. **Never trust LLM confidence scores** — use external signals (RAG scores, database lookups, extraction completeness)
2. **Drug safety = database lookups, not LLM reasoning** — FDB, RxNorm, DailyMed are the authority
3. **Every claim must trace to a source** — if it can't be attributed, flag or remove it
4. **Clinician always in the loop** — no AI output reaches the patient record without explicit human action
5. **Audit everything** — HIPAA requires it, and the feedback loop improves the model
6. **Test adversarially** — models will elaborate on planted errors 83% of the time if not guarded against
7. **Edit rate = quality signal** — track how much clinicians modify AI output as a continuous quality metric
8. **Staged rollout** — alpha (power users) → beta (wider) → GA, with quality gates at each stage

---

## Sources

### Hallucination Prevention
- [Abridge: The Science of Confabulation Elimination](https://www.abridge.com/ai/science-confabulation-hallucination-elimination)
- [Abridge: Pioneering the Science of AI Evaluation](https://www.abridge.com/ai/science-ai-evaluation)
- [The Engineering Behind Healthcare LLMs with Abridge | Out-Of-Pocket](https://www.outofpocket.health/p/the-engineering-behind-healthcare-llms-with-abridge)
- [MIT Media Lab: Medical Hallucination Benchmark](https://github.com/mitmedialab/medical_hallucination)
- [Self-Reflective RAG for Clinical Decision Support (MDPI Electronics)](https://www.mdpi.com/2079-9292/14/21/4227)
- [npj Digital Medicine: Clinical Safety Assessment Framework](https://www.nature.com/articles/s41746-025-01670-7)
- [Multi-model Adversarial Hallucination Attacks (Nature Comms Medicine)](https://www.nature.com/articles/s43856-025-01021-3)

### Clinical Guardrails
- [Canvas Hyperscribe (GitHub)](https://github.com/canvas-medical/canvas-hyperscribe)
- [Canvas Medical: Announcing Hyperscribe](https://www.canvasmedical.com/articles/announcing-hyperscribe)
- [FDB MedProof MCP Server Announcement](https://www.prnewswire.com/news-releases/fdb-announces-first-mcp-server-for-ai-clinical-decision-support-and-other-medication-workflow-automation-302585349.html)
- [FDB MedProof MCP Launch (Yahoo Finance)](https://finance.yahoo.com/sectors/healthcare/articles/fdb-launches-medproof-mcp-pioneering-140000819.html)
- [FDB Clinical Decision Support Solutions](https://www.fdbhealth.info/)

### Human-in-the-Loop
- [iatroX: From Human-in-the-Loop to Human-at-the-Helm](https://www.iatrox.com/blog/human-at-the-helm-preventing-automation-bias-clinical-ai)
- [Abridge: Building Trusted AI in Healthcare](https://www.abridge.com/blog/building-trusted-healthcare-ai)
- [Confidence Calibration for Clinical AI (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12428550/)
- [LLM Confidence Benchmarking in Clinical Questions (JMIR)](https://medinform.jmir.org/2025/1/e66917)
- [Human-AI Collectives for Clinical Diagnosis (PNAS)](https://www.pnas.org/doi/10.1073/pnas.2426153122)

### Regulatory
- [FDA 2026 CDS Guidance: 5 Key Takeaways (Covington)](https://www.cov.com/en/news-and-insights/insights/2026/01/5-key-takeaways-from-fdas-revised-clinical-decision-support-cds-software-guidance)
- [FDA Cuts Red Tape on CDS Software (Arnold & Porter)](https://www.arnoldporter.com/en/perspectives/advisories/2026/01/fda-cuts-red-tape-on-clinical-decision-support-software)
- [HIPAA AI Audit Trail Requirements](https://www.onhealthcare.tech/p/ai-and-llm-data-provenance-and-audit)
- [HIPAA Compliance AI 2025 (Sprypt)](https://www.sprypt.com/blog/hipaa-compliance-ai-in-2025-critical-security-requirements)
- [FDA AI Regulation of Clinical Software (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12264609/)
