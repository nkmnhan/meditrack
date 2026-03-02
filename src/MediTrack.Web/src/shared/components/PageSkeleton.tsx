export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-neutral-200" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-neutral-200" />
          <div className="h-3 w-32 rounded bg-neutral-200" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="h-10 w-full rounded-lg bg-neutral-200 sm:max-w-xs" />
          <div className="h-10 w-32 rounded-md bg-neutral-200" />
          <div className="h-10 w-32 rounded-md bg-neutral-200" />
        </div>
      </div>

      {/* Content cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-neutral-200 bg-white p-6"
          >
            <div className="space-y-3">
              <div className="h-4 w-3/4 rounded bg-neutral-200" />
              <div className="h-3 w-1/2 rounded bg-neutral-200" />
              <div className="h-3 w-full rounded bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
