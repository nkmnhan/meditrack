import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Mic,
  MicOff,
  Square,
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle,
  Brain,
} from "lucide-react";
import { useSession } from "../hooks/useSession";
import { useAudioRecording } from "../hooks/useAudioRecording";
import { useRequestSuggestionsMutation } from "../store/claraApi";
import { TranscriptPanel } from "./TranscriptPanel";
import { SuggestionPanel } from "./SuggestionPanel";
import { clsxMerge } from "@/shared/utils/clsxMerge";

/**
 * Main view for an active Clara session.
 * Shows live transcript and AI suggestions side-by-side.
 */
export function LiveSessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const [requestSuggestions, { isLoading: isRequestingSuggestions }] =
    useRequestSuggestionsMutation();

  // Session management via SignalR
  const {
    connectionStatus,
    transcriptLines,
    suggestions,
    sendAudioChunk,
    endSession,
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
      await endSession();
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
    <div className="flex flex-col h-full bg-neutral-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-3 bg-white border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-neutral-900">
            Session Active
          </h1>
          <ConnectionIndicator status={connectionStatus} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Request Suggestions Button */}
          <button
            type="button"
            onClick={handleRequestSuggestions}
            disabled={!isConnected || isRequestingSuggestions}
            className={clsxMerge(
              "h-10 px-4 rounded-lg text-sm font-medium",
              "bg-secondary-100 text-secondary-700 hover:bg-secondary-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center gap-2"
            )}
          >
            {isRequestingSuggestions ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            Get Suggestions
          </button>

          {/* Recording Toggle */}
          <button
            type="button"
            onClick={handleToggleRecording}
            disabled={!isConnected || !isAudioSupported}
            className={clsxMerge(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              isRecording
                ? "bg-error-100 text-error-700 hover:bg-error-200"
                : "bg-primary-100 text-primary-700 hover:bg-primary-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title={isRecording ? "Pause recording" : "Start recording"}
          >
            {isRecording ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>

          {/* End Session Button */}
          <button
            type="button"
            onClick={handleEndSession}
            className={clsxMerge(
              "h-10 px-4 rounded-lg text-sm font-medium",
              "bg-error-600 text-white hover:bg-error-700",
              "flex items-center gap-2"
            )}
          >
            <Square className="h-4 w-4" />
            End Session
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-error-50 text-error-700 text-sm">
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

      {/* Connecting Overlay */}
      {isConnecting && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-info-50 text-info-700 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            {connectionStatus === "reconnecting"
              ? "Reconnecting..."
              : "Connecting to session..."}
          </span>
        </div>
      )}

      {/* Main Content - Responsive Layout */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Transcript Panel */}
          <TranscriptPanel
            lines={transcriptLines}
            isRecording={isRecording}
            className="h-full min-h-[300px] lg:min-h-0"
          />

          {/* Suggestions Panel */}
          <SuggestionPanel
            suggestions={suggestions}
            isLoading={isRequestingSuggestions}
            className="h-full min-h-[300px] lg:min-h-0"
          />
        </div>
      </div>
    </div>
  );
}

interface ConnectionIndicatorProps {
  readonly status: "connecting" | "connected" | "reconnecting" | "disconnected";
}

function ConnectionIndicator({ status }: ConnectionIndicatorProps) {
  const configs = {
    connected: {
      icon: <Wifi className="h-4 w-4" />,
      text: "Connected",
      className: "text-success-600 bg-success-50",
    },
    connecting: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      text: "Connecting",
      className: "text-info-600 bg-info-50",
    },
    reconnecting: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      text: "Reconnecting",
      className: "text-warning-600 bg-warning-50",
    },
    disconnected: {
      icon: <WifiOff className="h-4 w-4" />,
      text: "Disconnected",
      className: "text-error-600 bg-error-50",
    },
  };

  const config = configs[status];

  return (
    <span
      className={clsxMerge(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        config.className
      )}
    >
      {config.icon}
      {config.text}
    </span>
  );
}
