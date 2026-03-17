import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Users,
  Clock,
  FileCheck,
  Download,
  FileText,
  CalendarClock,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/shared/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { Input } from "@/shared/components/ui/input";
import { toast } from "@/shared/components/ui/sonner";
import {
  useGetAnalyticsOverviewQuery,
  useGetSessionVolumeQuery,
  useGetSuggestionBreakdownQuery,
  useGetProviderLeaderboardQuery,
  useGetPatientRegistrationTrendsQuery,
  useGetPatientDemographicsQuery,
  useGetAppointmentVolumeQuery,
  useGetAppointmentStatusDistributionQuery,
  useGetAppointmentTypeDistributionQuery,
  useGetAppointmentBusiestHoursQuery,
  useGetLoginActivityQuery,
  useGetUserStatsQuery,
} from "@/features/clara/store/claraApi";
import { getInitials, getAvatarColor } from "@/shared/utils/avatarUtils";
import {
  AreaChartCard,
  BarChartCard,
  PieChartCard,
  HeatmapCard,
  MetricCard,
  MetricCardSkeleton,
  ChartSkeleton,
  PieChartSkeleton,
  ErrorState,
} from "./charts";
import {
  PRIMARY_700,
  SECONDARY_700,
  ACCENT_500,
  SUCCESS_500,
  WARNING_500,
  ERROR_500,
  EXTENDED_STATUS_PALETTE,
  TYPE_PALETTE,
  GENDER_PALETTE,
  ROLE_PALETTE,
} from "@/shared/utils/chartColors";

/* ── Breadcrumb ── */

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/dashboard" },
  { label: "Admin", href: "/admin" },
  { label: "Reports" },
];

/* ── Helpers ── */

function formatMinutes(minutes: number): string {
  const wholeMinutes = Math.floor(minutes);
  const seconds = Math.round((minutes - wholeMinutes) * 60);
  return `${wholeMinutes}m ${seconds}s`;
}

function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDayLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

/* ── Date Range Types & Logic ── */

type DateRangePreset = "7d" | "30d" | "90d" | "year" | "custom";

interface DateRangeState {
  readonly preset: DateRangePreset;
  readonly customFrom: string;
  readonly customTo: string;
}

function getDateRangeDays(dateRange: DateRangeState): number {
  if (dateRange.preset === "7d") return 7;
  if (dateRange.preset === "30d") return 30;
  if (dateRange.preset === "90d") return 90;
  if (dateRange.preset === "year") return 365;
  if (dateRange.preset === "custom" && dateRange.customFrom && dateRange.customTo) {
    const diffMs = new Date(dateRange.customTo).getTime() - new Date(dateRange.customFrom).getTime();
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }
  return 30;
}

function getDateRangePeriod(dateRange: DateRangeState): string {
  const days = getDateRangeDays(dateRange);
  return `${days}d`;
}

function getDateRangeLabel(preset: DateRangePreset): string {
  switch (preset) {
    case "7d": return "Last 7 days";
    case "30d": return "Last 30 days";
    case "90d": return "Last 90 days";
    case "year": return "This year";
    case "custom": return "Custom";
  }
}

const DEFAULT_DATE_RANGE: DateRangeState = {
  preset: "30d",
  customFrom: "",
  customTo: "",
};

/* ── Date Range Picker Component ── */

function DateRangePicker({
  value,
  onChange,
}: {
  readonly value: DateRangeState;
  readonly onChange: (dateRange: DateRangeState) => void;
}) {
  const handlePresetChange = (preset: string) => {
    onChange({
      ...value,
      preset: preset as DateRangePreset,
    });
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select value={value.preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="h-9 w-full sm:w-40 text-xs">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
          <SelectItem value="year">This year</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {value.preset === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={value.customFrom}
            onChange={(event) =>
              onChange({ ...value, customFrom: event.target.value })
            }
            className="h-9 w-36 text-xs"
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={value.customTo}
            onChange={(event) =>
              onChange({ ...value, customTo: event.target.value })
            }
            className="h-9 w-36 text-xs"
            aria-label="To date"
          />
        </div>
      )}

      {value.preset !== "custom" && (
        <span className="text-xs text-muted-foreground">
          vs previous {getDateRangeLabel(value.preset).toLowerCase().replace("last ", "").replace("this ", "")}
        </span>
      )}
    </div>
  );
}

