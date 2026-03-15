import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { TranscriptLine, VoiceCommand } from "../types";

interface UseVoiceCommandsOptions {
  readonly transcriptLines: readonly TranscriptLine[];
  readonly isEnabled: boolean;
  readonly onFlagSuggestion?: () => void;
  readonly onEndSession?: () => void;
  readonly onRequestSuggestions?: () => void;
}

const VOICE_COMMANDS: VoiceCommand[] = [
  {
    keyword: "flag this",
    description: "Flag the last suggestion for review",
    action: "flagSuggestion",
  },
  {
    keyword: "next patient",
    description: "End current session (with confirmation)",
    action: "endSession",
  },
  {
    keyword: "summarize",
    description: "Request AI suggestions from Clara",
    action: "requestSuggestions",
  },
];

/**
 * Watches the latest transcript line for "Clara," prefix commands
 * spoken by the Doctor. Debounces by tracking processed line IDs.
 */
export function useVoiceCommands({
  transcriptLines,
  isEnabled,
  onFlagSuggestion,
  onEndSession,
  onRequestSuggestions,
}: UseVoiceCommandsOptions) {
  const processedLineIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isEnabled || transcriptLines.length === 0) return;

    const latestLine = transcriptLines[transcriptLines.length - 1];

    if (latestLine.speaker !== "Doctor") return;
    if (processedLineIdsRef.current.has(latestLine.id)) return;

    const lowerText = latestLine.text.toLowerCase().trim();
    if (!lowerText.startsWith("clara,") && !lowerText.startsWith("clara ")) return;

    const commandText = lowerText.replace(/^clara[, ]+/, "").trim();

    for (const command of VOICE_COMMANDS) {
      if (commandText.includes(command.keyword)) {
        processedLineIdsRef.current.add(latestLine.id);

        switch (command.action) {
          case "flagSuggestion":
            onFlagSuggestion?.();
            toast.info(`Voice command: ${command.description}`);
            break;
          case "endSession":
            onEndSession?.();
            toast.info(`Voice command: ${command.description}`);
            break;
          case "requestSuggestions":
            onRequestSuggestions?.();
            toast.info(`Voice command: ${command.description}`);
            break;
        }
        return;
      }
    }
  }, [transcriptLines, isEnabled, onFlagSuggestion, onEndSession, onRequestSuggestions]);

  return { voiceCommands: VOICE_COMMANDS };
}
