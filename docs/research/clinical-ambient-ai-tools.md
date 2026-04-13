# Clinical Ambient AI Documentation Tools -- Technical Research

Research date: 2026-04-02

---

## 1. Canvas Hyperscribe (Canvas Medical)

### Architecture

Hyperscribe is an **open-source** Canvas EMR plugin (Python, Apache 2.0 license) that processes patient-provider audio conversations and generates both clinical documentation and EHR commands. It is built on the Canvas server-side SDK, which provides real-time event streams and fine-grained control over clinical workflows.

**GitHub:** https://github.com/canvas-medical/canvas-hyperscribe

### Code Structure (from the repo)

```
hyperscribe/
  commands/        -- Command generation logic (translate LLM output to Canvas commands)
  handlers/        -- UI: capture_button.py (recording), reviewer_button.py (LLM decision review)
  libraries/       -- Utilities, implemented_commands.py (policy-filtered command list)
  llms/            -- Multi-vendor LLM integration (OpenAI, Google, Anthropic)
  structures/      -- Data models for commands, transcripts, decisions
  templates/       -- Prompt templates (hierarchical vs flat detection flows)
```

### Audio-to-Note Pipeline

1. **Audio Capture**: Recording launched via a button in the note header. Audio is chunked at configurable intervals (default: 20 seconds).
2. **Transcription**: Audio sent to a vendor ASR via `VendorAudioLLM` / `KeyAudioLLM` secrets (supports OpenAI Whisper, Google, Anthropic). Overlapping transcript context maintained (default: 100-word overlap between chunks).
3. **Instruction Detection**: Transcript segments processed through LLM prompt templates to extract clinical instructions (medications, diagnoses, orders). Uses hierarchical or flat detection flows.
4. **Command Generation**: Detected instructions mapped to Canvas EMR commands (e.g., prescribe, diagnose, order). Policy-based filtering controls which commands are allowed.
5. **Clinician Review**: Generated commands presented via a reviewer UI (`reviewer_button.py`). The clinician approves, edits, or rejects each command before it executes.

### LLM Strategy

- **Multi-vendor, swappable**: Configured via secrets -- no vendor lock-in. Separate configs for audio LLM (transcription) and text LLM (reasoning).
- **Chain-of-thought prompting with GPT-4o** for SOAP note generation (per research papers evaluating it).
- **Composable chaining**: Scribe output feeds into summarization, which feeds into care-gap detection, which triggers order agents. Multiple agents collaborate in real time.

### Safety / Accuracy

- **Human-in-the-loop by design**: Every LLM-generated command goes through clinician review before execution.
- **Configurable approval workflows**: Organizations decide where clinician sign-off is required.
- **Reproducible evals**: Canvas publishes evaluation benchmarks and datasets publicly.
- **Full patient context grounding**: LLM outputs are grounded against the complete patient record (diagnoses, medications, encounters, labs) to reduce hallucination.

### EHR Integration

Native -- Hyperscribe IS the EMR. The SDK provides direct read/write to the Canvas data model. No external integration layer needed.

---

## 2. Nuance DAX Copilot (Microsoft/Nuance) -- now "Dragon Copilot"

### Architecture

DAX Copilot is a cloud-based, fully containerized system running on Azure, processing clinical conversations through a multi-stage ML pipeline. Rebranded as "Dragon Copilot" in March 2025, unifying dictation (Dragon Medical One) with ambient documentation (DAX).

### Infrastructure Stack

| Component | Azure Service |
|-----------|--------------|
| Audio coordination | Azure Cosmos DB (multi-client sync) |
| Intermediate storage | Azure Blob Storage |
| Container registry | Azure Container Registry |
| Execution | Azure Kubernetes Service |
| Model training | Azure Machine Learning (GPU clusters) |
| LLM backbone | Azure OpenAI Service (GPT-4) |

### Audio-to-Note Pipeline

