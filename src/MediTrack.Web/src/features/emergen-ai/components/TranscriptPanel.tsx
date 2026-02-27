import { useEffect, useRef } from "react";
import { User, Stethoscope } from "lucide-react";
import type { TranscriptLine } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface TranscriptPanelProps {
  readonly lines: TranscriptLine[];
  readonly isRecording: boolean;
  readonly className?: string;
}

/**
 * Displays the real-time transcript of the conversation.
 * Auto-scrolls to the latest line when new content arrives.
 */
export function TranscriptPanel({
  lines,
  isRecording,
  className,
}: TranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      className={clsxMerge(
        "flex flex-col h-full bg-white rounded-lg border border-neutral-200 shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
        <h2 className="text-sm font-semibold text-neutral-900">Transcript</h2>
        {isRecording && (
          <span className="flex items-center gap-1.5 text-xs text-error-600">
            <span className="w-2 h-2 rounded-full bg-error-500 animate-pulse" />
            Recording
          </span>
        )}
      </div>

      {/* Transcript Lines */}
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
    </div>
  );
}

interface TranscriptLineItemProps {
  readonly line: TranscriptLine;
}

function TranscriptLineItem({ line }: TranscriptLineItemProps) {
  const isDoctor = line.speaker === "Doctor";
  const Icon = isDoctor ? Stethoscope : User;

  return (
    <div
      className={clsxMerge(
        "flex gap-3 p-3 rounded-lg",
        isDoctor ? "bg-primary-50" : "bg-neutral-50"
      )}
    >
      {/* Speaker Icon */}
      <div
        className={clsxMerge(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isDoctor ? "bg-primary-100 text-primary-700" : "bg-neutral-200 text-neutral-600"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span
            className={clsxMerge(
              "text-xs font-medium",
              isDoctor ? "text-primary-700" : "text-neutral-700"
            )}
          >
            {line.speaker}
          </span>
          <span className="text-xs text-neutral-400">
            {formatTimestamp(line.timestamp)}
          </span>
          {line.confidence !== undefined && line.confidence < 0.8 && (
            <span className="text-xs text-warning-600" title="Low confidence">
              ⚠
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-800 break-words">{line.text}</p>
      </div>
    </div>
  );
}

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

/**
 * Format ISO timestamp to human-readable time
 */
function formatTimestamp(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
