import { Clock, MessageSquare, CheckCircle2, Timer } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import type { SessionAnalyticsData } from "../types";

interface SessionAnalyticsProps {
  readonly data: SessionAnalyticsData;
  readonly className?: string;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

/**
 * 4-card horizontal strip showing session ROI metrics:
 * Duration, Exchanges, Acceptance Rate, Estimated Time Saved.
 */
export function SessionAnalytics({ data, className }: SessionAnalyticsProps) {
  const acceptanceRate =
    data.suggestionsTotal > 0
      ? Math.round((data.suggestionsAccepted / data.suggestionsTotal) * 100)
      : 0;

  const cards = [
    {
      icon: Clock,
      label: "Duration",
      value: formatDuration(data.durationSeconds),
      iconColor: "text-primary-700",
    },
    {
      icon: MessageSquare,
      label: "Exchanges",
      value: String(data.transcriptLineCount),
      iconColor: "text-secondary-700",
    },
    {
      icon: CheckCircle2,
      label: "Acceptance Rate",
      value: `${acceptanceRate}%`,
      iconColor: "text-success-600",
    },
    {
      icon: Timer,
      label: "Est. Time Saved",
      value: `${data.estimatedTimeSavedMinutes} min`,
      iconColor: "text-accent-600",
    },
  ];

  return (
    <div
      className={clsxMerge(
        "grid grid-cols-2 gap-3 sm:grid-cols-4",
        className,
      )}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
        >
          <card.icon className={clsxMerge("h-5 w-5 flex-shrink-0", card.iconColor)} />
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground leading-tight">
              {card.value}
            </p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
