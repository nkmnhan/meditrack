import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import {
  getChartGridStroke,
  getChartAxisTick,
  getChartAxisLine,
  getChartTooltipStyle,
  getChartSurface,
} from "@/shared/utils/chartColors";

interface AreaChartSeries {
  readonly dataKey: string;
  readonly label: string;
  readonly color: string;
}

interface AreaChartCardProps {
  readonly title: string;
  readonly description?: string;
  readonly data: Record<string, unknown>[];
  readonly xAxisKey: string;
  readonly series: AreaChartSeries[];
  readonly height?: number;
  readonly className?: string;
  readonly formatXAxis?: (value: string) => string;
  readonly formatTooltip?: (value: number) => string;
}

export function AreaChartCard({
  title,
  description,
  data,
  xAxisKey,
  series,
  height = 280,
  className,
  formatXAxis,
  formatTooltip,
}: AreaChartCardProps) {
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
        <div className="flex items-center justify-center" style={{ height }}>
          <p className="text-sm text-muted-foreground/70">No data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={getChartGridStroke()} />
            <XAxis
              dataKey={xAxisKey}
              tick={getChartAxisTick()}
              tickFormatter={formatXAxis}
              axisLine={getChartAxisLine()}
              tickLine={false}
            />
            <YAxis
              tick={getChartAxisTick()}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={getChartTooltipStyle()}
              formatter={(value: number | undefined, name: string | undefined) => [
                value !== undefined ? (formatTooltip ? formatTooltip(value) : value) : "—",
                series.find((seriesItem) => seriesItem.dataKey === name)?.label ?? name ?? "",
              ]}
            />
            <defs>
              {series.map((seriesItem) => (
                <linearGradient
                  key={seriesItem.dataKey}
                  id={`gradient-${seriesItem.dataKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={seriesItem.color} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={seriesItem.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {series.map((seriesItem) => (
              <Area
                key={seriesItem.dataKey}
                type="monotone"
                dataKey={seriesItem.dataKey}
                stroke={seriesItem.color}
                strokeWidth={2}
                fill={`url(#gradient-${seriesItem.dataKey})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: getChartSurface() }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
