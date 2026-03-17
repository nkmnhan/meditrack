import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
} from "@/shared/utils/chartColors";

interface BarChartSeries {
  readonly dataKey: string;
  readonly label: string;
  readonly color: string;
  readonly stackId?: string;
}

interface BarChartCardProps {
  readonly title: string;
  readonly description?: string;
  readonly data: Record<string, unknown>[];
  readonly xAxisKey: string;
  readonly series: BarChartSeries[];
  readonly height?: number;
  readonly className?: string;
  readonly formatXAxis?: (value: string) => string;
  readonly showLegend?: boolean;
}

export function BarChartCard({
  title,
  description,
  data,
  xAxisKey,
  series,
  height = 280,
  className,
  formatXAxis,
  showLegend = true,
}: BarChartCardProps) {
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
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={getChartGridStroke()} vertical={false} />
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
                value ?? 0,
                series.find((seriesItem) => seriesItem.dataKey === name)?.label ?? name ?? "",
              ]}
            />
            {showLegend && (
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value: string) =>
                  series.find((seriesItem) => seriesItem.dataKey === value)?.label ?? value
                }
              />
            )}
            {series.map((seriesItem) => (
              <Bar
                key={seriesItem.dataKey}
                dataKey={seriesItem.dataKey}
                fill={seriesItem.color}
                stackId={seriesItem.stackId}
                radius={seriesItem.stackId ? 0 : [4, 4, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
