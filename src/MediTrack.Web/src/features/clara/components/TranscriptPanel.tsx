import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, User, Stethoscope, AlertTriangle, Brain } from "lucide-react";
import type { TranscriptLine, VoiceCommand } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { VoiceCommandsTooltip } from "./VoiceCommandsTooltip";

/** Urgent medical keywords that trigger visual alerts. */
const URGENT_KEYWORDS = [
  "chest pain",
  "can't breathe",
  "severe bleeding",
  "unconscious",
  "allergic reaction",
  "seizure",
] as const;

type AudioQualityLevel = "good" | "fair" | "poor";

interface TranscriptPanelProps {
  readonly lines: TranscriptLine[];
  readonly isRecording: boolean;
  readonly className?: string;
  readonly onToggleRecording?: () => void;
  readonly onAskClara?: () => void;
  readonly isConnected?: boolean;
  readonly isRequestingSuggestions?: boolean;
  readonly speakerCorrections?: ReadonlyMap<string, "Doctor" | "Patient">;
  readonly onCorrectSpeaker?: (lineId: string, newSpeaker: "Doctor" | "Patient") => void;
  readonly audioQuality?: AudioQualityLevel;
  readonly voiceCommands?: readonly VoiceCommand[];
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
  speakerCorrections,
  onCorrectSpeaker,
  audioQuality = "good",
  voiceCommands,
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
        "flex flex-col bg-card rounded-lg border border-border shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary-700" />
          <h2 className="text-sm font-semibold text-foreground">Live Transcript</h2>
        </div>
        <div className="flex items-center gap-3">
          {isRecording && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-error-500" />
              </span>
              <span className="text-xs font-medium text-error-600">Recording</span>
            </div>
          )}
          {/* Audio Quality Indicator */}
          {isRecording && (
            <AudioQualityIndicator quality={audioQuality} />
          )}
        </div>
      </div>

      {/* Transcript lines */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {lines.length === 0 ? (
          <EmptyState isRecording={isRecording} />
        ) : (
          lines.map((line) => {
            const correctedSpeaker = speakerCorrections?.get(line.id);
            const effectiveSpeaker = correctedSpeaker ?? line.speaker;
            const hasUrgentKeyword = detectUrgentKeyword(line.text);

            return (
              <TranscriptLineItem
                key={line.id}
                line={line}
                effectiveSpeaker={effectiveSpeaker}
                hasUrgentKeyword={hasUrgentKeyword !== null}
                onCorrectSpeaker={onCorrectSpeaker}
              />
            );
          })
        )}
      </div>

      {/* Desktop action bar */}
      <div className="hidden items-center gap-3 border-t border-border px-4 py-3 lg:flex">
        {onToggleRecording && (
          <button
            type="button"
            onClick={onToggleRecording}
            disabled={!isConnected}
            className={clsxMerge(
              "flex h-10 w-10 items-center justify-center rounded-full transition-all",
              isRecording
                ? "bg-error-500 text-white shadow-md hover:bg-error-600"
                : "border border-border text-foreground/80 hover:bg-muted",
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
        {voiceCommands && voiceCommands.length > 0 && (
          <VoiceCommandsTooltip commands={voiceCommands} />
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
  readonly effectiveSpeaker: "Doctor" | "Patient";
  readonly hasUrgentKeyword: boolean;
  readonly onCorrectSpeaker?: (lineId: string, newSpeaker: "Doctor" | "Patient") => void;
}

function TranscriptLineItem({ line, effectiveSpeaker, hasUrgentKeyword, onCorrectSpeaker }: TranscriptLineItemProps) {
  const [showCorrectionFeedback, setShowCorrectionFeedback] = useState(false);
  const isDoctor = effectiveSpeaker === "Doctor";
  const Icon = isDoctor ? Stethoscope : User;

  const handleSpeakerClick = () => {
    if (!onCorrectSpeaker) return;
    const newSpeaker = isDoctor ? "Patient" : "Doctor";
    onCorrectSpeaker(line.id, newSpeaker);
    setShowCorrectionFeedback(true);
    setTimeout(() => setShowCorrectionFeedback(false), 2000);
  };

  return (
    <div
      className={clsxMerge(
        "flex gap-3 items-start rounded-md px-2 py-1 -mx-2",
        hasUrgentKeyword && "bg-error-50 border-l-4 border-l-error-500 pl-3"
      )}
    >
      {/* Speaker badge — clickable for correction */}
      <button
        type="button"
        onClick={handleSpeakerClick}
        title={`Click to change speaker to ${isDoctor ? "Patient" : "Doctor"}`}
        className={clsxMerge(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0 cursor-pointer transition-colors",
          isDoctor
            ? "bg-primary-100 text-primary-700 hover:bg-primary-200"
            : "bg-secondary-100 text-secondary-700 hover:bg-secondary-200"
        )}
      >
        <Icon className="h-3 w-3" />
        {effectiveSpeaker}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/80 leading-relaxed break-words">{line.text}</p>
        {line.confidence !== undefined && line.confidence < 0.8 && (
          <div className="flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3.5 h-3.5 text-warning-600 flex-shrink-0" />
            <span className="text-xs text-warning-600 font-medium">Low confidence</span>
          </div>
        )}
        {showCorrectionFeedback && (
          <span className="text-xs text-success-600 font-medium mt-0.5 inline-block">
            Speaker updated
          </span>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-xs text-muted-foreground flex-shrink-0 pt-0.5">
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
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Stethoscope className="h-6 w-6 text-muted-foreground/70" />
      </div>
      <p className="text-sm text-muted-foreground">
        {isRecording
          ? "Listening... speak to see the transcript"
          : "Start recording to see the transcript"}
      </p>
    </div>
  );
}

/* ── Audio Quality Indicator ────────────────────────── */

interface AudioQualityIndicatorProps {
  readonly quality: AudioQualityLevel;
}

function AudioQualityIndicator({ quality }: AudioQualityIndicatorProps) {
  const qualityConfig = {
    good: { color: "text-success-600", barColors: ["bg-success-500", "bg-success-500", "bg-success-500"], label: "Good" },
    fair: { color: "text-warning-600", barColors: ["bg-warning-500", "bg-warning-500", "bg-border"], label: "Fair" },
    poor: { color: "text-error-600", barColors: ["bg-error-500", "bg-border", "bg-border"], label: "Poor" },
  } as const;

  const config = qualityConfig[quality];

  return (
    <div className="flex items-center gap-1.5" title={`Audio quality: ${config.label}`}>
      <div className="flex items-end gap-0.5 h-3.5">
        <span className={clsxMerge("w-1 rounded-sm", config.barColors[0], "h-1.5")} />
        <span className={clsxMerge("w-1 rounded-sm", config.barColors[1], "h-2.5")} />
        <span className={clsxMerge("w-1 rounded-sm", config.barColors[2], "h-3.5")} />
      </div>
      {quality === "poor" && (
        <span className="text-[10px] font-medium text-error-600">Poor audio quality</span>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────── */

/**
 * Detects if text contains an urgent medical keyword.
 * Returns the first matched keyword or null.
 */
function detectUrgentKeyword(text: string): string | null {
  const lowerText = text.toLowerCase();
  for (const keyword of URGENT_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return keyword;
    }
  }
  return null;
}

/** Exported for use by parent components to scan transcript lines. */
export { detectUrgentKeyword, URGENT_KEYWORDS };
export type { AudioQualityLevel };

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
