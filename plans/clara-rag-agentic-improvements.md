# Clara — RAG & AI Improvements Plan

> **Goal**: Improve Clara's suggestion quality and context awareness without over-engineering. Apply YAGNI — build only what addresses real, measurable gaps in the current system.

**Date**: 2026-03-05
**Branch**: feat/medical-ai-secretary
**Status**: Planned
**Prerequisite**: Clara MVP complete (all 15 gap analysis items resolved)

---

## Context & Decision Record

### Why NOT an agentic agent loop

The industry trend is "Agentic AI" — multi-step tool-calling loops where the LLM decides which tools to invoke. We evaluated this and **rejected it** for Clara's clinical pipeline.

**Reasons:**

1. **Deterministic > autonomous in healthcare.** The current pipeline always checks patient medications, always searches guidelines, always assesses risk factors. An agent loop lets the LLM "decide" to skip steps — unacceptable for patient safety.
2. **Parallel > sequential.** `SuggestionService` already gathers RAG context + patient context simultaneously via `Task.WhenAll`. An agent loop serializes these calls (call tool, wait, reason, call next tool), adding 3-5x latency per batch.
3. **Predictable cost.** One LLM call per trigger. Agent loops produce 1-5 calls depending on model behavior — unpredictable at scale.
4. **YAGNI.** The tool set is small and fixed (knowledge, patient context, skills). There is no dynamic tool selection problem to solve.

**When to revisit:** If we add 10+ tools, integrate external EMRs (Epic/Cerner), or need the LLM to dynamically choose between incompatible data sources, then an agent loop becomes justified.

### Why NOT re-ranking or query expansion (yet)

- **Re-ranking**: 3 documents, ~15-20 chunks. Vector search already returns the right content. Re-ranking adds latency for zero measurable improvement. Revisit at 100+ documents.
- **Query expansion**: Hypothesis that rephrasing transcript improves retrieval is unverified. The simpler fix (extract patient utterances as search query) should be tested first. Add expansion only if retrieval scores remain poor after that fix.
- **PDF ingestion**: No PDFs exist to ingest. Build when a real clinical PDF arrives.
- **Hybrid search (BM25 + vector)**: At current knowledge base size, vector-only search is sufficient. Revisit when keyword-specific medical terms (drug names, ICD codes) cause retrieval misses.

---

## Implementation Items

### Item 1: Structural Chunking

**Priority**: High
**Effort**: 0.5 day
**Files**: `src/Clara.API/Services/KnowledgeSeederService.cs`

#### Problem

`ChunkText()` (line 153) splits on whitespace with a word-count window. This destroys document structure — Markdown headers, numbered clinical criteria, and decision trees get split at arbitrary boundaries. A chunk that starts mid-criterion is useless to the LLM.

Example of what breaks:
```
## HEART Score Criteria
1. History (0-2 points)
   - Highly suspicious -> 2
   - Moderately suspicious -> 1
```
Current chunking can split between "History (0-2 points)" and its sub-items.

#### Solution

Replace word-count chunking with structure-aware chunking:

1. Split on Markdown headers (`##`, `###`) as primary chunk boundaries
2. Within a header section, keep numbered/bulleted lists intact (never split mid-list)
3. If a section exceeds max chunk size, fall back to paragraph-level splitting within that section
4. Preserve section title as prefix in each chunk for context (e.g., "## HEART Score Criteria > 1. History")
5. Add metadata: `section_title`, `heading_level` to `KnowledgeChunk` entity

#### Acceptance Criteria

- Existing seed documents re-chunked with no mid-list splits
- Each chunk starts with its parent header for context
- Chunk count may change (acceptable — quality over count)
- All existing integration tests pass
- Knowledge search returns same or better relevance scores (log comparison)

#### Migration Note

Requires re-seeding: delete existing chunks, re-run `KnowledgeSeederService`. Add a `ChunkVersion` field to `Document` to detect stale chunks and auto-reseed.

---

### Item 2: Rolling Session Summary

**Priority**: High (patient safety)
**Effort**: 1-2 days
**Files**: `src/Clara.API/Domain/Session.cs`, `src/Clara.API/Services/SuggestionService.cs`, `src/Clara.API/Data/ClaraDbContext.cs`, new EF migration

#### Problem

`SuggestionService.cs` (line 65-68) loads only the last 10 transcript lines:

```csharp
.Include(session => session.TranscriptLines
    .OrderByDescending(line => line.Timestamp)
    .Take(10))
```

