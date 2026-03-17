import { clsxMerge } from "@/shared/utils/clsxMerge";

interface ChartSkeletonProps {
  readonly height?: number;
  readonly className?: string;
}

export function ChartSkeleton({ height = 280, className }: ChartSkeletonProps) {
  return (
    <div
      className={clsxMerge(
        "animate-pulse rounded-lg border border-border bg-card p-5 shadow-sm",
        className
      )}
    >
      {/* Title */}
      <div className="mb-4 space-y-1.5">
        <div className="h-4 w-32 rounded bg-border" />
        <div className="h-3 w-48 rounded bg-muted" />
      </div>

      {/* Chart area placeholder */}
      <div
        className="flex items-end gap-1.5 rounded-md bg-muted px-4 pb-4 pt-6"
        style={{ height }}
      >
        {/* Simulated bars/lines */}
        <div className="h-[40%] flex-1 rounded-sm bg-border" />
        <div className="h-[65%] flex-1 rounded-sm bg-border" />
        <div className="h-[50%] flex-1 rounded-sm bg-border" />
        <div className="h-[80%] flex-1 rounded-sm bg-border" />
        <div className="h-[55%] flex-1 rounded-sm bg-border" />
        <div className="h-[70%] flex-1 rounded-sm bg-border" />
        <div className="h-[45%] flex-1 rounded-sm bg-border" />
        <div className="h-[60%] flex-1 rounded-sm bg-border" />
      </div>
    </div>
  );
}

export function MetricCardSkeleton({ className }: { readonly className?: string }) {
  return (
    <div
      className={clsxMerge(
        "animate-pulse rounded-lg border border-border bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="h-3.5 w-24 rounded bg-border" />
        <div className="h-9 w-9 rounded-lg bg-muted" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-7 w-20 rounded bg-border" />
        <div className="h-3 w-28 rounded bg-muted" />
      </div>
    </div>
  );
}

export function PieChartSkeleton({ height = 280, className }: ChartSkeletonProps) {
  const radius = Math.min(height / 2 - 40, 100);
  return (
    <div
      className={clsxMerge(
        "animate-pulse rounded-lg border border-border bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="mb-4 space-y-1.5">
        <div className="h-4 w-28 rounded bg-border" />
        <div className="h-3 w-40 rounded bg-muted" />
      </div>
      <div className="flex items-center justify-center" style={{ height }}>
        <div
          className="rounded-full bg-border"
          style={{ width: radius * 2, height: radius * 2 }}
        />
      </div>
    </div>
  );
}

export function InfraCardSkeleton({ className }: { readonly className?: string }) {
  return (
    <div
      className={clsxMerge(
        "animate-pulse rounded-lg border border-border bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="h-4 w-24 rounded bg-border" />
      <div className="mt-3 space-y-3">
        <div className="flex justify-between">
          <div className="h-3.5 w-20 rounded bg-muted" />
          <div className="h-3.5 w-12 rounded bg-border" />
        </div>
        <div className="flex justify-between">
          <div className="h-3.5 w-24 rounded bg-muted" />
          <div className="h-3.5 w-16 rounded bg-border" />
        </div>
        <div className="flex justify-between">
          <div className="h-3.5 w-20 rounded bg-muted" />
          <div className="h-3.5 w-10 rounded bg-border" />
        </div>
      </div>
    </div>
  );
}
