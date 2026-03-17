import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { getChartTooltipStyle, getChartSurface } from "@/shared/utils/chartColors";

interface PieChartDataItem {
  readonly name: string;
  readonly value: number;
}

interface PieChartCardProps {
  readonly title: string;
  readonly description?: string;
  readonly data: PieChartDataItem[];
  readonly colors: string[];
  readonly height?: number;
  readonly className?: string;
  readonly innerRadius?: number;
  readonly showLegend?: boolean;
}

const RADIAN = Math.PI / 180;

function renderCustomLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;

  if (percent < 0.05) return null;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const xPosition = cx + radius * Math.cos(-midAngle * RADIAN);
  const yPosition = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={xPosition}
      y={yPosition}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function PieChartCard({
  title,
  description,
  data,
  colors,
  height = 280,
  className,
  innerRadius = 0,
  showLegend = true,
}: PieChartCardProps) {
  const filteredData = data.filter((item) => item.value > 0);

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

      {filteredData.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <p className="text-sm text-muted-foreground/70">No data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={filteredData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={height / 2 - 40}
              labelLine={false}
              label={renderCustomLabel}
            >
              {filteredData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  stroke={getChartSurface()}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={getChartTooltipStyle()}
            />
            {showLegend && (
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
