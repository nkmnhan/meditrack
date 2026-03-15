// Components
export { SessionStartScreen } from "./components/SessionStartScreen";
export { LiveSessionView } from "./components/LiveSessionView";
export { TranscriptPanel } from "./components/TranscriptPanel";
export { SuggestionPanel } from "./components/SuggestionPanel";
export { DevPanel } from "./components/DevPanel";
export { SessionSummary } from "./components/SessionSummary";
export { NoteQualityIndicator } from "./components/NoteQualityIndicator";
export { SessionAnalytics } from "./components/SessionAnalytics";
export { PreviousSessionsList } from "./components/PreviousSessionsList";
export { VoiceCommandsTooltip } from "./components/VoiceCommandsTooltip";

// Hooks
export { useSession } from "./hooks/useSession";
export { useAudioRecording } from "./hooks/useAudioRecording";
export { useUndoHistory } from "./hooks/useUndoHistory";
export { useVoiceCommands } from "./hooks/useVoiceCommands";

// Store
export {
  claraApi,
  useStartSessionMutation,
  useGetSessionQuery,
  useGetSessionsByPatientQuery,
  useEndSessionMutation,
  useRequestSuggestionsMutation,
  useSearchKnowledgeMutation,
} from "./store/claraApi";

// Types
export type {
  TranscriptLine,
  Suggestion,
  Session,
  SessionResponse,
  StartSessionRequest,
  SuggestResponse,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  KnowledgeSearchResponse,
  ConnectionStatus,
  ConfidenceLevel,
  SessionAnalyticsData,
  VoiceCommand,
  GetSessionsParams,
  ClaraPageContext,
  DiagnosisSlot,
  PrescriptionDraft,
} from "./types";
