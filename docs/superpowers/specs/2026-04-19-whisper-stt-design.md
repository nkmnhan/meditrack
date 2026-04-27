# Whisper STT Migration Design

**Status:** APPROVED — ready for implementation planning  
**Date:** 2026-04-19  
**Branch:** feat/whisper-stt

---

## Goal

Replace Deepgram as Clara's primary speech-to-text provider with a self-hosted Whisper service
(faster-whisper), keeping Deepgram as an automatic fallback. All consumers depend only on
`ITranscriptionService` — nothing above that interface changes.

---

## Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Deployment target | Self-hosted faster-whisper in Docker | Zero per-minute cost at scale |
| GPU strategy | GPU in production, CPU in dev | Real-time latency on prod; dev accepts slower transcription |
| Model (GPU/prod) | `large-v3-turbo` | Best accuracy/speed balance with GPU |
| Model (CPU/dev) | `base` | Fast enough for dev iteration; ~10-15s for short chunks |
| Whisper API image | `linuxserver/faster-whisper` | OpenAI-compatible `/v1/audio/transcriptions` endpoint |
| Audio format | `audio/webm` (Opus) — no conversion | faster-whisper wraps ffmpeg; accepts WebM natively |
| Confidence score | Return `null` | Whisper has no per-utterance confidence; `TranscriptionResult.Confidence` is `float?` |
| Medical vocabulary | Include `prompt` parameter | 224-token medical term list in config |
| Fallback trigger | Automatic — circuit breaker open or non-2xx | Transparent to `SessionHub`; no manual toggle |
| Primary registration | `CompositeTranscriptionService` | Wraps `WhisperTranscriptionService` + `DeepgramService`; registered as `ITranscriptionService` |

---

## Target Architecture

```
SessionHub.StreamAudioChunk(sessionId, audioBase64)
  → ITranscriptionService  [CompositeTranscriptionService]
      ├─ PRIMARY: WhisperTranscriptionService
      │     → HttpClient("Whisper") → http://whisper:9000/v1/audio/transcriptions
      │     → multipart/form-data: file + model + language + prompt
      │     → Circuit breaker (15% failure ratio, 8s attempt timeout)
      │     → On BrokenCircuitException or non-2xx → fallback
      └─ FALLBACK: DeepgramService (existing, unchanged)
            → HttpClient("Deepgram") → api.deepgram.com/v1/listen
            → Circuit breaker (50% failure ratio, 10s attempt timeout)
  → TranscriptionResult(Transcript, Confidence=null)
  → TranscriptLine persisted + broadcast via SignalR  [unchanged]
  → BatchTriggerService → SuggestionService → IAgentService  [unchanged]
```

---

## New Files

| File | Purpose |
|------|---------|
| `src/Clara.API/Services/WhisperTranscriptionService.cs` | Implements `ITranscriptionService`; posts `audio/webm` to faster-whisper via multipart/form-data |
| `src/Clara.API/Services/CompositeTranscriptionService.cs` | Implements `ITranscriptionService`; tries Whisper, catches `BrokenCircuitException`/failure, falls back to Deepgram |
| `src/Clara.UnitTests/Services/WhisperTranscriptionServiceTests.cs` | Unit tests for Whisper service (NSubstitute, FluentAssertions) |
| `src/Clara.UnitTests/Services/CompositeTranscriptionServiceTests.cs` | Unit tests for fallback logic |

---

## Modified Files

| File | Change |
|------|--------|
| `docker-compose.yml` | Add `whisper` service; GPU profile for prod, CPU default |
| `src/Clara.API/appsettings.json` | Add `AI:Whisper` section (BaseUrl, Model, Language, MedicalPrompt) |
| `src/Clara.API/Extensions/AIServiceExtensions.cs` | Register `HttpClient("Whisper")` with resilience handler |
| `src/Clara.API/Program.cs` | Swap `ITranscriptionService` registration to `CompositeTranscriptionService`; register `WhisperTranscriptionService` and `DeepgramService` as concrete types |
| `src/Clara.API/Health/ClaraHealthCheck.cs` | Add Whisper health check (`GET /health` on whisper container) |
| `src/Clara.API/Extensions/ConfigValidator.cs` | Whisper `BaseUrl` required; `ApiKey` optional (no auth on local container) |

---

## Docker Compose

```yaml
# docker-compose.yml addition
whisper:
  image: linuxserver/faster-whisper:latest
  environment:
    - WHISPER_MODEL=base          # overridden to large-v3-turbo in prod
    - WHISPER_LANG=en
  ports:
    - "9000:9000"

# docker-compose.prod.yml override
whisper:
  environment:
    - WHISPER_MODEL=large-v3-turbo
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

---

## Configuration

```json
// appsettings.json
"AI": {
  "Whisper": {
    "BaseUrl": "http://whisper:9000",
    "Model": "base",
    "Language": "en",
    "MedicalPrompt": "patient, diagnosis, mg, mmHg, ECG, tachycardia, hypertension, myocardial"
  },
  "Deepgram": {
    "ApiKey": "REPLACE_IN_OVERRIDE"
  }
}
```

---

## Resilience

| Provider | Retries | Circuit Breaker | Attempt Timeout |
|----------|---------|-----------------|-----------------|
| Whisper (primary) | 2 | 15% failure ratio, 30s window | 8s |
| Deepgram (fallback) | 3 | 50% failure ratio, 30s window | 10s |

- Each provider has its own independent circuit breaker
- `CompositeTranscriptionService` catches `BrokenCircuitException` + `HttpRequestException` from Whisper
- If Deepgram circuit also opens: exception propagates to `SessionHub` (existing error handling)

---

## Testing Strategy

- **Unit tests** (no infra): Mock `IHttpClientFactory` — test `WhisperTranscriptionService` request shape, response mapping, null confidence
- **Composite tests**: Verify primary success path, fallback on exception, fallback on non-2xx, both-fail propagation
- **No integration tests needed** for this change — `ITranscriptionService` boundary is fully unit-testable

---

## Out of Scope

- Audio format conversion (WebM accepted natively)
- Frontend changes (none — SignalR event shape unchanged)
- Diarization / speaker identification (Deepgram handles this today; out of scope)
- Fine-tuning Whisper on medical data (future P2)
