import { Lightbulb, AlertTriangle, BookOpen, Pill, Sparkles } from "lucide-react";
import type { Suggestion } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface SuggestionPanelProps {
  readonly suggestions: Suggestion[];
  readonly isLoading?: boolean;
  readonly count?: number;
  readonly className?: string;
}

/**
 * Displays AI-generated suggestions during the session.
 * Categorizes by type (alert, medication, guideline, etc.)
 * Urgent suggestions appear first.
 */
export function SuggestionPanel({
  suggestions,
  isLoading,
  count,
  className,
}: SuggestionPanelProps) {
  const urgentSuggestions = suggestions.filter((suggestion) => suggestion.urgency === "high");
  const normalSuggestions = suggestions.filter((suggestion) => suggestion.urgency !== "high");

  return (
    <div
      className={clsxMerge(
        "flex flex-col bg-white rounded-lg border border-neutral-200 shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 flex-shrink-0">
        <Sparkles className="w-4 h-4 text-accent-500" />
        <h2 className="text-sm font-semibold text-neutral-900">Clara&apos;s Suggestions</h2>
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
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
            {normalSuggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
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
}

function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const config = getTypeConfig(suggestion.type, suggestion.urgency);
  const TypeIcon = config.icon;

  return (
    <div className="flex rounded-lg border border-neutral-200 overflow-hidden bg-white hover:shadow-sm transition-shadow">
      {/* Left colored bar */}
      <div className={clsxMerge("w-1 flex-shrink-0", config.barColor)} />

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
          <span className="text-xs text-neutral-500 flex-shrink-0 ml-2">
            {formatTime(suggestion.triggeredAt)}
          </span>
        </div>

        {/* Content */}
        <p className="text-sm text-neutral-700 leading-relaxed">{suggestion.content}</p>

        {/* Source */}
        {suggestion.source && (
          <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
            <BookOpen className="w-3 h-3 flex-shrink-0" />
            {suggestion.source}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Empty State ───────────────────────────────────────── */

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

