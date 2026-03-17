import { Link } from "react-router-dom";
import { Clock, Sparkles, FileText, Loader2 } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useGetSessionsByPatientQuery } from "../store/claraApi";
import type { SessionType } from "../types";

interface PreviousSessionsListProps {
  readonly patientId: string;
  readonly currentSessionId?: string;
  readonly className?: string;
}

const SESSION_TYPE_COLORS: Record<SessionType, string> = {
  Consultation: "bg-primary-50 text-primary-700",
  "Follow-up": "bg-secondary-50 text-secondary-700",
  Review: "bg-accent-50 text-accent-700",
};

function formatShortDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function formatDuration(startedAt: string, endedAt?: string): string {
  if (!endedAt) return "In progress";
  const durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const minutes = Math.round(durationMs / 60_000);
  return `${minutes} min`;
}

/**
 * Shows the last 3 sessions for a given patient, excluding the current session.
 * Each item links to the session summary page.
 */
export function PreviousSessionsList({
  patientId,
  currentSessionId,
  className,
}: PreviousSessionsListProps) {
  const { data: sessions, isLoading } = useGetSessionsByPatientQuery(
    { patientId },
    { skip: !patientId },
  );

  const filteredSessions = (sessions ?? [])
    .filter((session) => session.id !== currentSessionId)
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className={clsxMerge("flex items-center justify-center py-4", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  if (filteredSessions.length === 0) {
    return (
      <div className={clsxMerge("py-3", className)}>
        <p className="text-xs text-muted-foreground/70 italic">No previous sessions</p>
      </div>
    );
  }

  return (
    <div className={clsxMerge("space-y-2", className)}>
      {filteredSessions.map((session) => (
        <Link
          key={session.id}
          to={`/clara/session/${session.id}/summary`}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary-200 hover:bg-primary-50/50 transition-colors"
        >
          <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground/80">
                {formatShortDate(session.startedAt)}
              </span>
              <span
                className={clsxMerge(
                  "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  SESSION_TYPE_COLORS[session.sessionType] ?? "bg-muted text-muted-foreground",
                )}
              >
                {session.sessionType}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
                <Clock className="h-3 w-3" />
                {formatDuration(session.startedAt, session.endedAt)}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
                <Sparkles className="h-3 w-3" />
                {session.suggestionCount} suggestions
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
