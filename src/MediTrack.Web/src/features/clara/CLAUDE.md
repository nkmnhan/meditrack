# Clara Feature — Frontend Context

## Overview
AI clinical companion UI: real-time audio recording, live transcription, AI suggestions panel, session summary.

## Key Libraries
| Library | Usage |
|---------|-------|
| **@microsoft/signalr** | Real-time connection to `SessionHub` for transcript/suggestion streaming |
| **Web Audio API** | Browser audio capture for STT |

## Components
| Component | Purpose |
|-----------|---------|
| `SessionStartScreen` | Start new session — select patient, session type, begin recording |
| `LiveSessionView` | Active session — transcript + suggestions side-by-side |
| `TranscriptPanel` | Real-time transcript with speaker labels (Doctor/Patient) |
| `SuggestionPanel` | AI suggestions with urgency badges, type icons, confidence |
| `SessionSummary` | Post-session summary with key findings, action items |
| `DevPanel` | Debug panel for development (connection status, raw events) |

## Hooks
| Hook | Purpose |
|------|---------|
| `useSession` | Session lifecycle: start, pause, resume, end. SignalR connection management |
| `useAudioRecording` | Browser audio capture, chunking, streaming to backend |

## Store (`claraApi.ts`)
RTK Query endpoints:
- `getSessions` / `getSessionById`
- `startSession` / `endSession`
- `getSessionTranscript`
- `requestSuggestion` (on-demand Clara button)
- `searchKnowledge` / `uploadDocument`

## SignalR Events
| Event | Direction | Payload |
|-------|-----------|---------|
| `TranscriptUpdate` | Server → Client | `TranscriptLine` (speaker, text, timestamp, confidence) |
| `SuggestionReceived` | Server → Client | `Suggestion` (content, type, urgency, source) |
| `SessionStatusChanged` | Server → Client | New status string |
| `SendAudioChunk` | Client → Server | Audio binary data |

## Routes
- `/clara` → session start screen
- `/clara/session/:id` → live session view
- `/clara/session/:id/summary` → post-session summary

## Clara FAB
Floating action button available on all pages — opens Clara panel (Sheet drawer on mobile, side panel on desktop).