10 lines covers ~1 minute of conversation. A 15-minute consultation produces ~100 lines. If a patient mentions a penicillin allergy at minute 2 and the doctor discusses antibiotics at minute 12, Clara has no memory of the allergy. **This is a patient safety gap.**

#### Solution

1. Add `RunningSummary` (string, nullable) and `SummaryLineCount` (int) fields to `Session` entity
2. After every 20 new transcript lines (tracked via `SummaryLineCount`), trigger a summary generation call:
   - Input: current `RunningSummary` (if any) + the 20 new lines
   - Output: structured summary with sections: Chief Complaint, Symptoms, Allergies Mentioned, Medications Discussed, Tests Ordered, Key Findings
   - Model: gpt-4o-mini (cheap, fast — summary is a compression task, not a reasoning task)
3. Modify `SuggestionService.BuildPrompt()` to include `RunningSummary` before the recent 10 transcript lines
4. Summary generation is fire-and-forget from the batch trigger — does not block suggestion generation

#### Prompt Template (Summary)

```
Compress the following clinical conversation into a structured summary.
Preserve ALL clinically relevant details — especially allergies, medications, and symptoms.
Update the existing summary if provided.

## Existing Summary
{existingSummary ?? "None — this is the start of the session."}

## New Conversation Lines
{last20Lines}

Output format:
- Chief Complaint: ...
- Symptoms: ...
- Allergies Mentioned: ...
- Medications Discussed: ...
- Tests Ordered/Discussed: ...
- Key Findings: ...
```

#### Acceptance Criteria

- Summary auto-generates every 20 transcript lines
- `BuildPrompt()` includes summary when available
- Summary persists on Session entity (survives reconnects)
- gpt-4o-mini used for summary calls (not the on-demand model)
- Summary generation failure does not block suggestion generation

---

### Item 3: Smarter RAG Query Extraction

**Priority**: Medium
**Effort**: 1 hour
**Files**: `src/Clara.API/Services/SuggestionService.cs`

#### Problem

`GatherKnowledgeContextAsync` (line 161) passes the full `conversationText` (all 10 lines, both speakers) as the embedding search query:

```csharp
var results = await _knowledgeService.SearchForContextAsync(
    conversationText, topK: 3, cancellationToken);
```

A conversation like:
```
[Doctor]: How long have you had this?
[Patient]: About two weeks, it gets worse at night.
[Doctor]: Any shortness of breath?
[Patient]: Yes, especially when I lie down.
```

...embeds as a dialogue, not a clinical query. The embedding has low similarity to guideline chunks about "orthopnea" or "paroxysmal nocturnal dyspnea" because the semantic distance between a casual conversation and a medical reference text is large.

#### Solution

Extract only the last 2-3 **patient** utterances and use those as the search query:

```csharp
private string ExtractPatientUtterancesForSearch(List<TranscriptLine> recentLines)
{
    var patientUtterances = recentLines
        .Where(line => line.Speaker == SpeakerRole.Patient)
        .TakeLast(3)
        .Select(line => line.Text);

    return string.Join(" ", patientUtterances);
}
```

Patient speech contains the symptoms, complaints, and clinical signals. Doctor speech contains questions and instructions — less useful for guideline retrieval.

#### Acceptance Criteria

- RAG query uses patient utterances only (last 3)
- Falls back to full conversation text if no patient lines exist
- Log retrieval scores before/after for comparison
- No new services or dependencies

---

### Item 4: Tiered LLM Strategy

**Priority**: Medium
**Effort**: 0.5 day
**Files**: `src/Clara.API/Program.cs`, `src/Clara.API/Extensions/AIServiceExtensions.cs`, `src/Clara.API/Services/SuggestionService.cs`, `src/Clara.API/appsettings.json`

#### Problem

Only `gpt-4o-mini` is registered. Both auto-batch and on-demand "Ask Clara" use the same model. Doctors expect higher quality when they explicitly press the Clara button. The CLAUDE.md architecture specifies a tiered strategy that was never implemented.

#### Solution

1. Register two named `IChatClient` instances via keyed DI:
   - `"batch"` → gpt-4o-mini ($0.15/$0.60 per 1M tokens) — auto-triggered suggestions
   - `"on-demand"` → gpt-4o ($2.50/$10.00 per 1M tokens) — user-requested analysis
2. `SuggestionService` receives both clients, selects based on `source` parameter
3. Configuration in `appsettings.json`:

