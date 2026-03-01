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
