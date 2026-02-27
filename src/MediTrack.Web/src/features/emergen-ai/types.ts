export interface TranscriptLine {
  id: string;
  speaker: "Doctor" | "Patient";
  text: string;
  timestamp: string;
  confidence?: number;
}

export interface Suggestion {
  id: string;
  content: string;
  type: string;
  source: string;
  urgency?: string;
  confidence?: number;
  triggeredAt: string;
}

export interface Session {
  id: string;
  doctorId: string;
  patientId?: string;
  startedAt: string;
  endedAt?: string;
  status: "Active" | "Paused" | "Completed" | "Cancelled" | string;
  transcriptLines: TranscriptLine[];
  suggestions: Suggestion[];
}

export interface StartSessionRequest {
  patientId?: string;
}

// SessionResponse is now an alias for Session
export type SessionResponse = Session;

export interface SuggestResponse {
  sessionId: string;
  suggestions: Suggestion[];
}

export interface KnowledgeSearchRequest {
  query: string;
  topK?: number;
  minScore?: number;
}

export interface KnowledgeSearchResult {
  chunkId: string;
  documentName: string;
  content: string;
  category?: string;
  score: number;
}

export interface KnowledgeSearchResponse {
  query: string;
  results: KnowledgeSearchResult[];
}

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";
