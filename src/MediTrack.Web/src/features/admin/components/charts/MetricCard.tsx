import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { PRIMARY_700 } from "@/shared/utils/chartColors";

interface SparklineDataPoint {
  readonly value: number;
}

interface MetricCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly trend?: number;
  readonly trendLabel?: string;
  readonly icon: LucideIcon;
  readonly iconClassName?: string;
  readonly sparklineData?: SparklineDataPoint[];
  readonly sparklineColor?: string;
  readonly className?: string;
}

export function MetricCard({
  title,
  value,
  trend,
  trendLabel,
  icon: Icon,
  iconClassName,
  sparklineData,
  sparklineColor = PRIMARY_700,
  className,
}: MetricCardProps) {
  const isPositive = trend !== undefined && trend >= 0;
  const hasTrend = trend !== undefined && trend !== 0;

  return (
    <div
      className={clsxMerge(
        "flex flex-col gap-3",
        "rounded-lg border border-border bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div
          className={clsxMerge(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            iconClassName ?? "bg-primary-50 text-primary-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          {hasTrend && (
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-success-600" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-error-600" />
              )}
              <span
                className={clsxMerge(
                  "text-xs font-medium",
                  isPositive ? "text-success-600" : "text-error-600"
                )}
              >
                {isPositive ? "+" : ""}
                {trend}%
              </span>
              {trendLabel && (
                <span className="text-xs text-muted-foreground">{trendLabel}</span>
              )}
            </div>
          )}
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className="h-10 w-20 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id={`sparkline-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={sparklineColor}
                  strokeWidth={1.5}
                  fill={`url(#sparkline-${title})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
