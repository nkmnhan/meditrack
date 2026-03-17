import { AlertCircle, RefreshCw } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface ErrorStateProps {
  readonly title?: string;
  readonly message?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
  readonly compact?: boolean;
}

export function ErrorState({
  title = "Failed to load data",
  message = "Something went wrong. Please try again.",
  onRetry,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={clsxMerge(
        "flex flex-col items-center justify-center rounded-lg border border-error-200 bg-error-50",
        compact ? "px-4 py-6" : "px-6 py-10",
        className
      )}
    >
      <AlertCircle className={clsxMerge("text-error-500", compact ? "h-6 w-6" : "h-8 w-8")} />
      <p className={clsxMerge("mt-2 font-semibold text-error-700", compact ? "text-xs" : "text-sm")}>
        {title}
      </p>
      <p className={clsxMerge("mt-0.5 text-center text-error-600", compact ? "text-[11px]" : "text-xs")}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className={clsxMerge(
            "mt-3 inline-flex items-center gap-1.5 rounded-md border border-error-300 bg-card font-medium text-error-700",
            "transition-colors hover:bg-error-50",
            compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
