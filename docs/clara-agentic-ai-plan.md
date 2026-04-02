# Clara Agentic AI Improvement Plan

> Research date: 2026-04-02
> Sources: Canvas Hyperscribe, Nuance DAX Copilot, Abridge, Suki AI, Nabla, Amazon HealthScribe,
> LangGraph, Semantic Kernel, OpenAI Agents SDK, Microsoft Azure Architecture Center,
> Abridge Confabulation Whitepaper, MIT Media Lab benchmarks, FDA CDS guidance (Jan 2026)

---

## Current State Assessment

### What Clara Does Well (Keep These)

| Strength | Details |
|----------|---------|
| Real-time SignalR transport | Auto-reconnect, session groups, bidirectional streaming |
| Deepgram STT (nova-2-medical) | Industry-standard medical ASR, same vendor as Abridge/Suki |
| M.E.AI abstraction | `IChatClient` + `IEmbeddingGenerator` — vendor-agnostic, Semantic Kernel compatible |
| Polly resilience | Circuit breaker, retry, timeout on all HTTP clients |
| Prompt injection defense | XML delimiters around user content — correct approach per OWASP |
| LLM output sanitization | HTML stripping, type/urgency whitelisting, confidence clamping |
| Batch trigger logic | 5 utterances / 60s timer — matches industry ambient scribe patterns |
| PostgreSQL + pgvector | The recommended production stack (Tiger Data, AWS, Timescale guidance) |
| Full frontend ready | 3 session screens, audio recording, RTK Query, SignalR hooks — all real code |

### Gaps vs Industry

| Gap | Industry Standard | Clara Current |
|-----|------------------|---------------|
| Agent loop | ReAct (Reason+Act) with tool calling | Single prompt -> single response |
| Multi-model tiering | Different models per task complexity | Single `IChatClient`, no routing |
| Evidence linking | Every claim traced to source transcript | No attribution |
| Hallucination guard | Dedicated verification model | Only output sanitization |
| Corrective RAG | Grade retrieval quality, re-query if poor | Single-shot RAG |
| Tool orchestration | Agent decides which tools to call | Hardcoded pipeline |
| Urgent keyword bypass | Immediate high-priority path | Specified but not implemented |
| Agent memory | Cross-session episodic + semantic | Session-scoped only |
| Streaming agent events | Thinking/tool/text/complete events | Suggestions arrive as finished objects |
| Service interfaces | Abstractions for DIP + testability | All concrete classes |
| Rich domain model | State machine, enums, invariants | Anemic entities, string-typed status |
| Disconnect cleanup | Timer/state cleanup on disconnect | Not implemented |
| PHI audit trail | Every AI-PHI interaction logged | Mentioned but not implemented |
| Suggestion tracking | Accept/Dismiss/Edit with timestamps | No tracking |

---

## Improvement Plan

### P0 — MVP Critical (Same Day, ~2-3 hours)

> Goal: Make Clara testable and safe for demo. No architectural changes, just fixes.

#### P0.1 — Urgent Keyword Bypass in BatchTriggerService

**What:** When a patient says "chest pain", "can't breathe", "severe bleeding", etc., skip the 5-utterance/60s timer and trigger suggestions immediately.

**Why (Pros):**
- **Patient safety** — delayed suggestions for "chest pain" could mean delayed intervention. Every production clinical AI (Canvas, DAX, Abridge) has this
- **Already in the rules** — CLAUDE.md specifies this but it's not implemented. Removes a gap between spec and code
- **Simple to implement** — ~20 lines in `BatchTriggerService.OnTranscriptLineAddedAsync()` with a `HashSet<string>` of urgent phrases
- **Demo impact** — showing "Clara detects urgent symptoms and responds instantly" is a powerful feature to demonstrate

#### P0.2 — Disconnect Cleanup

**What:** Call `BatchTriggerService.CleanupSession()` from `SessionHub.OnDisconnectedAsync()`. Track connection-to-session mapping.

**Why (Pros):**
- **Memory leak prevention** — without cleanup, each abandoned session leaks a `Timer` + `ConcurrentDictionary` entry forever. In a demo with multiple sessions, this compounds
- **Resource safety** — orphaned timers keep firing `TriggerBatchSuggestionAsync`, burning LLM tokens on dead sessions
- **Production requirement** — any real deployment with multiple concurrent doctors would hit this
- **~15 lines of code** — add a `ConcurrentDictionary<string, string>` mapping connectionId -> sessionId, clean up on disconnect