/* ── Funnel Visualization ── */

const FUNNEL_DATA = [
  { label: "Shown", count: 1245, color: "bg-primary-200" },
  { label: "Viewed", count: 892, color: "bg-primary-400" },
  { label: "Accepted", count: 678, color: "bg-primary-600" },
  { label: "Applied to Record", count: 612, color: "bg-primary-700" },
] as const;

function SuggestionAcceptanceFunnel() {
  const maxCount = FUNNEL_DATA[0].count;

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">AI Suggestion Acceptance Funnel</h3>
      <p className="mt-1 text-xs text-muted-foreground">From suggestion shown to applied in medical record</p>

      <div className="mt-5 space-y-3">
        {FUNNEL_DATA.map((step, index) => {
          const widthPercent = Math.max(20, (step.count / maxCount) * 100);
          const conversionFromPrevious =
            index > 0
              ? ((step.count / FUNNEL_DATA[index - 1].count) * 100).toFixed(1)
              : null;

          return (
            <div key={step.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground/80">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {step.count.toLocaleString()}
                  </span>
                  {conversionFromPrevious && (
                    <span className="text-muted-foreground">
                      ({conversionFromPrevious}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="h-7 w-full rounded-sm bg-muted">
                <div
                  className={clsxMerge(
                    "flex h-full items-center justify-end rounded-sm pr-2 transition-all",
                    step.color
                  )}
                  style={{ width: `${widthPercent}%` }}
                >
                  <span className="text-[10px] font-semibold text-white">
                    {step.count.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="text-muted-foreground">Overall conversion</span>
        <span className="font-bold text-primary-700">
          {((FUNNEL_DATA[FUNNEL_DATA.length - 1].count / FUNNEL_DATA[0].count) * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

/* ── Peak Usage Heatmap ── */

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const HOURS = Array.from({ length: 24 }, (_, hourIndex) => hourIndex);

function generateHeatmapData(): number[][] {
  return DAYS_OF_WEEK.map((_, dayIndex) =>
    HOURS.map((hour) => {
      const isWeekday = dayIndex < 5;
      const isBusinessHours = hour >= 8 && hour <= 17;
      const isPeakHours = hour >= 9 && hour <= 12;
      const isAfternoonPeak = hour >= 14 && hour <= 16;

      let baseValue = 1;
      if (isWeekday && isBusinessHours) baseValue = 12;
      if (isWeekday && isPeakHours) baseValue = 22;
      if (isWeekday && isAfternoonPeak) baseValue = 18;
      if (!isWeekday && hour >= 9 && hour <= 14) baseValue = 5;
      if (hour >= 0 && hour <= 5) baseValue = 0;

      const jitter = Math.floor(Math.random() * 6) - 3;
      return Math.max(0, baseValue + jitter);
    })
  );
}

const HEATMAP_DATA = generateHeatmapData();

function getHeatmapCellColor(value: number): string {
  if (value === 0) return "bg-muted";
  if (value <= 3) return "bg-primary-100";
  if (value <= 8) return "bg-primary-200";
  if (value <= 14) return "bg-primary-300";
  if (value <= 18) return "bg-primary-400";
  if (value <= 22) return "bg-primary-500";
  if (value <= 26) return "bg-primary-600";
  return "bg-primary-700";
}

function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

function PeakUsageHeatmap() {
  const [hoveredCell, setHoveredCell] = useState<{
    day: number;
    hour: number;
  } | null>(null);

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">Peak Usage Heatmap</h3>
      <p className="mt-1 text-xs text-muted-foreground">Clara session activity by day and hour</p>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="mb-1 flex">
            <div className="w-10 flex-shrink-0" />
            <div className="flex flex-1">
              {HOURS.filter((hour) => hour % 3 === 0).map((hour) => (
                <div
                  key={hour}
                  className="text-[10px] text-muted-foreground/70"
                  style={{ width: `${(3 / 24) * 100}%` }}
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>
          </div>

          {/* Grid rows */}
          {DAYS_OF_WEEK.map((day, dayIndex) => (
            <div key={day} className="mb-0.5 flex items-center">
              <div className="w-10 flex-shrink-0 text-[10px] font-medium text-muted-foreground">
                {day}
              </div>
              <div className="flex flex-1 gap-0.5">
                <TooltipProvider delayDuration={100}>
                  {HOURS.map((hour) => {
                    const value = HEATMAP_DATA[dayIndex][hour];
                    const isHovered =
                      hoveredCell?.day === dayIndex && hoveredCell?.hour === hour;
                    return (
                      <Tooltip key={hour}>
                        <TooltipTrigger asChild>
                          <div
                            className={clsxMerge(
                              "h-5 flex-1 rounded-[2px] cursor-pointer transition-all",
                              getHeatmapCellColor(value),
                              isHovered && "ring-2 ring-primary-700 ring-offset-1"
                            )}
                            onMouseEnter={() =>
                              setHoveredCell({ day: dayIndex, hour })
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {day} {formatHour(hour)}: {value} sessions
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="mt-3 flex items-center justify-end gap-1">
            <span className="mr-1 text-[10px] text-muted-foreground/70">Less</span>
            {["bg-muted", "bg-primary-100", "bg-primary-300", "bg-primary-500", "bg-primary-700"].map(
              (colorClass) => (
                <div
                  key={colorClass}
                  className={clsxMerge("h-3 w-3 rounded-[2px]", colorClass)}
                />
              )
            )}
            <span className="ml-1 text-[10px] text-muted-foreground/70">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Department Comparison Chart ── */

const DEPARTMENT_DATA = [
  { name: "Cardiology", claraSessions: 245, recordsCreated: 189, avgSessionMinutes: 14.2 },
  { name: "Neurology", claraSessions: 198, recordsCreated: 156, avgSessionMinutes: 18.5 },
  { name: "Internal Medicine", claraSessions: 312, recordsCreated: 278, avgSessionMinutes: 11.8 },
  { name: "Pediatrics", claraSessions: 167, recordsCreated: 142, avgSessionMinutes: 9.3 },
  { name: "Orthopedics", claraSessions: 134, recordsCreated: 118, avgSessionMinutes: 12.7 },
] as const;

function DepartmentComparisonChart() {
  const maxClaraSessions = Math.max(...DEPARTMENT_DATA.map((dept) => dept.claraSessions));
  const maxRecords = Math.max(...DEPARTMENT_DATA.map((dept) => dept.recordsCreated));
  const maxDuration = Math.max(...DEPARTMENT_DATA.map((dept) => dept.avgSessionMinutes));

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">Department Comparison</h3>
      <p className="mt-1 text-xs text-muted-foreground">Clara usage across departments</p>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-primary-700" />
          <span className="text-muted-foreground">Clara Sessions</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-secondary-700" />
          <span className="text-muted-foreground">Records Created</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-accent-500" />
          <span className="text-muted-foreground">Avg Duration (min)</span>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {DEPARTMENT_DATA.map((dept) => (
          <div key={dept.name} className="space-y-1.5">
            <span className="text-xs font-medium text-foreground/80">{dept.name}</span>

            {/* Clara Sessions bar */}
            <div className="flex items-center gap-2">
              <div className="h-4 flex-1 rounded-sm bg-muted">
                <div
                  className="flex h-full items-center rounded-sm bg-primary-700 px-1.5 text-[10px] font-semibold text-white"
                  style={{ width: `${(dept.claraSessions / maxClaraSessions) * 100}%` }}
                >
                  {dept.claraSessions}
                </div>
              </div>
            </div>

            {/* Records Created bar */}
            <div className="flex items-center gap-2">
              <div className="h-4 flex-1 rounded-sm bg-muted">
                <div
                  className="flex h-full items-center rounded-sm bg-secondary-700 px-1.5 text-[10px] font-semibold text-white"
                  style={{ width: `${(dept.recordsCreated / maxRecords) * 100}%` }}
                >
                  {dept.recordsCreated}
                </div>
              </div>
            </div>

            {/* Avg Session Duration bar */}
            <div className="flex items-center gap-2">
              <div className="h-4 flex-1 rounded-sm bg-muted">
                <div
                  className="flex h-full items-center rounded-sm bg-accent-500 px-1.5 text-[10px] font-semibold text-white"
                  style={{ width: `${(dept.avgSessionMinutes / maxDuration) * 100}%` }}
                >
                  {dept.avgSessionMinutes}m
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sparkline ── */

function generateSparklineData(seed: number): number[] {
  const points: number[] = [];
  let value = 10 + seed * 3;
  for (let dayIndex = 0; dayIndex < 30; dayIndex++) {
    value = Math.max(0, value + Math.floor(Math.random() * 7) - 3);
    points.push(value);
  }
  return points;
}

function Sparkline({ data }: { readonly data: number[] }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;

  const points = data
    .map((value, index) => {
      const xPosition = (index / (data.length - 1)) * width;
      const yPosition = height - ((value - min) / range) * height;
      return `${xPosition},${yPosition}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-primary-500"
      />
    </svg>
  );
}

/* ── Schedule Report Modal ── */

function ScheduleReportModal({
  isOpen,
  onClose,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}) {
  const [frequency, setFrequency] = useState("weekly");
  const [emailAddress, setEmailAddress] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("monday");

  const handleSchedule = () => {
    toast.success("Report scheduled", {
      description: `${frequency === "weekly" ? "Weekly" : "Monthly"} report will be sent to ${emailAddress || "your email"}`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Report</DialogTitle>
          <DialogDescription>
            Set up automated report delivery to your email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">Frequency</label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequency === "weekly" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Day of week</label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monday">Monday</SelectItem>
                  <SelectItem value="tuesday">Tuesday</SelectItem>
                  <SelectItem value="wednesday">Wednesday</SelectItem>
                  <SelectItem value="thursday">Thursday</SelectItem>
                  <SelectItem value="friday">Friday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">Email address</label>
            <Input
              type="email"
              placeholder="admin@meditrack.com"
              value={emailAddress}
              onChange={(event) => setEmailAddress(event.target.value)}
              className="h-9 text-sm"
              autoComplete="email"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <button
              type="button"
              className="rounded-md px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-muted"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={handleSchedule}
            className="rounded-md bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
          >
            Schedule
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Sortable Provider Leaderboard Types ── */

type LeaderboardSortColumn = "rank" | "provider" | "sessions" | "saved" | "saveRate";
type SortDirection = "asc" | "desc";

function getSortIcon(
  column: LeaderboardSortColumn,
  currentColumn: LeaderboardSortColumn,
  currentDirection: SortDirection
) {
  if (column !== currentColumn) {
    return <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/70" />;
  }
  return currentDirection === "asc" ? (
    <ChevronUp className="ml-1 inline h-3 w-3 text-primary-700" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3 text-primary-700" />
  );
}

/* ── Clara AI Tab ── */

function ClaraAITab({ dateRange }: { readonly dateRange: DateRangeState }) {
  const period = getDateRangePeriod(dateRange);
  const days = getDateRangeDays(dateRange);

  const [sortColumn, setSortColumn] = useState<LeaderboardSortColumn>("sessions");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const {
    data: overview,
    isLoading: isLoadingOverview,
    isError: isOverviewError,
    refetch: refetchOverview,
  } = useGetAnalyticsOverviewQuery({ period });
  const {
    data: sessionVolume,
    isLoading: isLoadingVolume,
    isError: isVolumeError,
    refetch: refetchVolume,
  } = useGetSessionVolumeQuery({ days: Math.min(days, 90) });
  const {
    data: suggestionBreakdown,
    isLoading: isLoadingBreakdown,
    isError: isBreakdownError,
    refetch: refetchBreakdown,
  } = useGetSuggestionBreakdownQuery({ period });
  const { data: providerLeaderboard } = useGetProviderLeaderboardQuery({ period, limit: 5 });

  const statCards = overview
    ? [
        {
          title: "Total Sessions",
          value: overview.totalSessions.toLocaleString(),
          trend: overview.sessionsTrend,
          icon: BarChart3,
          iconClassName: "bg-primary-50 text-primary-700",
        },
        {
          title: "AI Drafts Saved",
          value: overview.aiDraftsSaved.toLocaleString(),
          trend: overview.aiDraftsTrend,
          icon: FileCheck,
          iconClassName: "bg-success-50 text-success-600",
        },
        {
          title: "Active Providers",
          value: overview.activeProviders.toLocaleString(),
          trend: overview.activeProvidersTrend,
          icon: Users,
          iconClassName: "bg-secondary-50 text-secondary-700",
        },
        {
          title: "Avg Session Length",
          value: formatMinutes(overview.avgSessionMinutes),
          trend: overview.avgSessionTrend,
          icon: Clock,
          iconClassName: "bg-accent-50 text-accent-600",
        },
      ]
    : [];

  const volumeChartData = (sessionVolume ?? []) as unknown as Record<string, unknown>[];
  const leaderboardEntries = providerLeaderboard ?? [];

  const suggestionPieData = (suggestionBreakdown ?? []).map((entry) => ({
    name: entry.type.replace("_", " "),
    value: entry.count,
  }));

  /* Sort leaderboard */
  const handleSortClick = (column: LeaderboardSortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const sparklineCache = leaderboardEntries.map((_, index) => generateSparklineData(index + 1));

  const sortedLeaderboard = [...leaderboardEntries].sort((entryA, entryB) => {
    const multiplier = sortDirection === "asc" ? 1 : -1;
    switch (sortColumn) {
      case "provider":
        return multiplier * entryA.doctorName.localeCompare(entryB.doctorName);
      case "sessions":
        return multiplier * (entryA.sessionCount - entryB.sessionCount);
      case "saved":
        return multiplier * (entryA.suggestionsSaved - entryB.suggestionsSaved);
      case "saveRate":
        return multiplier * (entryA.saveRate - entryB.saveRate);
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {isLoadingOverview ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <MetricCardSkeleton key={index} />
          ))}
        </div>
      ) : isOverviewError ? (
        <ErrorState
          title="Clara overview unavailable"
          message="Could not load Clara AI analytics."
          onRetry={refetchOverview}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <MetricCard
              key={card.title}
              title={card.title}
              value={card.value}
              trend={card.trend}
              trendLabel="vs prev period"
              icon={card.icon}
              iconClassName={card.iconClassName}
            />
          ))}
        </div>
      )}

      {/* Volume + Breakdown Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          {isLoadingVolume ? (
            <ChartSkeleton />
          ) : isVolumeError ? (
            <ErrorState
              title="Session volume unavailable"
              onRetry={refetchVolume}
            />
          ) : (
            <BarChartCard
              title="Session Volume"
              description={`Last ${Math.min(days, 90)} days`}
              data={volumeChartData}
              xAxisKey="date"
              series={[{ dataKey: "sessionCount", label: "Sessions", color: PRIMARY_700 }]}
              formatXAxis={formatDayLabel}
              showLegend={false}
            />
          )}
        </div>
        {isLoadingBreakdown ? (
          <PieChartSkeleton />
        ) : isBreakdownError ? (
          <ErrorState title="Suggestion data unavailable" compact onRetry={refetchBreakdown} />
        ) : (
          <PieChartCard
            title="Suggestion Breakdown"
            description="By Clara suggestion type"
            data={suggestionPieData}
            colors={[PRIMARY_700, SECONDARY_700, ACCENT_500, WARNING_500]}
            innerRadius={40}
          />
        )}
      </div>

      {/* Suggestion Acceptance Funnel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <SuggestionAcceptanceFunnel />
        <PeakUsageHeatmap />
      </div>

      {/* Department Comparison */}
      <DepartmentComparisonChart />

      {/* Enhanced Provider Leaderboard */}
      {sortedLeaderboard.length > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border px-5 pb-3 pt-5">
            <Users className="h-5 w-5 text-primary-700" />
            <h2 className="font-semibold text-foreground">Top Providers by Clara Usage</h2>
          </div>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">#</th>
                  <th
                    className="cursor-pointer select-none px-5 py-3 hover:text-foreground/80"
                    onClick={() => handleSortClick("provider")}
                  >
                    Provider {getSortIcon("provider", sortColumn, sortDirection)}
                  </th>
                  <th className="px-5 py-3 text-center">Trend (30d)</th>
                  <th
                    className="cursor-pointer select-none px-5 py-3 text-right hover:text-foreground/80"
                    onClick={() => handleSortClick("sessions")}
                  >
                    Sessions {getSortIcon("sessions", sortColumn, sortDirection)}
                  </th>
                  <th
                    className="cursor-pointer select-none px-5 py-3 text-right hover:text-foreground/80"
                    onClick={() => handleSortClick("saved")}
                  >
                    Saved {getSortIcon("saved", sortColumn, sortDirection)}
                  </th>
                  <th
                    className="cursor-pointer select-none px-5 py-3 text-right hover:text-foreground/80"
                    onClick={() => handleSortClick("saveRate")}
                  >
                    Save Rate {getSortIcon("saveRate", sortColumn, sortDirection)}
                  </th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedLeaderboard.map((provider, index) => {
                  const originalIndex = leaderboardEntries.findIndex(
                    (entry) => entry.doctorId === provider.doctorId
                  );
                  const sparklineData = sparklineCache[originalIndex] ?? sparklineCache[0];
                  const saveRateColor =
                    provider.saveRate >= 90
                      ? "bg-success-500"
                      : provider.saveRate >= 70
                        ? "bg-warning-500"
                        : "bg-error-500";

                  return (
                    <tr key={provider.doctorId} className="transition-colors hover:bg-muted">
                      <td className="px-5 py-3">
                        <span
                          className={clsxMerge(
                            "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                            index < 3
                              ? "bg-primary-100 text-primary-700"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={clsxMerge(
                              "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold",
                              getAvatarColor(provider.doctorName)
                            )}
                          >
                            {getInitials(provider.doctorName)}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {provider.doctorName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Sparkline data={sparklineData} />
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-medium text-foreground">
                        {provider.sessionCount}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-muted-foreground">
                        {provider.suggestionsSaved}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-2 w-16 rounded-full bg-border">
                            <div
                              className={clsxMerge("h-full rounded-full", saveRateColor)}
                              style={{ width: `${Math.min(provider.saveRate, 100)}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs font-medium text-foreground/80">
                            {provider.saveRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to={`/admin/users?user=${provider.doctorId}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800"
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="divide-y divide-border md:hidden">
            {sortedLeaderboard.map((provider, index) => {
              const saveRateColor =
                provider.saveRate >= 90
                  ? "bg-success-500"
                  : provider.saveRate >= 70
                    ? "bg-warning-500"
                    : "bg-error-500";

              return (
                <div key={provider.doctorId} className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={clsxMerge(
                        "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        index < 3
                          ? "bg-primary-100 text-primary-700"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {provider.doctorName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {provider.sessionCount} sessions &middot; {provider.suggestionsSaved} saved
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-border">
                          <div
                            className={clsxMerge("h-full rounded-full", saveRateColor)}
                            style={{ width: `${Math.min(provider.saveRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {provider.saveRate}%
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/admin/users?user=${provider.doctorId}`}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-primary-700 hover:bg-primary-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Appointments Tab ── */

function AppointmentsTab({ dateRange }: { readonly dateRange: DateRangeState }) {
  const days = getDateRangeDays(dateRange);
  const {
    data: volume,
    isLoading: isVolumeLoading,
    isError: isVolumeError,
    refetch: refetchVolume,
  } = useGetAppointmentVolumeQuery({ days });
  const {
    data: statusDistribution,
    isLoading: isStatusLoading,
    isError: isStatusError,
    refetch: refetchStatus,
  } = useGetAppointmentStatusDistributionQuery({ days });
  const {
    data: typeDistribution,
    isLoading: isTypeLoading,
    isError: isTypeError,
    refetch: refetchType,
  } = useGetAppointmentTypeDistributionQuery({ days });
  const {
    data: busiestHours,
    isLoading: isHoursLoading,
    isError: isHoursError,
    refetch: refetchHours,
  } = useGetAppointmentBusiestHoursQuery({ days });

  const statusPieData = (statusDistribution ?? []).map((entry) => ({ name: entry.status, value: entry.count }));
  const typePieData = (typeDistribution ?? []).map((entry) => ({ name: entry.type, value: entry.count }));

  return (
    <div className="space-y-6">
      {isVolumeLoading ? (
        <ChartSkeleton />
      ) : isVolumeError ? (
        <ErrorState
          title="Appointment volume unavailable"
          message="Could not load appointment data."
          onRetry={refetchVolume}
        />
      ) : (
        <BarChartCard
          title="Appointment Volume"
          description="Daily counts by status"
          data={(volume ?? []) as unknown as Record<string, unknown>[]}
          xAxisKey="date"
          series={[
            { dataKey: "completed", label: "Completed", color: SUCCESS_500, stackId: "a" },
            { dataKey: "confirmed", label: "Confirmed", color: SECONDARY_700, stackId: "a" },
            { dataKey: "scheduled", label: "Scheduled", color: PRIMARY_700, stackId: "a" },
            { dataKey: "cancelled", label: "Cancelled", color: ERROR_500, stackId: "a" },
            { dataKey: "noShow", label: "No Show", color: WARNING_500, stackId: "a" },
          ]}
          formatXAxis={formatShortDate}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {isStatusLoading ? (
          <PieChartSkeleton />
        ) : isStatusError ? (
          <ErrorState title="Status data unavailable" compact onRetry={refetchStatus} />
        ) : (
          <PieChartCard
            title="Status Distribution"
            data={statusPieData}
            colors={[...EXTENDED_STATUS_PALETTE]}
            innerRadius={40}
          />
        )}
        {isTypeLoading ? (
          <PieChartSkeleton />
        ) : isTypeError ? (
          <ErrorState title="Type data unavailable" compact onRetry={refetchType} />
        ) : (
          <PieChartCard
            title="Type Distribution"
            data={typePieData}
            colors={[...TYPE_PALETTE]}
            innerRadius={40}
          />
        )}
      </div>

      {isHoursLoading ? (
        <ChartSkeleton height={200} />
      ) : isHoursError ? (
        <ErrorState title="Busiest hours unavailable" compact onRetry={refetchHours} />
      ) : (
        <HeatmapCard
          title="Busiest Hours"
          description="Appointment count by hour of day"
          data={busiestHours ?? []}
        />
      )}
    </div>
  );
}

/* ── Patients Tab ── */

function PatientsTab({ dateRange }: { readonly dateRange: DateRangeState }) {
  const days = getDateRangeDays(dateRange);
  const {
    data: trends,
    isLoading: isTrendsLoading,
    isError: isTrendsError,
    refetch: refetchTrends,
  } = useGetPatientRegistrationTrendsQuery({ days });
  const {
    data: demographics,
    isLoading: isDemographicsLoading,
    isError: isDemographicsError,
    refetch: refetchDemographics,
  } = useGetPatientDemographicsQuery();

  const genderPieData = (demographics?.genderDistribution ?? []).map((entry) => ({
    name: entry.label,
    value: entry.count,
  }));

  const ageBarData = (demographics?.ageBrackets ?? []) as unknown as Record<string, unknown>[];

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        {isDemographicsLoading ? (
          <div className="flex gap-4 animate-pulse">
            <div className="h-5 w-20 rounded bg-border" />
            <div className="h-5 w-16 rounded bg-border" />
            <div className="h-5 w-16 rounded bg-border" />
          </div>
        ) : demographics ? (
          <>
            <div className="text-sm">
              <span className="font-semibold text-foreground">
                {demographics.totalPatients.toLocaleString()}
              </span>
              <span className="ml-1 text-muted-foreground">total</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold text-success-700">
                {demographics.activePatients.toLocaleString()}
              </span>
              <span className="ml-1 text-muted-foreground">active</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold text-muted-foreground">
                {demographics.inactivePatients.toLocaleString()}
              </span>
              <span className="ml-1 text-muted-foreground">inactive</span>
            </div>
          </>
        ) : null}
      </div>

      {isTrendsLoading ? (
        <ChartSkeleton />
      ) : isTrendsError ? (
        <ErrorState
          title="Registration trends unavailable"
          message="Could not load patient registration data."
          onRetry={refetchTrends}
        />
      ) : (
        <AreaChartCard
          title="Registration Trend"
          description="New patient registrations"
          data={(trends ?? []) as unknown as Record<string, unknown>[]}
          xAxisKey="date"
          series={[{ dataKey: "count", label: "Registrations", color: PRIMARY_700 }]}
          formatXAxis={formatShortDate}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {isDemographicsLoading ? (
          <>
            <PieChartSkeleton />
            <ChartSkeleton />
          </>
        ) : isDemographicsError ? (
          <div className="lg:col-span-2">
            <ErrorState
              title="Demographics unavailable"
              message="Could not load patient demographics."
              onRetry={refetchDemographics}
            />
          </div>
        ) : (
          <>
            <PieChartCard
              title="Gender Distribution"
              data={genderPieData}
              colors={[...GENDER_PALETTE]}
              innerRadius={50}
            />
            <BarChartCard
              title="Age Brackets"
              data={ageBarData}
              xAxisKey="label"
              series={[{ dataKey: "count", label: "Patients", color: PRIMARY_700 }]}
              showLegend={false}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ── User Activity Tab ── */

function UserActivityTab({ dateRange }: { readonly dateRange: DateRangeState }) {
  const days = getDateRangeDays(dateRange);
  const {
    data: loginActivity,
    isLoading: isLoginLoading,
    isError: isLoginError,
    refetch: refetchLogin,
  } = useGetLoginActivityQuery({ days });
  const {
    data: userStats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  } = useGetUserStatsQuery();

  const rolePieData = (userStats?.usersByRole ?? []).map((entry) => ({
    name: entry.role,
    value: entry.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        {isStatsLoading ? (
          <div className="flex gap-4 animate-pulse">
            <div className="h-5 w-28 rounded bg-border" />
            <div className="h-5 w-24 rounded bg-border" />
          </div>
        ) : userStats ? (
          <>
            <div className="text-sm">
              <span className="font-semibold text-foreground">
                {userStats.totalUsers.toLocaleString()}
              </span>
              <span className="ml-1 text-muted-foreground">total users</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold text-success-700">
                {userStats.activeUsersLast30Days.toLocaleString()}
              </span>
              <span className="ml-1 text-muted-foreground">active (30d)</span>
            </div>
          </>
        ) : null}
      </div>

      {isLoginLoading ? (
        <ChartSkeleton />
      ) : isLoginError ? (
        <ErrorState
          title="Login activity unavailable"
          message="Could not load login data."
          onRetry={refetchLogin}
        />
      ) : (
        <AreaChartCard
          title="Login Activity"
          description="Unique users who logged in per day"
          data={(loginActivity ?? []) as unknown as Record<string, unknown>[]}
          xAxisKey="date"
          series={[{ dataKey: "uniqueUsers", label: "Unique Users", color: PRIMARY_700 }]}
          formatXAxis={formatShortDate}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {isStatsLoading ? (
          <>
            <PieChartSkeleton />
            <ChartSkeleton />
          </>
        ) : isStatsError ? (
          <div className="lg:col-span-2">
            <ErrorState
              title="User statistics unavailable"
              message="Could not load user data."
              onRetry={refetchStats}
            />
          </div>
        ) : (
          <>
            <PieChartCard
              title="Users by Role"
              data={rolePieData}
              colors={[...ROLE_PALETTE]}
              innerRadius={50}
            />
            {userStats && (
              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground">User Statistics</h3>
                <div className="mt-4 space-y-3">
                  {userStats.usersByRole.map((entry) => (
                    <div key={entry.role} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{entry.role}</span>
                      <span className="text-sm font-semibold text-foreground">
                        {entry.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground/80">Engagement Rate</span>
                      <span className="text-sm font-bold text-primary-700">
                        {userStats.totalUsers > 0
                          ? `${Math.round((userStats.activeUsersLast30Days / userStats.totalUsers) * 100)}%`
                          : "\u2014"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ── */

export function AdminReportsPage() {
  const [dateRange, setDateRange] = useState<DateRangeState>(DEFAULT_DATE_RANGE);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const handleExportPdf = () => {
    toast.success("PDF export started", {
      description: `Generating report for ${getDateRangeLabel(dateRange.preset).toLowerCase()}...`,
    });
  };

  const handleExportCsv = () => {
    toast.success("CSV export started", {
      description: `Generating CSV for ${getDateRangeLabel(dateRange.preset).toLowerCase()}...`,
    });
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
            <BarChart3 className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground">Business performance and usage metrics</p>
          </div>
        </div>

        {/* Export & Schedule buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground/80 shadow-sm hover:bg-muted"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span> PDF
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground/80 shadow-sm hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span> CSV
          </button>
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-700 px-3 text-xs font-medium text-white shadow-sm hover:bg-primary-800"
          >
            <CalendarClock className="h-4 w-4" />
            Schedule
          </button>
        </div>
      </div>

      {/* Date Range Picker — applies across all tabs */}
      <div className="flex justify-end">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Tabbed Navigation */}
      <Tabs defaultValue="clara" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="clara">Clara AI</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="clara" className="mt-6">
          <ClaraAITab dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="appointments" className="mt-6">
          <AppointmentsTab dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="patients" className="mt-6">
          <PatientsTab dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserActivityTab dateRange={dateRange} />
        </TabsContent>
      </Tabs>

      {/* Schedule Report Modal */}
      <ScheduleReportModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />
    </div>
  );
}
