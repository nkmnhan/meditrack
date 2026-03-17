import { useState } from "react";
import { HelpCircle, Mic } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import type { VoiceCommand } from "../types";

interface VoiceCommandsTooltipProps {
  readonly commands: readonly VoiceCommand[];
  readonly className?: string;
}

/**
 * Popover listing available voice commands with their trigger phrases.
 * Triggered by a HelpCircle icon button in the TranscriptPanel action bar.
 */
export function VoiceCommandsTooltip({ commands, className }: VoiceCommandsTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={clsxMerge("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground/80 transition-colors"
        aria-label="Voice commands help"
        title="Voice commands"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-30 w-72 rounded-lg border border-border bg-card p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Mic className="h-4 w-4 text-accent-600" />
            <h4 className="text-sm font-semibold text-foreground">
              Voice Commands
            </h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Say &ldquo;Clara,&rdquo; followed by a command during recording:
          </p>
          <div className="space-y-2">
            {commands.map((command) => (
              <div
                key={command.keyword}
                className="flex items-start gap-2.5 rounded-md bg-muted px-3 py-2"
              >
                <span className="inline-flex flex-shrink-0 rounded bg-accent-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-accent-700">
                  &ldquo;{command.keyword}&rdquo;
                </span>
                <span className="text-xs text-muted-foreground">{command.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
