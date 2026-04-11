export interface TranscriptLine {
  readonly id: string;
  readonly speaker: "Doctor" | "Patient";
  readonly text: string;
  readonly timestamp: string;
  readonly confidence?: number;
}

export interface Suggestion {
  readonly id: string;
  readonly content: string;
  readonly type: string;
  readonly source: string;
  readonly urgency?: string;
  readonly confidence?: number;
  readonly triggeredAt: string;
}

export type SessionType = "Consultation" | "Follow-up" | "Review";

export interface Session {
  readonly id: string;
  readonly doctorId: string;
  readonly patientId?: string;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly status: "Active" | "Paused" | "Completed" | "Cancelled" | string;
  readonly sessionType: SessionType;
  readonly transcriptLines: TranscriptLine[];
  readonly suggestions: Suggestion[];
}

export interface StartSessionRequest {
  readonly patientId?: string;
  readonly sessionType?: SessionType;
}

export interface SessionSummary {
  readonly id: string;
  readonly patientId?: string;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly status: string;
  readonly sessionType: SessionType;
  readonly suggestionCount: number;
}

// SessionResponse is now an alias for Session
export type SessionResponse = Session;

export interface SuggestResponse {
  readonly sessionId: string;
  readonly suggestions: Suggestion[];
}

export interface KnowledgeSearchRequest {
  readonly query: string;
  readonly topK?: number;
  readonly minScore?: number;
}

export interface KnowledgeSearchResult {
  readonly chunkId: string;
  readonly documentName: string;
  readonly content: string;
  readonly category?: string;
  readonly score: number;
}

export interface KnowledgeSearchResponse {
  readonly query: string;
  readonly results: KnowledgeSearchResult[];
}

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

/** Tracks which stage of the AI pipeline is currently running. */
export type AgentStatus = "idle" | "thinking" | "tool-running" | "streaming" | "failed";

/* ── Enhancement Types ── */

export type ConfidenceLevel = "high" | "medium" | "low";

export interface SessionAnalyticsData {
  readonly durationSeconds: number;
  readonly transcriptLineCount: number;
  readonly suggestionsAccepted: number;
  readonly suggestionsDismissed: number;
  readonly suggestionsFlagged: number;
  readonly suggestionsTotal: number;
  readonly estimatedTimeSavedMinutes: number;
}

export interface VoiceCommand {
  readonly keyword: string;
  readonly description: string;
  readonly action: string;
}

export interface GetSessionsParams {
  readonly patientId?: string;
}

export interface ClaraPageContext {
  readonly type: "default" | "patient-detail" | "live-session" | "session-summary";
  readonly patientId?: string;
  readonly patientName?: string;
  readonly sessionId?: string;
}

export interface DiagnosisSlot {
  readonly code: string;
  readonly description: string;
  readonly searchQuery: string;
  readonly isDropdownOpen: boolean;
  readonly isManualEntry: boolean;
}

export interface PrescriptionDraft {
  readonly medicationName: string;
  readonly dosage: string;
  readonly frequency: string;
  readonly durationDays: string;
  readonly instructions: string;
}