1. **Audio Capture**: Multi-party ambient recording via mobile app or desktop. High-quality capture within clinical workflow constraints.
2. **Speaker Diarization + Transcription**: Separate models per stage. Multi-speaker identification (patient, clinician, others). Trained on 1 billion+ minutes of medical dictation + 15 million ambient encounters.
3. **Dialogue Classification**: Transcript segments classified by clinical relevance.
4. **Summarization + Transformation**: GPT-4 converts classified transcript into specialty-specific structured notes. Supports 50+ specialties.
5. **EHR Delivery**: Draft note delivered directly into EHR workflow.

### LLM / Model Strategy

- **Separate models for each pipeline stage** (not one monolithic model).
- **PyTorch-based training**: 2.5x faster training cycles after migration to PyTorch. Production serving requires only 1/6th CPU time vs previous approach.
- **Multi-model verification (2026)**: Microsoft's broader Copilot strategy now uses GPT for drafting + Claude for verification ("Critique" feature). GPT drafts, Claude reviews for accuracy, completeness, and citation quality. Reported 13.8% improvement on DRACO benchmark. 67-89% hallucination reduction in enterprise deployments.

### Real-Time vs Post-Visit

DAX Copilot generates draft notes **within seconds** of encounter completion (near-real-time, not strictly streaming during the visit). The 2024-2025 updates added:
- Conversational orders (real-time during visit)
- Note and clinical evidence summaries
- Referral letters
- After-visit patient summaries
- Multilanguage ambient note creation

### Safety / Accuracy

- Clinician review required before note finalization.
- Specialty-specific formatting and guardrails.
- Healthcare-adapted safeguards baked into the generative AI layer.
- The multi-model Critique approach (GPT + Claude) is Microsoft's newest hedge against hallucinations.

### EHR Integration

- **Embedded in Epic** (GA since 2024): Fully native within Epic workflow -- no separate app. Uses Epic's ambient APIs.
- Also integrates with Oracle Cerner, MEDITECH, athenahealth, and others.
- DAX Copilot available via Nuance's PowerMic Mobile or desktop apps.

---

## 3. Abridge

### Architecture

Abridge builds a vertically integrated pipeline with proprietary ASR and a multi-stage note generation system with industry-leading hallucination detection.

### Audio-to-Note Pipeline

1. **Audio Capture**: Ambient recording in clinic or via Epic Haiku (mobile).
2. **Proprietary Medical ASR**: Custom-built, medically-tuned automatic speech recognition. Outperforms Google Medical Conversations ASR. Auto-detects specialty, language, and multiple speakers without manual configuration. Handles hospital noise robustness.
3. **Clinical NLP Extraction**: Extracts medical entities (conditions, medications, symptoms, lab values) and categorizes them into note sections.
4. **Note Generation (LLM)**: Transformer-based decoder models (GPT-family architecture) generate structured clinical notes (SOAP, H&P, etc.).
5. **Confabulation Detection**: Proprietary task-specific model scans the draft.
6. **Automated Correction**: Unsupported claims are corrected or removed.
7. **Clinician Review**: Draft presented with Linked Evidence for human verification.

### Hallucination Prevention System (the key differentiator)

Abridge published a detailed whitepaper ("The Science of Confabulation Elimination", August 2025) describing a two-component system:

**Component 1 -- Detection Model:**
- Proprietary, task-specific language model.
- Trained on 50,000+ curated examples (open-source hallucination detection datasets + domain-specific clinical examples).
- Validated by 1,000+ hours of annotation by board-certified physicians.
- For each claim in the draft note: assesses support level + generates detailed reasoning.

**Component 2 -- Classification Framework:**

Support axis (5 categories):
- **Directly Supported**: Precisely matches transcript.
- **Circumstantially Supported, Reasonable Inference**: Logically inferable; most clinicians would agree.
- **Circumstantially Supported, Questionable Inference**: Plausible but ambiguous.
- **Unmentioned**: Absent from transcript entirely.
- **Contradiction**: Conflicts with stated information.

Severity axis (3 levels):
- **Major**: Likely negative impact on clinical care.
- **Moderate**: Non-trivial but low safety risk.
- **Minimal**: No meaningful clinical impact.

