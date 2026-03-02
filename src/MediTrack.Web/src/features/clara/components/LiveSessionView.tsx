import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Mic,
  MicOff,
  Square,
  Loader2,
  AlertCircle,
  Brain,
  ChevronLeft,
  Clock,
  Sparkles,
} from "lucide-react";
import { useSession } from "../hooks/useSession";
import { useAudioRecording } from "../hooks/useAudioRecording";
import { useEndSessionMutation, useRequestSuggestionsMutation } from "../store/claraApi";
import { TranscriptPanel } from "./TranscriptPanel";
import { SuggestionPanel } from "./SuggestionPanel";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import type { ConnectionStatus } from "../types";

type ActiveTab = "transcript" | "suggestions";

/**
 * Main view for an active Clara session.
 * Shows live transcript and AI suggestions side-by-side on desktop,
 * with tab switching on mobile.
 */
export function LiveSessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("transcript");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [requestSuggestions, { isLoading: isRequestingSuggestions }] =
    useRequestSuggestionsMutation();
  const [endSessionMutation] = useEndSessionMutation();

  // Count-up timer from session start
  useEffect(() => {
    const intervalId = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const formattedTimer = [
    String(Math.floor(elapsedSeconds / 60)).padStart(2, "0"),
    String(elapsedSeconds % 60).padStart(2, "0"),
  ].join(":");

  // Short session ID for display — first 8 chars uppercased
  const shortSessionId = sessionId
    ? `#${sessionId.slice(0, 8).toUpperCase()}`
    : "#---";

  // Session management via SignalR
  const {
    connectionStatus,
    transcriptLines,
    suggestions,
    sendAudioChunk,
  } = useSession({
    sessionId: sessionId ?? "",
    onError: (sessionError) => {
      setError(sessionError.message);
    },
  });

  // Audio recording
  async function handleAudioChunk(data: ArrayBuffer) {
    try {
      await sendAudioChunk(data);
    } catch (chunkError) {
      console.error("Failed to send audio chunk:", chunkError);
    }
  }

  const {
    isRecording,
    isSupported: isAudioSupported,
    startRecording,
    stopRecording,
  } = useAudioRecording({
    onAudioChunk: handleAudioChunk,
    onError: (audioError) => {
      setError(audioError.message);
    },
  });

  const isConnected = connectionStatus === "connected";
  const isConnecting =
    connectionStatus === "connecting" || connectionStatus === "reconnecting";

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm("Are you sure you want to end this session? This action cannot be undone.")) {
      return;
    }
    try {
      stopRecording();
      if (sessionId) {
        await endSessionMutation(sessionId).unwrap();
      }
      navigate("/clara");
    } catch (endError) {
      console.error("Failed to end session:", endError);
      setError("Failed to end session");
    }
  };

  const handleRequestSuggestions = async () => {
    if (!sessionId) return;
    try {
      await requestSuggestions(sessionId).unwrap();
    } catch (suggestionError) {
      console.error("Failed to request suggestions:", suggestionError);
    }
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-neutral-500">Invalid session</p>
      </div>
    );
  }

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 flex flex-col bg-neutral-50">
      {/* ── Top Bar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white shadow-sm flex items-center justify-between h-14 px-4 flex-shrink-0 border-b border-neutral-200">
        {/* Left: Back + session ID */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/clara")}
            className="p-2 -ml-2 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="Back to Clara"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-mono text-sm text-neutral-900 hidden sm:inline">
            Session {shortSessionId}
          </span>
          <span className="font-mono text-sm text-neutral-900 sm:hidden">
            {shortSessionId}
          </span>
        </div>

        {/* Center: Animated connection status */}
        <ConnectionDot status={connectionStatus} />

        {/* Right: Timer + End Session */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-neutral-700">
            <Clock className="w-4 h-4 text-neutral-500" />
            <span className="font-mono text-sm font-medium">{formattedTimer}</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-accent-700">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium">Clara</span>
          </div>
          <button
            type="button"
            onClick={handleEndSession}
            className="h-10 px-3 rounded-lg border border-error-500 text-error-600 text-sm font-medium hover:bg-error-50 transition-colors inline-flex items-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">End Session</span>
          </button>
        </div>
      </header>

      {/* ── Error Banner ─────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-error-50 text-error-700 text-sm flex-shrink-0">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-error-600 hover:text-error-800 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Connecting Banner ────────────────────────────── */}
      {isConnecting && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-info-50 text-info-700 text-sm flex-shrink-0">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            {connectionStatus === "reconnecting"
              ? "Reconnecting..."
              : "Connecting to session..."}
          </span>
        </div>
      )}

      {/* ── Mobile Tab Toggle ────────────────────────────── */}
      <div className="lg:hidden flex items-center bg-white border-b border-neutral-200 px-4 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("transcript")}
          className={clsxMerge(
            "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors",
            activeTab === "transcript"
              ? "border-accent-500 text-accent-700"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          )}
        >
          Transcript
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("suggestions")}
          className={clsxMerge(
            "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors inline-flex items-center justify-center gap-2",
            activeTab === "suggestions"
              ? "border-accent-500 text-accent-700"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          )}
        >
          Clara&apos;s Notes
          {suggestions.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-accent-100 text-accent-700 text-xs font-semibold h-5 w-5">
              {suggestions.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Main Content ─────────────────────────────────── */}
      <main className="overflow-auto lg:overflow-hidden p-4 lg:p-6 pb-24 lg:pb-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Transcript Panel */}
          <TranscriptPanel
            lines={transcriptLines}
            isRecording={isRecording}
            onToggleRecording={handleToggleRecording}
            onAskClara={handleRequestSuggestions}
            isConnected={isConnected}
            isRequestingSuggestions={isRequestingSuggestions}
            className={clsxMerge(
              "lg:w-[60%] min-h-[65vh] lg:min-h-[calc(100dvh-12rem)]",
              activeTab !== "transcript" ? "hidden lg:flex" : ""
            )}
          />

          {/* Suggestions Panel */}
          <SuggestionPanel
            suggestions={suggestions}
            isLoading={isRequestingSuggestions}
            count={suggestions.length}
            className={clsxMerge(
              "lg:w-[40%] min-h-[65vh] lg:min-h-[calc(100dvh-12rem)]",
              activeTab !== "suggestions" ? "hidden lg:flex" : ""
            )}
          />
        </div>
      </main>

      {/* ── Desktop Action Bar (inside transcript panel, bottom) ── */}
      {/* Handled by panel internally via isRecording state */}

      {/* ── Mobile Floating Actions ──────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-3 z-40 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleRequestSuggestions}
          disabled={!isConnected || isRequestingSuggestions}
          className="h-10 px-4 rounded-lg bg-accent-700 text-white text-sm font-medium hover:bg-accent-600 transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRequestingSuggestions ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Brain className="w-4 h-4" />
          )}
          Ask Clara
        </button>

        <button
          type="button"
          onClick={handleToggleRecording}
          disabled={!isConnected || !isAudioSupported}
          aria-label={isRecording ? "Mute microphone" : "Unmute microphone"}
          className={clsxMerge(
            "h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all flex-shrink-0",
            isRecording
              ? "bg-accent-500 text-white ring-4 ring-accent-500/20"
              : "bg-neutral-200 text-neutral-700",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isRecording ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>

        {isRecording ? (
          <span className="text-xs text-accent-700 font-medium w-16">Listening...</span>
        ) : (
          <span className="w-16" />
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────── */

interface ConnectionDotProps {
  readonly status: ConnectionStatus;
}

function ConnectionDot({ status }: ConnectionDotProps) {
  const dotColor =
    status === "connected"
      ? "bg-success-500"
      : status === "connecting" || status === "reconnecting"
        ? "bg-warning-500"
        : "bg-error-500";

  const labelColor =
    status === "connected"
      ? "text-success-600"
      : status === "connecting" || status === "reconnecting"
        ? "text-warning-600"
        : "text-error-600";

  const label =
    status === "connected"
      ? "Connected"
      : status === "connecting"
        ? "Connecting"
        : status === "reconnecting"
          ? "Reconnecting"
          : "Disconnected";

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={clsxMerge(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            dotColor
          )}
        />
        <span
          className={clsxMerge(
            "relative inline-flex rounded-full h-2.5 w-2.5",
            dotColor
          )}
        />
      </span>
      <span className={clsxMerge("text-sm font-medium hidden sm:inline", labelColor)}>
        {label}
      </span>
    </div>
  );
}
