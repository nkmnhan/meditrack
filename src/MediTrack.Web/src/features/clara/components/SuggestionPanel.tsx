import { useState } from "react";
import { Lightbulb, AlertTriangle, BookOpen, Pill, Sparkles, FileText, Check, X, Flag } from "lucide-react";
import type { Suggestion } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";

type SuggestionAction = "accept" | "dismiss" | "flag";

interface SuggestionPanelProps {
  readonly suggestions: Suggestion[];
  readonly isLoading?: boolean;
  readonly count?: number;
  readonly className?: string;
  readonly onSuggestionAction?: (suggestionId: string, action: SuggestionAction) => void;
}

/**
 * Displays AI-generated suggestions during the session.
 * Categorizes by type (alert, medication, guideline, etc.)
 * Urgent suggestions appear first.
 * Supports accept/dismiss/flag actions on each suggestion.
 */
export function SuggestionPanel({
  suggestions,
  isLoading,
  count,
  className,
  onSuggestionAction,
}: SuggestionPanelProps) {
  const [actionsBysuggestionId, setActionsBySuggestionId] = useState<
    Map<string, SuggestionAction>
  >(new Map());

  const urgentSuggestions = suggestions.filter((suggestion) => suggestion.urgency === "high");
  const normalSuggestions = suggestions.filter((suggestion) => suggestion.urgency !== "high");

  function handleAction(suggestionId: string, action: SuggestionAction) {
    setActionsBySuggestionId((previous) => {
      const updated = new Map(previous);
      const currentAction = updated.get(suggestionId);

      if (currentAction === action) {
        // Toggle off — clicking same action again un-does it
        updated.delete(suggestionId);
      } else {
        updated.set(suggestionId, action);
      }

      return updated;
    });

    // Only notify parent when applying an action (not when toggling off)
    // Parent can track its own state if needed
    onSuggestionAction?.(suggestionId, action);
  }

  return (
    <div
      className={clsxMerge(
        "flex flex-col bg-card rounded-lg border border-border shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
        <Sparkles className="w-4 h-4 text-accent-500" />
        <h2 className="text-sm font-semibold text-foreground">Clara&apos;s Suggestions</h2>
        {count !== undefined && count > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-accent-100 text-accent-700 text-xs font-semibold h-5 w-5 ml-1">
            {count}
          </span>
        )}
        {isLoading && (
          <span className="ml-auto text-xs text-accent-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
            Analyzing...
          </span>
        )}
      </div>

      {/* Suggestions list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {suggestions.length === 0 && !isLoading ? (
          <EmptyState />
        ) : (
          <>
            {urgentSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                currentAction={actionsBysuggestionId.get(suggestion.id)}
                onAction={handleAction}
              />
            ))}
            {normalSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                currentAction={actionsBysuggestionId.get(suggestion.id)}
                onAction={handleAction}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Card ──────────────────────────────────────────────── */

interface SuggestionCardProps {
  readonly suggestion: Suggestion;
  readonly currentAction?: SuggestionAction;
  readonly onAction: (suggestionId: string, action: SuggestionAction) => void;
}

function SuggestionCard({ suggestion, currentAction, onAction }: SuggestionCardProps) {
  const config = getTypeConfig(suggestion.type, suggestion.urgency);
  const TypeIcon = config.icon;
  const isDismissed = currentAction === "dismiss";
  const isAccepted = currentAction === "accept";
  const isFlagged = currentAction === "flag";

  const barColorOverride = isAccepted
    ? "bg-success-500"
    : isFlagged
      ? "bg-warning-500"
      : config.barColor;

  const cardBackground = isAccepted
    ? "bg-success-50"
    : isFlagged
      ? "bg-warning-50"
      : "bg-card";

  return (
    <div
      className={clsxMerge(
        "flex rounded-lg border border-border overflow-hidden hover:shadow-sm transition-all",
        cardBackground,
        isDismissed && "opacity-50"
      )}
    >
      {/* Left colored bar */}
      <div className={clsxMerge("w-1 flex-shrink-0 transition-colors", barColorOverride)} />

      <div className="flex-1 p-4 min-w-0">
        {/* Type badge + timestamp */}
        <div className="flex items-center justify-between mb-2">
          <span
            className={clsxMerge(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
              config.badgeBg,
              config.badgeText
            )}
          >
            <TypeIcon className="w-3.5 h-3.5" />
            {capitalizeType(suggestion.type)}
            {suggestion.urgency === "high" && (
              <span className="ml-1 text-xs font-semibold">(Urgent)</span>
            )}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
            {formatTime(suggestion.triggeredAt)}
          </span>
        </div>

        {/* Content */}
        <p
          className={clsxMerge(
            "text-sm text-foreground/80 leading-relaxed",
            isDismissed && "line-through"
          )}
        >
          {suggestion.content}
        </p>

        {/* Source */}
        {suggestion.source && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3 w-3 flex-shrink-0" />
            <span>{suggestion.source}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Accept suggestion"
            title="Accept"
            onClick={() => onAction(suggestion.id, "accept")}
            className={clsxMerge(
              "inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors",
              isAccepted
                ? "bg-success-100 border-success-300 text-success-700"
                : "border-border text-muted-foreground/70 hover:text-success-600 hover:border-success-300 hover:bg-success-50"
            )}
          >
            <Check className="h-4 w-4" />
          </button>

          <button
            type="button"
            aria-label="Dismiss suggestion"
            title="Dismiss"
            onClick={() => onAction(suggestion.id, "dismiss")}
            className={clsxMerge(
              "inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors",
              isDismissed
                ? "bg-error-100 border-error-300 text-error-700"
                : "border-border text-muted-foreground/70 hover:text-error-600 hover:border-error-300 hover:bg-error-50"
            )}
          >
            <X className="h-4 w-4" />
          </button>

          <button
            type="button"
            aria-label="Flag suggestion for review"
            title="Flag for review"
            onClick={() => onAction(suggestion.id, "flag")}
            className={clsxMerge(
              "inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors",
              isFlagged
                ? "bg-warning-100 border-warning-300 text-warning-700"
                : "border-border text-muted-foreground/70 hover:text-warning-600 hover:border-warning-300 hover:bg-warning-50"
            )}
          >
            <Flag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Empty State ───────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Lightbulb className="h-6 w-6 text-muted-foreground/70" />
      </div>
      <p className="text-sm text-muted-foreground">
        AI suggestions will appear here as the conversation progresses
      </p>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────── */

interface TypeConfig {
  barColor: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ElementType;
}

function getTypeConfig(type: string, urgency?: string): TypeConfig {
  const isUrgent = urgency === "high";
  const normalized = type.toLowerCase();

  if (isUrgent || normalized === "alert" || normalized === "warning") {
    return {
      barColor: "bg-error-500",
      badgeBg: "bg-error-50",
      badgeText: "text-error-700",
      icon: AlertTriangle,
    };
  }

  switch (normalized) {
    case "medication":
    case "drug":
      return {
        barColor: "bg-secondary-700",
        badgeBg: "bg-secondary-50",
        badgeText: "text-secondary-700",
        icon: Pill,
      };
    case "guideline":
    case "reference":
      return {
        barColor: "bg-primary-700",
        badgeBg: "bg-primary-50",
        badgeText: "text-primary-700",
        icon: BookOpen,
      };
    default:
      return {
        barColor: "bg-warning-500",
        badgeBg: "bg-warning-50",
        badgeText: "text-warning-700",
        icon: Lightbulb,
      };
  }
}

function capitalizeType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

function formatTime(isoTimestamp: string): string {
  try {
    return new Date(isoTimestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