**Performance**: Catches 97% of confabulations on 10,000+ clinical encounters benchmark. GPT-4o catches only 82% on the same benchmark (Abridge is ~6x better at the task).

### Linked Evidence

Every word/phrase in a generated note maps back to the source transcript or audio. Clinicians can click any part of the note to see/hear the supporting evidence. This is a core trust mechanism.

### EHR Integration

- **Abridge Inside**: Embedded directly within Epic (Haiku, Hyperspace, Hyperdrive). 2-week implementation timeline.
- Records in Haiku, generates notes viewable in Hyperdrive.
- Bidirectional: reads patient context from EHR, writes finalized notes back.

---

## 4. Suki AI

### Architecture

Suki is a voice-first clinical assistant built on Google Cloud Platform, with backends in Go and Python. It uses a dual-ASR approach and a novel vector-search-based intent classification system.

### Audio Processing Pipeline

1. **Wakeword Detection**: "Hey Suki" triggers command mode.
2. **Dual ASR**: Two separate ASR engines run concurrently:
   - **Dictation ASR**: Medically-tuned for transcription accuracy (distinguishes "hyperglycemia" vs "hypoglycemia").
   - **Command ASR**: Optimized for intent recognition.
3. **Audio Routing**: Wakeword-based routing + time segmentation determines whether audio is command or dictation.
4. **State Management**: Backend state machine transitions between dictation and command modes. Packet ordering handles ASR latency differences. In-memory caching of patient data and transcript queues.

### Intent Classification System (the technical differentiator)

**Architecture**: Retrieval-based, NOT traditional classification.
- Sentence encoder trained via contrastive learning (online semi-hard triplet loss).
- Embeddings mapped to a vector store of ground truth intents.
- k-Nearest Neighbor voting at inference time.
- Synthetic data generation via LLMs to expand training data.

**Performance**:
- 98% accuracy on real-world clinical voice data.
- Sub-300ms latency (133% faster than GPT-4).
- 90%+ accuracy with only 15 training samples for new commands (few-shot).
- Eliminates expensive LLM API calls for high-volume intent operations.

### Slot Filling

- **Flan T5 fine-tuned with LoRA** for generative slot extraction.
- **N-gram caching**: POS tagger analyzes sequences, common medical n-grams cached, model selects from cache. 62% latency reduction vs HuggingFace baseline while matching GPT-4 accuracy.

### Ambient Note Generation

- Ambient mode captures entire encounter.
- Notes contextualized with patient demographics and history.
- LLMs generate structured notes while ensuring no PHI is used for summarization (data stays within Suki).

### EHR Integration

- Dedicated integration layer abstracting EHR-specific APIs.
- Bidirectional real-time integration with Epic (Toolbox program, Suki INSIDE embedded in Haiku/Hyperspace), Oracle Cerner, athenahealth, MEDITECH Expanse.
- Pulls patient data (vitals, allergies, labs), writes finalized notes back.

---

## 5. Nabla

### Architecture

Founded by former Facebook AI Research engineers. Nabla builds proprietary STT and LLM components, with a multi-layer fact-checking pipeline.

### Audio-to-Note Pipeline

1. **Audio Capture**: Ambient recording during consultation.
2. **Medical ASR**: Based on fine-tuned Whisper with custom improvements:
   - 3 years, $5M investment in custom dataset: 7,000 hours of manually annotated medical encounter audio.
   - Hallucination suppression improvements over vanilla Whisper.
   - Enhanced medical term accuracy.
   - PII masking applied before LLM processing, unmasked after output.
3. **Note Generation**: GPT-series LLMs combined with Nabla's own customized LLMs.
4. **Atomic Fact Verification** (critical quality layer):
   - Each generated note is split into atomic facts.
   - Each fact is checked via LLM query against the transcript + patient context.
   - Only facts with definitive proof are kept.
5. **Clinician Review**: Notes presented with proactive feedback tools for flagging discrepancies.

### Performance

- Up to 95% accuracy.
- Notes generated in under 15 seconds.
- Supports 55+ specialties, 35 languages.

### Privacy

