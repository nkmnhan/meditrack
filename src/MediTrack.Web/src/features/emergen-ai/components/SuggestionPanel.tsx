import { Lightbulb, AlertTriangle, BookOpen, Pill, Clock } from "lucide-react";
import type { Suggestion } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface SuggestionPanelProps {
  readonly suggestions: Suggestion[];
  readonly isLoading?: boolean;
  readonly className?: string;
}

/**
 * Displays AI-generated suggestions during the session.
 * Categorizes by type (alert, medication, guideline, etc.)
 */
export function SuggestionPanel({
  suggestions,
  isLoading,
  className,
}: SuggestionPanelProps) {
  // Group suggestions by urgency for better organization
  const urgentSuggestions = suggestions.filter((suggestion) => suggestion.urgency === "high");
  const normalSuggestions = suggestions.filter((suggestion) => suggestion.urgency !== "high");

  return (
    <div
      className={clsxMerge(
        "flex flex-col h-full bg-white rounded-lg border border-neutral-200 shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
        <h2 className="text-sm font-semibold text-neutral-900">
          AI Suggestions
        </h2>
        {isLoading && (
          <span className="text-xs text-primary-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            Analyzing...
          </span>
        )}
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {suggestions.length === 0 && !isLoading ? (
          <EmptyState />
        ) : (
          <>
            {/* Urgent suggestions first */}
            {urgentSuggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
            {/* Then normal suggestions */}
            {normalSuggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

interface SuggestionCardProps {
  readonly suggestion: Suggestion;
}

function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const { icon, bgColor, borderColor, textColor } = getTypeStyles(suggestion.type, suggestion.urgency);

  return (
    <div
      className={clsxMerge(
        "p-3 rounded-lg border-l-4",
        bgColor,
        borderColor
      )}
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        <div className={clsxMerge("flex-shrink-0 mt-0.5", textColor)}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsxMerge("text-xs font-medium uppercase", textColor)}>
              {suggestion.type}
            </span>
            {suggestion.urgency === "high" && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-error-100 text-error-700 font-medium">
                Urgent
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-800">{suggestion.content}</p>

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
            {suggestion.source && (
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {suggestion.source}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(suggestion.triggeredAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8">
      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
        <Lightbulb className="h-6 w-6 text-neutral-400" />
      </div>
      <p className="text-sm text-neutral-500">
        AI suggestions will appear here as the conversation progresses
      </p>
    </div>
  );
}

interface TypeStyles {
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

function getTypeStyles(type: string, urgency?: string): TypeStyles {
  const isUrgent = urgency === "high";

  switch (type.toLowerCase()) {
    case "alert":
    case "warning":
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        bgColor: isUrgent ? "bg-error-50" : "bg-warning-50",
        borderColor: isUrgent ? "border-error-500" : "border-warning-500",
        textColor: isUrgent ? "text-error-700" : "text-warning-700",
      };
    case "medication":
    case "drug":
      return {
        icon: <Pill className="h-4 w-4" />,
        bgColor: "bg-secondary-50",
        borderColor: "border-secondary-500",
        textColor: "text-secondary-700",
      };
    case "guideline":
    case "reference":
      return {
        icon: <BookOpen className="h-4 w-4" />,
        bgColor: "bg-info-50",
        borderColor: "border-info-500",
        textColor: "text-info-700",
      };
    default:
      return {
        icon: <Lightbulb className="h-4 w-4" />,
        bgColor: "bg-primary-50",
        borderColor: "border-primary-500",
        textColor: "text-primary-700",
      };
  }
}

function formatTime(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