#### P0.3 — Config-Driven Thresholds

**What:** Move hardcoded `5` (utterances) and `60` (seconds) to `IOptions<BatchTriggerOptions>` from appsettings.

**Why (Pros):**
- **Tunable without redeployment** — different specialties need different thresholds (surgery: lower, psychiatry: higher)
- **Testability** — unit tests can inject fast thresholds (1 utterance, 1 second) instead of waiting
- **KISS compliance** — the values are already magic numbers in the code, just needs extraction
- **~20 lines** — add a `BatchTriggerOptions` record + bind in `Program.cs`

---

### P1 — Before Demo/Review (~1-2 days)

> Goal: Differentiate Clara from a basic LLM wrapper. These features are what separate "AI chatbot" from "clinical AI assistant".

#### P1.1 — Tiered Model Routing

**What:** Register two `IChatClient` instances via keyed DI. Route batch suggestions -> GPT-4o-mini (cheap, fast), on-demand/urgent -> Claude Sonnet 4 or GPT-4o (smart, accurate).

**Why (Pros):**
- **90% cost reduction** — batch suggestions (90% of calls) use GPT-4o-mini at ~$0.15/1M tokens vs GPT-4o at ~$2.50/1M. For 100 sessions/day, this saves ~$200/month
- **Better quality where it matters** — on-demand suggestions get the best model, so doctors see higher quality when they explicitly ask Clara
- **Industry standard** — every production clinical AI uses model tiering (Canvas Hyperscribe, Nuance DAX). No one uses GPT-4o for everything
- **Already designed** — CLAUDE.md specifies this architecture, just needs implementation
- **M.E.AI makes this easy** — .NET 10 keyed services: `builder.Services.AddKeyedSingleton<IChatClient>("batch", ...)` and `builder.Services.AddKeyedSingleton<IChatClient>("ondemand", ...)`

#### P1.2 — Evidence Linking

**What:** Tag each suggestion with the `TranscriptLine.Id`(s) that triggered it. Frontend highlights the source transcript when hovering a suggestion.

**Why (Pros):**
- **Trust** — doctors don't trust AI they can't verify. "Why does Clara suggest this?" needs an answer. Abridge's "Linked Evidence" is their #1 differentiator
- **FDA compliance** — the January 2026 CDS guidance requires that clinicians can "independently review the basis for recommendations". Evidence linking satisfies this
- **Hallucination visibility** — if a suggestion has no linked evidence, it's visibly suspicious. This is a passive hallucination detector
- **Audit trail** — for HIPAA, being able to trace AI output -> source data is a compliance requirement
- **Implementation** — add `List<Guid> SourceTranscriptLineIds` to `Suggestion` entity, populate in `SuggestionService` from the transcript lines sent to the LLM

#### P1.3 — ReAct Agent Loop with Tool Calling

**What:** Replace the hardcoded pipeline (always RAG + always patient context) with an agent that *decides* which tools to call based on the conversation.

**Why (Pros):**
- **Smarter resource usage** — current Clara always does RAG search + patient API call, even when unnecessary. A ReAct agent calls `search_knowledge` only when the conversation mentions a clinical topic it's unsure about
- **Extensible** — adding a new capability (e.g., drug interaction checker, lab result lookup) = adding a tool definition. No pipeline rewiring needed. This is the foundation for your multi-agent future
- **M.E.AI native** — `UseFunctionInvocation()` middleware runs the ReAct loop automatically. Clara's tools become `AIFunction` objects registered via `AIFunctionFactory.Create()`
- **Industry convergence** — LangGraph, Semantic Kernel, OpenAI Agents SDK all use this pattern. It's the "right" way to build agentic AI in 2026
- **Better suggestions** — the agent can reason: "The patient mentioned metformin and the doctor asked about kidney function -> I should search for metformin renal dosing guidelines AND check recent lab results" instead of blindly searching with the last 10 transcript lines

**Current pipeline:**
```
transcript -> ALWAYS search knowledge -> ALWAYS get patient context -> build prompt -> LLM -> suggestions
```