- Audio is **never stored** and never used for training.
- Transcripts/notes stored temporarily (configurable, default 14 days).
- HIPAA + GDPR compliant, SOC 2 Type 2, ISO 27001 certified.

### EHR Integration

- **Epic**: Built on Epic's Ambient APIs. Full integration in 2-3 weeks.
- **Nabla Connect** (launched October 2025): Plug-and-play module for any EHR vendor to integrate Nabla's ambient AI. Integration typically completed in days.
- Partnership with Navina: Ambient conversation data ingested into clinical intelligence engine that aligns with historical records from multiple modalities (labs, imaging, unstructured notes).

### Future Direction

Exploring "world model" technology (beyond LLMs) to address structural constraints: hallucinations, non-deterministic reasoning, limited handling of continuous multimodal data.

---

## 6. Amazon HealthScribe (AWS)

### Architecture

AWS HealthScribe is a managed, HIPAA-eligible API service within Amazon Transcribe. It provides both batch and real-time streaming endpoints for clinical documentation.

### API Architecture

**Batch (Transcription Jobs):**
- `StartMedicalScribeJob` -- processes audio files from S3.
- Outputs two JSON files: transcript + clinical documentation.

**Streaming (Real-Time):**
- `StartMedicalScribeStream` -- HTTP/2 bidirectional channel.
- Audio in on one channel, transcription out on the other.
- Configuration via `MedicalScribeConfigurationEvent` (channel definitions, encryption, analytics settings).

### Audio Requirements

- Language: US English only (en-US).
- Recommended: Lossless audio (FLAC, WAV), PCM 16-bit, 16kHz+.

### Processing Pipeline

1. **Audio Ingestion**: S3 (batch) or HTTP/2 stream (real-time).
2. **Transcription**: Turn-by-turn transcript with word-level timestamps.
3. **Speaker Role Identification**: Patient vs clinician.
4. **Dialogue Classification**: Small talk, subjective, objective, etc.
5. **Medical Entity Extraction**: Conditions, medications, treatments.
6. **Clinical Note Generation**: AI generates structured summary per template.

### Note Templates (7 supported)

| Template | Sections |
|----------|----------|
| HISTORY_AND_PHYSICAL (default) | Chief Complaint, HPI, ROS, PMH, Assessment, Plan, Physical Exam, Family Hx, Social Hx, Diagnostics |
| PH_SOAP | Subjective, Objective, Assessment, Plan |
| BH_SOAP (Behavioral) | Subjective, Objective, Assessment, Plan |
| DAP | Data, Assessment, Plan |
| GIRPP | Goal, Intervention, Response, Progress, Plan |
| BIRP | Behavior, Intervention, Response, Plan |
| SIRP | Situation, Intervention, Response, Plan |

### Evidence Mapping

Every AI-generated summary sentence includes `EvidenceLinks` containing `SegmentId` references back to source transcript dialogue. This is the core traceability mechanism for clinician validation.

### Supported Specialties

22 specialties including: Cardiology, Neurology, OBGYN, Oncology, Orthopedics, Primary Care, Surgery, Psychiatry.

### Safety / Privacy

- HIPAA-eligible.
- No audio or text retained after processing.
- No customer data used for model training.
- Designed as building block -- customers build their own review UX on top.

### EHR Integration

HealthScribe is an API service, not an EHR-embedded product. Healthcare ISVs (like Contrast AI) build on top of it. Integration pattern: audio capture app -> HealthScribe API -> structured JSON -> EHR write via FHIR/HL7.

---

## Cross-Cutting Analysis

### Pipeline Architecture Comparison

| Stage | Canvas | DAX/Dragon | Abridge | Suki | Nabla | HealthScribe |
|-------|--------|-----------|---------|------|-------|-------------|
| ASR | Vendor (OpenAI/Google/Anthropic) | Proprietary (PyTorch) | Proprietary medical-tuned | Dual ASR (dictation + command) | Fine-tuned Whisper | AWS proprietary |
| Speaker ID | Via ASR vendor | Proprietary | Proprietary | Via ASR | Via Whisper | Built-in |
| Note Gen | Multi-vendor LLM (GPT-4o default) | GPT-4 via Azure OpenAI | Proprietary transformer + GPT family | LLM (vendor not disclosed) | GPT-series + custom LLMs | AWS proprietary model |
| Safety | Human review + policy filters | Specialty guardrails + multi-model verify | 97% confabulation detection + Linked Evidence | PHI isolation | Atomic fact verification | Evidence links (SegmentId) |