```json
{
  "AI": {
    "OpenAI": {
      "ApiKey": "REPLACE_IN_OVERRIDE",
      "BatchModel": "gpt-4o-mini",
      "OnDemandModel": "gpt-4o"
    }
  }
}
```

4. On-demand also gets a higher `MaxOutputTokens` (500 vs 300) and slightly lower `Temperature` (0.2 vs 0.3) for more thorough, precise responses

#### Acceptance Criteria

- Auto-batch triggers use `gpt-4o-mini`
- On-demand triggers use `gpt-4o` (or configured model)
- Model name logged with each LLM call for cost tracking
- Graceful fallback: if on-demand model fails, retry once with batch model
- No breaking changes to existing endpoints or SignalR events

---

## Cost Estimate (6,000 Users)

### Assumptions

| Parameter | Value |
|-----------|-------|
| Users | 6,000 |
| Doctors | ~600 (10:1 ratio) |
| Concurrent sessions | ~60 |
| Sessions/day | 9,000 |
| Audio hours/day | 2,250 (15 min avg) |
| Batch triggers/day | 90,000 (10 per session) |
| On-demand triggers/day | 1,350 (~10% of sessions, 1.5 per session) |
| Summary calls/day | 45,000 (5 per session, every 20 lines) |

### Monthly Cost Breakdown

| Component | Cost/mo | Notes |
|-----------|---------|-------|
| Deepgram STT (Nova-2) | $12,770 | 67,500 hrs/mo, ~$0.189/hr (Growth plan) |
| LLM — gpt-4o-mini (batch) | $1,620 | 90,000/day x 1 call, ~2,000 in / 500 out tokens |
| LLM — gpt-4o (on-demand) | $628 | 1,350/day x 1 call, ~3,000 in / 800 out tokens |
| LLM — gpt-4o-mini (summaries) | $750 | 45,000/day, ~3,000 in / 300 out tokens |
| Embeddings (text-embedding-3-small) | $10 | Query embeddings, negligible |
| Infrastructure | $2,100 | PostgreSQL, Redis, App Service x5, RabbitMQ, monitoring |
| **Total** | **$17,878/mo** | |
| **Per user** | **$2.98/mo** | |
| **Per doctor** | **$29.80/mo** | |

### Cost Comparison

| Scenario | Monthly | Per user | Per doctor |
|----------|---------|----------|------------|
| Current architecture (6K) | ~$17,100 | $2.85 | $28.50 |
| This plan (6K) | ~$17,878 | $2.98 | $29.80 |
| Rejected agentic plan (6K) | ~$21,285 | $3.55 | $35.48 |

The improvement costs only **+$778/mo** (+4.5%) over current — entirely from the summary calls. No agent loop overhead.

### Industry Comparison

| Product | Cost per doctor/mo |
|---------|-------------------|
| Nuance DAX (Microsoft) | $200-300 |
| Abridge | $150-250 |
| **Clara (this plan)** | **$29.80** |

---

## Deferred Items (Revisit Triggers)

| Item | Revisit When |
|------|-------------|
| Agent loop (tool-calling) | 10+ tools, external EMR integration, or dynamic data source selection |
| Re-ranking | Knowledge base exceeds 100 documents |
| Query expansion (LLM-rewritten queries) | Retrieval scores consistently <0.7 after Item 3 fix |
| Hybrid search (BM25 + vector) | Medical terminology (drug names, ICD codes) causes retrieval misses |
| PDF ingestion pipeline | First real clinical PDF needs to be ingested |
| MCP protocol layer | Phase 7 (per clara-mvp-plan.md) |
| WebSocket STT streaming | Latency complaints from doctors about transcription delay |
| Self-hosted Whisper | STT cost exceeds $15K/mo and team has GPU infrastructure |

---

## Implementation Order

```
Item 3 (RAG query extraction)     ─── 1 hour  ──→ deploy + measure retrieval scores
Item 1 (structural chunking)      ─── 0.5 day ──→ reseed knowledge base + compare
Item 4 (tiered LLM)               ─── 0.5 day ──→ deploy + verify cost split in logs
Item 2 (rolling summary)          ─── 1-2 days ──→ deploy + test with 15-min sessions
                                       Total: ~3-4 days
```

Item 3 first because it's the smallest change with immediate measurability — retrieval score logs will tell us if the query was the bottleneck before we invest in chunking improvements.
