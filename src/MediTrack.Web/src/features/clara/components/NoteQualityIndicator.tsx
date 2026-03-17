import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import type { ConfidenceLevel } from "../types";

interface NoteQualityIndicatorProps {
  readonly sectionConfidences: readonly ConfidenceLevel[];
}

const CONFIDENCE_SCORES: Record<ConfidenceLevel, number> = {
  high: 90,
  medium: 70,
  low: 40,
};

function computeOverallScore(confidences: readonly ConfidenceLevel[]): number {
  if (confidences.length === 0) return 0;
  const total = confidences.reduce(
    (sum, level) => sum + CONFIDENCE_SCORES[level],
    0,
  );
  return Math.round(total / confidences.length);
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "High Confidence";
  if (score >= 60) return "Medium Confidence";
  return "Low Confidence";
}

/**
 * Displays an overall note quality score based on per-section AI confidence levels.
 * Renders a horizontal progress bar with percentage and descriptive label.
 */
export function NoteQualityIndicator({ sectionConfidences }: NoteQualityIndicatorProps) {
  const score = computeOverallScore(sectionConfidences);
  const label = getScoreLabel(score);

  const barColor =
    score >= 80
      ? "bg-success-500"
      : score >= 60
        ? "bg-warning-500"
        : "bg-error-500";

  const textColor =
    score >= 80
      ? "text-success-700"
      : score >= 60
        ? "text-warning-700"
        : "text-error-700";

  const Icon =
    score >= 80
      ? ShieldCheck
      : score >= 60
        ? ShieldAlert
        : AlertTriangle;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
      <Icon className={clsxMerge("h-4 w-4 flex-shrink-0", textColor)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-foreground/80">
            Note Quality
          </span>
          <span className={clsxMerge("text-xs font-semibold", textColor)}>
            {score}% — {label}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className={clsxMerge("h-1.5 rounded-full transition-all", barColor)}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}