### Prompting Strategy

| Tool | Approach |
|------|----------|
| Canvas Hyperscribe | Modular chain-of-thought with hierarchical/flat detection templates. Multi-step: detect instructions -> classify -> generate commands |
| DAX Copilot | Multi-stage pipeline (separate models per stage). GPT-4 for summarization. Emerging: GPT drafts, Claude verifies |
| Abridge | Multi-stage: ASR -> NLP extraction -> LLM generation -> confabulation detection model -> correction. Two separate models (generation + detection) |
| Suki | Hybrid: vector-search intent classification (sub-300ms) for commands + LLM for ambient summarization. LoRA fine-tuned Flan T5 for slot filling |
| Nabla | LLM generation -> atomic fact decomposition -> LLM-based fact verification against transcript |
| HealthScribe | Single API call handles full pipeline. Template-driven note structure. Evidence mapping is automatic |

### Hallucination Prevention Approaches

1. **Abridge** (most sophisticated): Proprietary detection model trained on 50K+ examples. Dual-axis classification (support x severity). 97% catch rate. Automated correction.
2. **Nabla**: Atomic fact decomposition + LLM verification against transcript. Only proven facts survive.
3. **DAX/Dragon**: Multi-model verification (GPT + Claude). 67-89% hallucination reduction in enterprise.
4. **Canvas**: Full patient context grounding + human-in-the-loop. No automated hallucination detection disclosed.
5. **Suki**: PHI isolation. No specific hallucination detection system disclosed.
6. **HealthScribe**: Evidence links for traceability. No automated detection -- relies on downstream apps.

### EHR Integration Depth

| Tool | Epic | Others | Approach |
|------|------|--------|----------|
| Canvas | IS the EMR | N/A | Native SDK |
| DAX | Embedded (GA) | Cerner, MEDITECH, athena | Ambient APIs |
| Abridge | Embedded (Haiku/Hyperdrive) | Limited | Epic Ambient APIs |
| Suki | Embedded (Toolbox, INSIDE) | Cerner, athena, MEDITECH | Dedicated integration layer |
| Nabla | Embedded (Ambient APIs) | Any via Nabla Connect | Ambient APIs + plug-and-play module |
| HealthScribe | N/A (API only) | N/A (API only) | ISVs build on top |

---

## Key Takeaways for Clara

1. **Multi-stage pipeline is the standard**: ASR -> diarization -> dialogue classification -> NLP entity extraction -> LLM note generation -> safety check -> human review. No production system does this in a single prompt.

2. **Hallucination prevention is the moat**: Abridge's dual-axis confabulation detection (97% catch rate) and Nabla's atomic fact verification are the gold standards. Simple "ask the LLM to be accurate" is not sufficient.

3. **Evidence linking is table stakes**: Every production system maps generated text back to source transcript. Abridge's "Linked Evidence" and HealthScribe's `EvidenceLinks` with `SegmentId` are the reference implementations.

4. **Separate models for separate stages**: DAX uses separate models per pipeline stage. Suki uses separate ASRs for dictation vs commands. Canvas uses separate audio and text LLMs. Monolithic single-model approaches are not used in production.

5. **Human-in-the-loop is non-negotiable**: Every system requires clinician review before note finalization. Canvas makes this especially explicit with per-command approval.

6. **EHR integration via ambient APIs**: Epic's Ambient APIs are the dominant integration path. Most tools achieve full Epic embedding in 2-3 weeks.

7. **Multi-vendor LLM strategy**: Canvas (OpenAI/Google/Anthropic swappable), DAX (GPT + Claude for verification), Nabla (GPT + custom). No production system is locked to a single model.
