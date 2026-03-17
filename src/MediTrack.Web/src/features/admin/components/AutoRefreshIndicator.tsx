import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface AutoRefreshIndicatorProps {
  readonly pollingIntervalMs: number;
  readonly lastFetchTimestamp?: number;
  readonly isFetching?: boolean;
  readonly className?: string;
}

export function AutoRefreshIndicator({
  pollingIntervalMs,
  lastFetchTimestamp,
  isFetching = false,
  className,
}: AutoRefreshIndicatorProps) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!lastFetchTimestamp) return;

    const updateAge = () => {
      setSecondsAgo(Math.floor((Date.now() - lastFetchTimestamp) / 1000));
    };

    updateAge();
    const intervalId = setInterval(updateAge, 1000);
    return () => clearInterval(intervalId);
  }, [lastFetchTimestamp]);

  const intervalSeconds = Math.round(pollingIntervalMs / 1000);

  function formatAge(seconds: number): string {
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  }

  return (
    <div className={clsxMerge("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <RefreshCw
        className={clsxMerge(
          "h-3.5 w-3.5",
          isFetching && "animate-spin text-primary-600"
        )}
      />
      <span>
        {isFetching ? "Refreshing…" : `Updated ${formatAge(secondsAgo)}`}
      </span>
      <span className="hidden sm:inline text-muted-foreground/70">
        · auto-refresh every {intervalSeconds}s
      </span>
    </div>
  );
}
