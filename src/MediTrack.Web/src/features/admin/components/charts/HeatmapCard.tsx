import { clsxMerge } from "@/shared/utils/clsxMerge";

interface HeatmapDataPoint {
  readonly hour: number;
  readonly count: number;
}

interface HeatmapCardProps {
  readonly title: string;
  readonly description?: string;
  readonly data: HeatmapDataPoint[];
  readonly className?: string;
}

function getIntensityClass(count: number, maxCount: number): string {
  if (maxCount === 0) return "bg-muted";

  const ratio = count / maxCount;
  if (ratio === 0) return "bg-muted";
  if (ratio < 0.2) return "bg-primary-50";
  if (ratio < 0.4) return "bg-primary-100";
  if (ratio < 0.6) return "bg-primary-200";
  if (ratio < 0.8) return "bg-primary-300";
  return "bg-primary-500";
}

function getTextClass(count: number, maxCount: number): string {
  if (maxCount === 0) return "text-muted-foreground/70";

  const ratio = count / maxCount;
  if (ratio >= 0.6) return "text-white font-medium";
  if (ratio >= 0.2) return "text-primary-800";
  return "text-muted-foreground";
}

function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

export function HeatmapCard({
  title,
  description,
  data,
  className,
}: HeatmapCardProps) {
  const maxCount = data.length > 0 ? Math.max(...data.map((point) => point.count)) : 0;

  // Fill in all 24 hours
  const hourData = Array.from({ length: 24 }, (_, hour) => {
    const existing = data.find((point) => point.hour === hour);
    return { hour, count: existing?.count ?? 0 };
  });

  return (
    <div
      className={clsxMerge(
        "rounded-lg border border-border bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground/70">No data available</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-12">
            {hourData.map(({ hour, count }) => (
              <div
                key={hour}
                className={clsxMerge(
                  "flex flex-col items-center justify-center rounded-md py-2",
                  "min-h-[3rem] transition-colors",
                  getIntensityClass(count, maxCount)
                )}
                title={`${formatHour(hour)}: ${count} appointments`}
              >
                <span className={clsxMerge("text-[10px]", getTextClass(count, maxCount))}>
                  {formatHour(hour)}
                </span>
                <span className={clsxMerge("text-sm font-semibold", getTextClass(count, maxCount))}>
                  {count}
                </span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center justify-end gap-1.5">
            <span className="text-[10px] text-muted-foreground">Less</span>
            <div className="h-3 w-3 rounded-sm bg-muted ring-1 ring-border" />
            <div className="h-3 w-3 rounded-sm bg-primary-100" />
            <div className="h-3 w-3 rounded-sm bg-primary-200" />
            <div className="h-3 w-3 rounded-sm bg-primary-300" />
            <div className="h-3 w-3 rounded-sm bg-primary-500" />
            <span className="text-[10px] text-muted-foreground">More</span>
          </div>
        </>
      )}
    </div>
  );
}
