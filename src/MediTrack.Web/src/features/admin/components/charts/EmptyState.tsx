import { Inbox } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface EmptyStateProps {
  readonly title?: string;
  readonly message?: string;
  readonly className?: string;
  readonly compact?: boolean;
}

export function EmptyState({
  title = "No data available",
  message = "No data for the selected period. Try adjusting the time range.",
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={clsxMerge(
        "flex flex-col items-center justify-center rounded-lg border border-border bg-card",
        compact ? "px-4 py-6" : "px-6 py-10",
        className
      )}
    >
      <Inbox className={clsxMerge("text-muted-foreground/50", compact ? "h-6 w-6" : "h-8 w-8")} />
      <p className={clsxMerge("mt-2 font-medium text-muted-foreground", compact ? "text-xs" : "text-sm")}>
        {title}
      </p>
      <p className={clsxMerge("mt-0.5 text-center text-muted-foreground/70", compact ? "text-[11px]" : "text-xs")}>
        {message}
      </p>
    </div>
  );
}