**ReAct agent:**
```
transcript -> LLM decides:
  "Patient mentioned chest pain + shortness of breath"
  -> calls search_knowledge("acute coronary syndrome differential")
  -> calls get_patient_context(patientId)
  -> calls check_medications(patientId)  // NEW: checks for anticoagulants
  -> reasoning: "Patient is on warfarin, has cardiac history"
  -> generates targeted suggestion with evidence
```

#### P1.4 — Streaming Agent Events via SignalR

**What:** Instead of suggestions appearing as finished objects, stream the agent's thinking process: `onThinking` -> `onToolStarted("search_knowledge")` -> `onToolCompleted` -> `onTextChunk` -> `onSuggestionComplete`.

**Why (Pros):**
- **Perceived speed** — users perceive streaming as 3-5x faster than waiting for a complete response, even when total time is the same. Every modern AI product streams (ChatGPT, Copilot, Claude)
- **Transparency** — doctors see Clara is "searching guidelines..." or "checking patient history..." — builds trust that the AI is grounding its response, not hallucinating
- **Debug visibility** — the DevPanel can show the full agent trace (which tools called, what was retrieved, reasoning steps)
- **Frontend already supports it** — `useSession` hook receives SignalR events. Just needs new event types
- **Implementation** — `IAsyncEnumerable<AgentEvent>` from `SuggestionService`, consumed by `SessionHub`, broadcast as typed SignalR events

---

### P2 — Production Hardening (~1 week)

> Goal: Enterprise-grade reliability, testability, and compliance.

#### P2.1 — Service Interfaces (DIP)

**What:** Extract `ISuggestionService`, `IKnowledgeService`, `IPatientContextService`, `IBatchTriggerService`. Register as DI abstractions.

**Why (Pros):**
- **Testability** — unit tests can mock `ISuggestionService` instead of fighting with concrete `SuggestionService` and its 5 dependencies. Current Clara.UnitTests already have 106 tests — they'd be simpler with interfaces
- **SOLID compliance** — Dependency Inversion is mandatory per CLAUDE.md. Every other MediTrack service follows this pattern
- **Swap implementations** — test with `FakeSuggestionService` that returns canned responses (no LLM needed). Future: A/B test different suggestion strategies
- **Clean architecture alignment** — matches the eShop pattern the rest of the codebase follows

#### P2.2 — Rich Domain Model

**What:** Add `Session.Complete()`, `Session.Pause()`, `Session.Cancel()` methods with state machine validation. Replace string-typed `Status`, `Type`, `Urgency` with enums. Add invariant enforcement.

**Why (Pros):**
- **Bug prevention** — currently nothing prevents `session.Status = "banana"` or `EndedAt < StartedAt`. Rich model makes invalid states unrepresentable
- **Self-documenting** — `session.Complete()` is clearer than `session.Status = "Completed"; session.EndedAt = DateTimeOffset.UtcNow;` scattered across services
- **DDD alignment** — MedicalRecords.API already uses rich domain models. Clara should match
- **Enum benefits** — exhaustive switch statements, no magic strings, IDE autocomplete, compile-time safety

#### P2.3 — Corrective RAG

**What:** After retrieving knowledge chunks, ask the LLM to grade their relevance (0-1). If average relevance < 0.5, rewrite the query and search again. If still poor, generate suggestions without RAG context (graceful degradation).

**Why (Pros):**
- **Better suggestion quality** — Self-Reflective RAG achieves 5.8% hallucination rate vs 15-20% for naive RAG (MIT benchmark). The quality difference is significant for clinical safety
- **Handles query mismatch** — when the doctor discusses "shortness of breath" but knowledge base uses "dyspnea", corrective RAG rewrites the query
- **Cost-effective** — one extra LLM call (grading) prevents wasting the main generation call on irrelevant context
- **Works with existing pgvector** — no infrastructure change, just an additional LLM grading step

#### P2.4 — Reflection/Critique Loop

**What:** After generating suggestions, a second LLM call (or same model with critic prompt) verifies each suggestion against the transcript. Unsupported claims are revised or removed.

**Why (Pros):**
- **Hallucination catch rate** — Abridge's dedicated confabulation detector catches 97% of unsupported claims. Even a simple critic prompt catches ~70% (vs 0% without it). This is the single biggest safety improvement
- **Microsoft uses this** — Copilot uses "GPT drafts, Claude verifies" and reports 67-89% hallucination reduction
- **Clinical safety** — a suggestion saying "patient reports no allergies" when the transcript never mentioned allergies is dangerous. The critic catches this
- **Measurable** — log how many suggestions get revised/removed by the critic. Track this rate over time as a quality metric
- **Cost trade-off** — doubles LLM calls for suggestions, but suggestions are infrequent (every 60s or 5 utterances). At ~$0.01/suggestion, the critic adds ~$0.01. Worth it for clinical safety

