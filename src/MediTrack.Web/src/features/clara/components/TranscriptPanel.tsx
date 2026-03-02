import { useEffect, useRef } from "react";
import { Mic, MicOff, User, Stethoscope, AlertTriangle, Brain } from "lucide-react";
import type { TranscriptLine } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface TranscriptPanelProps {
  readonly lines: TranscriptLine[];
  readonly isRecording: boolean;
  readonly className?: string;
  readonly onToggleRecording?: () => void;
  readonly onAskClara?: () => void;
  readonly isConnected?: boolean;
  readonly isRequestingSuggestions?: boolean;
}

/**
 * Displays the real-time transcript of the conversation.
 * Auto-scrolls to the latest line when new content arrives.
 */
export function TranscriptPanel({
  lines,
  isRecording,
  className,
  onToggleRecording,
  onAskClara,
  isConnected,
  isRequestingSuggestions,
}: TranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [lines]);

  return (
    <div
      className={clsxMerge(
        "flex flex-col bg-white rounded-lg border border-neutral-200 shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary-700" />
          <h2 className="text-sm font-semibold text-neutral-900">Live Transcript</h2>
        </div>
        {isRecording && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-error-500" />
            </span>
            <span className="text-xs font-medium text-error-600">Recording</span>
          </div>
        )}
      </div>

      {/* Transcript lines */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {lines.length === 0 ? (
          <EmptyState isRecording={isRecording} />
        ) : (
          lines.map((line) => (
            <TranscriptLineItem key={line.id} line={line} />
          ))
        )}
      </div>

      {/* Desktop action bar */}
      <div className="hidden items-center gap-3 border-t border-neutral-200 px-4 py-3 lg:flex">
        {onToggleRecording && (
          <button
            type="button"
            onClick={onToggleRecording}
            disabled={!isConnected}
            className={clsxMerge(
              "flex h-10 w-10 items-center justify-center rounded-full transition-all",
              isRecording
                ? "bg-error-500 text-white shadow-md hover:bg-error-600"
                : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50",
              "disabled:opacity-50"
            )}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        )}
        {onAskClara && (
          <button
            type="button"
            onClick={onAskClara}
            disabled={!isConnected || isRequestingSuggestions}
            className={clsxMerge(
              "inline-flex h-10 items-center gap-2 rounded-lg px-4",
              "bg-accent-600 text-sm font-medium text-white",
              "transition-colors hover:bg-accent-700",
              "disabled:opacity-50"
            )}
          >
            <Brain className="h-4 w-4" />
            Ask Clara
          </button>
        )}
        {isRecording && (
          <span className="text-sm font-medium text-accent-700">Clara is listening...</span>
        )}
      </div>
    </div>
  );
}

/* ── TranscriptLine Item ─────────────────────────────── */

interface TranscriptLineItemProps {
  readonly line: TranscriptLine;
}

function TranscriptLineItem({ line }: TranscriptLineItemProps) {
  const isDoctor = line.speaker === "Doctor";
  const Icon = isDoctor ? Stethoscope : User;

  return (
    <div className="flex gap-3 items-start">
      {/* Speaker badge */}
      <span
        className={clsxMerge(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0",
          isDoctor
            ? "bg-primary-100 text-primary-700"
            : "bg-secondary-100 text-secondary-700"
        )}
      >
        <Icon className="h-3 w-3" />
        {line.speaker}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-700 leading-relaxed break-words">{line.text}</p>
        {line.confidence !== undefined && line.confidence < 0.8 && (
          <div className="flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3.5 h-3.5 text-warning-600 flex-shrink-0" />
            <span className="text-xs text-warning-600 font-medium">Low confidence</span>
          </div>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-xs text-neutral-500 flex-shrink-0 pt-0.5">
        {formatTimestamp(line.timestamp)}
      </span>
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────── */

interface EmptyStateProps {
  readonly isRecording: boolean;
}

function EmptyState({ isRecording }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8">
      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
        <Stethoscope className="h-6 w-6 text-neutral-400" />
      </div>
      <p className="text-sm text-neutral-500">
        {isRecording
          ? "Listening... speak to see the transcript"
          : "Start recording to see the transcript"}
      </p>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────── */

function formatTimestamp(isoTimestamp: string): string {
  try {
    return new Date(isoTimestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
