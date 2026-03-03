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
        "flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white",
        compact ? "px-4 py-6" : "px-6 py-10",
        className
      )}
    >
      <Inbox className={clsxMerge("text-neutral-300", compact ? "h-6 w-6" : "h-8 w-8")} />
      <p className={clsxMerge("mt-2 font-medium text-neutral-500", compact ? "text-xs" : "text-sm")}>
        {title}
      </p>
      <p className={clsxMerge("mt-0.5 text-center text-neutral-400", compact ? "text-[11px]" : "text-xs")}>
        {message}
      </p>
    </div>
  );
}