#### P2.5 — PHI Audit Trail

**What:** Log every `PatientContextService.GetPatientContextAsync()` call via EventBus. Include: who accessed, which patient, what data fields, timestamp, purpose (suggestion generation).

**Why (Pros):**
- **HIPAA mandatory** — "covered entities must maintain logs of access to PHI for 6 years". Missing audit logs are themselves a HIPAA violation
- **Already in the rules** — CLAUDE.md and MCP-AI rules both specify this. The EventBus infrastructure exists
- **Breach response** — if a data breach occurs, audit logs answer "what was accessed?" Without them, you must assume everything was compromised (worst-case notification)
- **Trust** — admins can review AI data access in the existing Admin Audit page

#### P2.6 — Suggestion Tracking (Accept/Dismiss/Edit)

**What:** Add `AcceptedAt`, `DismissedAt`, `EditedAt`, `EditedContent` columns to `Suggestion`. Frontend sends action events via SignalR.

**Why (Pros):**
- **Quality measurement** — acceptance rate is the primary metric for clinical AI quality. Abridge, DAX, and Canvas all track this. Without it, you can't answer "is Clara useful?"
- **Model improvement** — low-acceptance suggestions reveal prompt/RAG problems. High-acceptance patterns inform what works
- **Clinician trust** — "Clara's suggestions were accepted 78% of the time" is a powerful stat for adoption
- **Regulatory** — FDA expects post-market surveillance for clinical decision support. Acceptance tracking is the minimum viable metric

---

### P3 — Multi-Agent Future (~2-3 weeks for first additional agent)

> Goal: Extensible architecture that supports N agents with shared infrastructure.

#### P3.1 — Agent Abstraction Layer

**What:** Extract `IAgentService` interface with `SystemPrompt`, `Tools[]`, `IChatClient`, `GuardRails[]`, `MemoryScope`. Clara becomes `ClaraDoctorAgent : IAgentService`.

**Why (Pros):**
- **N agents in days, not weeks** — once the abstraction exists, a new agent = new prompt + new tools + new UI. Shared: auth, SignalR, pgvector, audit, resilience
- **Semantic Kernel alignment** — Microsoft's `AgentOrchestration` API (production-ready 2025) uses exactly this pattern. Future migration path to SK agents is straightforward
- **Handoff orchestration** — agents can transfer context to each other (e.g., Clara doctor agent hands off to a documentation agent for note generation)
- **A/B testing** — run two versions of Clara with different prompts/models, compare acceptance rates

#### P3.2 — Patient Companion Agent

**What:** A second agent persona for patients. Different system prompt (empathetic, plain language), different tools (appointment booking, medication reminders, visit prep checklists), different safety rules (never diagnose, always redirect to doctor).

**Why (Pros):**
- **Market differentiator** — most clinical AI is doctor-facing. Patient-facing AI is the next wave (Abridge is exploring this, Suki announced patient features)
- **Revenue opportunity** — patient engagement tools are separately billable in healthcare SaaS
- **Reduced no-shows** — AI-powered visit prep ("here's what to expect, bring these medications") reduces no-show rates by 15-20% (industry benchmarks)
- **Reuses 80% of infrastructure** — same PostgreSQL, same auth (different role), same SignalR, same knowledge base. Only new: prompt, tools, UI panel
- **Estimated effort: 2-3 days** with the agent abstraction layer in place

#### P3.3 — Cross-Session Memory (Episodic + Semantic)

**What:** Remember patterns across sessions. "This patient had elevated BP in the last 3 visits" or "Dr. Smith prefers to see lab results before prescribing."

**Why (Pros):**
- **Continuity of care** — Clara remembering past sessions makes it dramatically more useful. "Last visit you discussed switching from metformin to..." is powerful context
- **Doctor personalization** — learn each doctor's preferences (communication style, preferred drug classes, common differential diagnoses)
- **PostgreSQL native** — add `agent_memories` table with pgvector embeddings. Search by patient + recency + semantic relevance. No new infrastructure
- **Mem0 pattern** — the leading open-source memory framework shows 26% improvement in agent quality with proper memory. Their extraction/update pattern is well-documented

---

## Effort Estimation Summary

| Priority | Items | Effort | Impact |
|----------|-------|--------|--------|
| **P0** | Urgent bypass, disconnect cleanup, config thresholds | 2-3 hours | Testable + safe MVP |
| **P1** | Model tiering, evidence linking, ReAct loop, streaming | 1-2 days | "Real AI assistant" vs "LLM wrapper" |
| **P2** | Interfaces, rich domain, corrective RAG, critic, audit, tracking | ~1 week | Enterprise-grade, HIPAA-ready |
| **P3** | Agent abstraction, patient agent, cross-session memory | 2-3 weeks | Multi-agent platform |

## Architecture After P1

```
Audio -> Deepgram STT -> Transcript + Diarization
  -> BatchTrigger (5 utterances / 60s / urgent keyword bypass)
    -> Model Router (batch -> GPT-4o-mini, urgent/on-demand -> Claude Sonnet 4)
      -> ReAct Agent Loop:
          LLM reasons about transcript
          -> calls search_knowledge() if clinical topic detected
          -> calls get_patient_context() if patient-specific question
          -> calls check_medications() if drug mentioned
          -> generates suggestions with evidence links
        -> Stream events via SignalR (thinking/tool/text/complete)
          -> Frontend renders progressive updates
            -> Doctor: Accept / Edit / Dismiss
              -> Tracked for quality measurement
```

## Architecture After P3 (Multi-Agent)

```
                    +--> ClaraDoctorAgent (clinical suggestions, real-time)
                    |      Tools: knowledge_search, patient_context, medication_check
                    |      Model: Claude Sonnet 4 (on-demand) / GPT-4o-mini (batch)
                    |
User Request -----> Router (by role + context)
                    |
                    +--> PatientCompanionAgent (visit prep, reminders)
                    |      Tools: appointment_book, medication_remind, visit_prep
                    |      Model: GPT-4o-mini (cost-optimized for high volume)
                    |
                    +--> DocumentationAgent (SOAP notes, discharge summaries)
                           Tools: transcript_summarize, icd10_lookup, template_fill
                           Model: GPT-4o (accuracy-critical)

Shared Infrastructure:
  - PostgreSQL + pgvector (knowledge base, memories, audit)
  - SignalR (real-time events)
  - Duende IdentityServer (auth + role-based routing)
  - EventBus (audit trail, cross-service events)
  - Polly (resilience on all HTTP clients)
```

---

## References

- [Canvas Hyperscribe (GitHub)](https://github.com/canvas-medical/canvas-hyperscribe) — open-source clinical AI scribe
- [Abridge Confabulation Elimination](https://www.abridge.com/ai/science-confabulation-hallucination-elimination) — 97% hallucination catch rate
- [Microsoft Multi-Model Strategy](https://windowsnews.ai/article/microsofts-multi-model-copilot-strategy-gpt-drafts-claude-verifies-to-combat-ai-hallucinations.408542) — GPT drafts, Claude verifies
- [Microsoft Azure AI Agent Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [Semantic Kernel Multi-Agent Orchestration](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-orchestration/)
- [FDA CDS Guidance (Jan 2026)](https://www.fda.gov/medical-devices/software-medical-device-samd/clinical-decision-support-software) — exemption criteria
- [MIT Media Lab Hallucination Benchmark](https://arxiv.org/abs/2508.21803) — Self-Reflective RAG: 5.8% hallucination rate
- [Suki Engineering Blog](https://www.suki.ai/blog/engineering-an-invisible-and-assistive-voice-agent-for-clinicians/)
- [Nabla Whisper Customization](https://www.nabla.com/blog/how-nabla-uses-whisper) — 7,000 hours medical audio fine-tuning
- [AWS HealthScribe](https://docs.aws.amazon.com/transcribe/latest/dg/health-scribe.html) — evidence linking pattern
- [FDB MedProof MCP](https://www.fdbhealth.com/) — medication safety via MCP
- [Mem0 Paper](https://arxiv.org/abs/2504.19413) — 26% quality improvement with agent memory
- [Tiger Data PostgreSQL Memory](https://www.tigerdata.com/learn/building-ai-agents-with-persistent-memory-a-unified-database-approach)
