import {
  Activity,
  CalendarCheck,
  CalendarDays,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Sparkles,
  TrendingUp,
  User,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { Breadcrumb } from "@/shared/components/Breadcrumb";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import {
  useGetDashboardOverviewQuery,
  useGetPatientRegistrationTrendsQuery,
  useGetAppointmentVolumeQuery,
  useGetAppointmentStatusDistributionQuery,
  useGetInfrastructureMetricsQuery,
} from "@/features/clara/store/claraApi";
import {
  MetricCard,
  AreaChartCard,
  BarChartCard,
  PieChartCard,
  MetricCardSkeleton,
  ChartSkeleton,
  PieChartSkeleton,
  InfraCardSkeleton,
  ErrorState,
} from "./charts";
import { AutoRefreshIndicator } from "./AutoRefreshIndicator";
import {
  PRIMARY_700,
  SECONDARY_700,
  SUCCESS_500,
  WARNING_500,
  ERROR_500,
  INFO_500,
  STATUS_PALETTE,
} from "@/shared/utils/chartColors";

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/dashboard" },
  { label: "Admin", href: "/admin" },
  { label: "Dashboard" },
];

const STATUS_COLORS = [...STATUS_PALETTE];

function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SystemStatusBanner({ status }: { readonly status: string }) {
  const config = {
    Healthy: { icon: CheckCircle, label: "All Systems Operational", bg: "bg-success-50", border: "border-success-200", text: "text-success-700", iconColor: "text-success-600" },
    Degraded: { icon: AlertTriangle, label: "Some Systems Degraded", bg: "bg-warning-50", border: "border-warning-200", text: "text-warning-700", iconColor: "text-warning-600" },
    Unhealthy: { icon: XCircle, label: "System Issues Detected", bg: "bg-error-50", border: "border-error-200", text: "text-error-700", iconColor: "text-error-600" },
  }[status] ?? { icon: Activity, label: "Status Unknown", bg: "bg-muted", border: "border-border", text: "text-foreground/80", iconColor: "text-muted-foreground" };

  const StatusIcon = config.icon;

  return (
    <div className={clsxMerge("flex items-center gap-3 rounded-lg border px-4 py-3", config.bg, config.border)}>
      <StatusIcon className={clsxMerge("h-5 w-5", config.iconColor)} />
      <span className={clsxMerge("text-sm font-medium", config.text)}>{config.label}</span>
    </div>
  );
}

// ── FHIR Donut Chart ────────────────────────────────────────────────

interface DonutChartProps {
  readonly percentage: number;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly color?: string;
}

function DonutChart({
  percentage,
  size = 80,
  strokeWidth = 8,
  color = SUCCESS_500,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filledLength = (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted"
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${filledLength} ${circumference - filledLength}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Mini Sparkline (SVG-only, no recharts dependency) ───────────────

interface MiniSparklineProps {
  readonly data: readonly number[];
  readonly color: string;
  readonly width?: number;
  readonly height?: number;
}

function MiniSparkline({
  data,
  color,
  width = 64,
  height = 24,
}: MiniSparklineProps) {
  if (data.length < 2) return null;

  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const range = maxValue - minValue || 1;
  const padding = 2;

  const points = data
    .map((value, index) => {
      const xPosition = padding + (index / (data.length - 1)) * (width - padding * 2);
      const yPosition = height - padding - ((value - minValue) / range) * (height - padding * 2);
      return `${xPosition},${yPosition}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Live Activity Feed Data ─────────────────────────────────────────

interface ActivityEntry {
  readonly id: string;
  readonly icon: typeof Activity;
  readonly iconClassName: string;
  readonly text: string;
  readonly timeAgo: string;
}

const LIVE_ACTIVITY_ENTRIES: readonly ActivityEntry[] = [
  {
    id: "1",
    icon: Sparkles,
    iconClassName: "text-accent-600",
    text: "Dr. Nguyen started Clara session",
    timeAgo: "2m ago",
  },
  {
    id: "2",
    icon: UserPlus,
    iconClassName: "text-primary-700",
    text: "New patient registered",
    timeAgo: "5m ago",
  },
  {
    id: "3",
    icon: FileText,
    iconClassName: "text-secondary-700",
    text: "Lab results uploaded for Patient #4821",
    timeAgo: "8m ago",
  },
  {
    id: "4",
    icon: CheckCircle,
    iconClassName: "text-success-600",
    text: "Dr. Patel completed encounter documentation",
    timeAgo: "12m ago",
  },
  {
    id: "5",
    icon: User,
    iconClassName: "text-info-600",
    text: "Nurse Kim accessed vitals for Room 302",
    timeAgo: "18m ago",
  },
];

// ── Clara Acceptance Sparkline Data (last 7 days) ───────────────────

const CLARA_ACCEPTANCE_TREND = [68, 71, 73, 72, 75, 74, 76.3];

// ── FHIR Resource Breakdown ─────────────────────────────────────────

const FHIR_RESOURCE_BREAKDOWN = [
  { label: "Patient", rate: 99.1 },
  { label: "Observation", rate: 97.8 },
  { label: "Encounter", rate: 98.9 },
];

const OVERVIEW_POLLING_MS = 60000;
const INFRA_POLLING_MS = 30000;

export function AdminDashboardPage() {
  const {
    data: overview,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
    isFetching: isOverviewFetching,
    fulfilledTimeStamp: overviewTimestamp,
    refetch: refetchOverview,
  } = useGetDashboardOverviewQuery(undefined, {
    pollingInterval: OVERVIEW_POLLING_MS,
  });
  const {
    data: registrationTrends,
    isLoading: isRegistrationLoading,
    isError: isRegistrationError,
    refetch: refetchRegistration,
  } = useGetPatientRegistrationTrendsQuery({ days: 30 });
  const {
    data: appointmentVolume,
    isLoading: isVolumeLoading,
    isError: isVolumeError,
    refetch: refetchVolume,
  } = useGetAppointmentVolumeQuery({ days: 30 });
  const {
    data: statusDistribution,
    isLoading: isStatusLoading,
    isError: isStatusError,
    refetch: refetchStatus,
  } = useGetAppointmentStatusDistributionQuery({ days: 30 });
  const {
    data: infraMetrics,
    isLoading: isInfraLoading,
    isError: isInfraError,
    refetch: refetchInfra,
  } = useGetInfrastructureMetricsQuery(undefined, {
    pollingInterval: INFRA_POLLING_MS,
  });

  const registrationSparkline = registrationTrends?.map((entry) => ({ value: entry.count })) ?? [];
  const appointmentSparkline = appointmentVolume?.map((entry) => ({ value: entry.total })) ?? [];

  const statusPieData = statusDistribution?.map((entry) => ({
    name: entry.status,
    value: entry.count,
  })) ?? [];

  return (
    <div className="space-y-6">
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            System overview and key metrics
          </p>
        </div>
        <AutoRefreshIndicator
          pollingIntervalMs={OVERVIEW_POLLING_MS}
          lastFetchTimestamp={overviewTimestamp}
          isFetching={isOverviewFetching}
        />
      </div>

      {/* Row 1: KPI Metric Cards */}
      {isOverviewLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <MetricCardSkeleton key={index} />
          ))}
        </div>
      ) : isOverviewError ? (
        <ErrorState
          title="Failed to load overview"
          message="Could not fetch dashboard metrics."
          onRetry={refetchOverview}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Patients"
            value={overview?.totalPatients.toLocaleString() ?? "—"}
            trend={overview?.patientsTrend}
            trendLabel="vs prev period"
            icon={Users}
            iconClassName="bg-primary-50 text-primary-700"
            sparklineData={registrationSparkline}
            sparklineColor={PRIMARY_700}
          />
          <MetricCard
            title="Today's Appointments"
            value={overview?.todayAppointments.toLocaleString() ?? "—"}
            trend={overview?.appointmentsTrend}
            trendLabel="vs yesterday"
            icon={CalendarDays}
            iconClassName="bg-secondary-50 text-secondary-700"
            sparklineData={appointmentSparkline}
            sparklineColor={SECONDARY_700}
          />
          <MetricCard
            title="Clara Sessions (30d)"
            value={overview?.claraSessions.toLocaleString() ?? "—"}
            trend={overview?.claraSessionsTrend}
            trendLabel="vs prev period"
            icon={Sparkles}
            iconClassName="bg-accent-50 text-accent-600"
          />
          <MetricCard
            title="Active Users (30d)"
            value={overview?.activeUsers.toLocaleString() ?? "—"}
            trend={overview?.activeUsersTrend}
            trendLabel="engagement"
            icon={Users}
            iconClassName="bg-info-50 text-info-600"
          />
        </div>
      )}

      {/* Row 2: System Status Banner */}
      {overview && <SystemStatusBanner status={overview.systemStatus} />}

      {/* Row 2b: Clinical Outcome Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Avg Documentation Time"
          value="12.4 min"
          trend={-8.2}
          trendLabel="vs prev month"
          icon={Clock}
          iconClassName="bg-primary-50 text-primary-700"
          sparklineData={[
            { value: 15.1 }, { value: 14.6 }, { value: 14.0 },
            { value: 13.5 }, { value: 13.2 }, { value: 12.8 }, { value: 12.4 },
          ]}
          sparklineColor={PRIMARY_700}
        />
        <MetricCard
          title="Record Completion Rate"
          value="94.2%"
          trend={2.1}
          trendLabel="vs prev month"
          icon={CheckCircle}
          iconClassName="bg-success-50 text-success-700"
          sparklineData={[
            { value: 90.5 }, { value: 91.2 }, { value: 92.0 },
            { value: 92.8 }, { value: 93.3 }, { value: 93.9 }, { value: 94.2 },
          ]}
          sparklineColor={SUCCESS_500}
        />
        <MetricCard
          title="Follow-up Compliance"
          value="87.6%"
          trend={3.4}
          trendLabel="vs prev month"
          icon={CalendarCheck}
          iconClassName="bg-info-50 text-info-600"
          sparklineData={[
            { value: 82.1 }, { value: 83.5 }, { value: 84.8 },
            { value: 85.6 }, { value: 86.2 }, { value: 87.0 }, { value: 87.6 },
          ]}
          sparklineColor={INFO_500}
        />
      </div>

      {/* Row 2c: FHIR Sync + Clara AI Accuracy + Live Activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* FHIR Sync Success Rate */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">FHIR Sync</h3>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <DonutChart percentage={98.5} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-foreground">98.5%</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {FHIR_RESOURCE_BREAKDOWN.map((resource) => (
                <div key={resource.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{resource.label}</span>
                  <span className={clsxMerge(
                    "font-medium",
                    resource.rate >= 99 ? "text-success-600" : "text-secondary-700"
                  )}>
                    {resource.rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Sync success rate across all FHIR resource types (30d)
          </p>
        </div>

        {/* Clara AI Acceptance Rate */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Clara Acceptance Rate</h3>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">76.3%</span>
                <TrendingUp className="h-4 w-4 text-success-600" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-success-600">+4.1%</span>
                <span className="text-xs text-muted-foreground">vs prev week</span>
              </div>
            </div>
            <MiniSparkline data={CLARA_ACCEPTANCE_TREND} color={SUCCESS_500} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            76.3% of suggestions accepted by providers
          </p>
        </div>

        {/* Live Activity Feed */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Live Activity</h3>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success-500" />
            </span>
          </div>
          <div className="mt-3 max-h-48 space-y-3 overflow-y-auto">
            {LIVE_ACTIVITY_ENTRIES.map((entry) => {
              const EntryIcon = entry.icon;
              return (
                <div key={entry.id} className="flex items-start gap-2.5">
                  <EntryIcon className={clsxMerge("mt-0.5 h-4 w-4 flex-shrink-0", entry.iconClassName)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/80 truncate">{entry.text}</p>
                    <span className="text-xs text-muted-foreground/70">{entry.timeAgo}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {isRegistrationLoading ? (
          <ChartSkeleton />
        ) : isRegistrationError ? (
          <ErrorState
            title="Registration data unavailable"
            message="Could not load patient registration trends."
            onRetry={refetchRegistration}
          />
        ) : (
          <AreaChartCard
            title="Patient Registrations"
            description="New patient registrations over the last 30 days"
            data={(registrationTrends ?? []) as unknown as Record<string, unknown>[]}
            xAxisKey="date"
            series={[{ dataKey: "count", label: "Registrations", color: PRIMARY_700 }]}
            formatXAxis={formatShortDate}
          />
        )}
        {isVolumeLoading ? (
          <ChartSkeleton />
        ) : isVolumeError ? (
          <ErrorState
            title="Appointment data unavailable"
            message="Could not load appointment volume."
            onRetry={refetchVolume}
          />
        ) : (
          <BarChartCard
            title="Appointment Volume"
            description="Daily appointment counts by status"
            data={(appointmentVolume ?? []) as unknown as Record<string, unknown>[]}
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
      </div>

      {/* Row 4: Infra + Status Distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          {isInfraLoading ? (
            <ChartSkeleton height={220} />
          ) : isInfraError ? (
            <ErrorState
              title="Infrastructure metrics unavailable"
              message="Could not load Prometheus metrics."
              onRetry={refetchInfra}
            />
          ) : (
            <AreaChartCard
              title="Request Rate & Error Rate"
              description="API requests per second and error rate from Prometheus"
              data={infraMetrics ? [
                {
                  label: "Current",
                  requestRate: infraMetrics.prometheus.requestsPerSecond,
                  errorRate: infraMetrics.prometheus.errorRate,
                },
              ] : []}
              xAxisKey="label"
              series={[
                { dataKey: "requestRate", label: "Requests/s", color: PRIMARY_700 },
                { dataKey: "errorRate", label: "Error Rate %", color: ERROR_500 },
              ]}
              height={220}
            />
          )}
        </div>
        {isStatusLoading ? (
          <PieChartSkeleton height={220} />
        ) : isStatusError ? (
          <ErrorState
            title="Status data unavailable"
            compact
            onRetry={refetchStatus}
          />
        ) : (
          <PieChartCard
            title="Appointment Status"
            description="Distribution over the last 30 days"
            data={statusPieData}
            colors={STATUS_COLORS}
            height={220}
            innerRadius={40}
          />
        )}
      </div>

      {/* Row 5: Infrastructure Mini-Cards */}
      {isInfraLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <InfraCardSkeleton key={index} />
          ))}
        </div>
      ) : isInfraError ? null : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">RabbitMQ</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Queue Depth</span>
                <span className="font-medium text-foreground">
                  {infraMetrics?.rabbitMQ.totalMessages ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Publish Rate</span>
                <span className="font-medium text-foreground">
                  {infraMetrics?.rabbitMQ.messagePublishRate ?? "—"} msg/s
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Connections</span>
                <span className="font-medium text-foreground">
                  {infraMetrics?.rabbitMQ.connections ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">PostgreSQL</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Connections</span>
                <span className="font-medium text-foreground">
                  {infraMetrics ? `${infraMetrics.database.activeConnections}/${infraMetrics.database.maxConnections}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total DB Size</span>
                <span className="font-medium text-foreground">
                  {infraMetrics?.database.databaseSizeFormatted ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Transactions</span>
                <span className="font-medium text-foreground">
                  {infraMetrics?.database.transactionsCommitted.toLocaleString() ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">API Performance</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Requests/s</span>
                <span className="font-medium text-foreground">
                  {infraMetrics?.prometheus.requestsPerSecond ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">p95 Latency</span>
                <span className="font-medium text-foreground">
                  {infraMetrics ? `${infraMetrics.prometheus.latencyP95Ms}ms` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Error Rate</span>
                <span className={clsxMerge(
                  "font-medium",
                  infraMetrics && infraMetrics.prometheus.errorRate > 1 ? "text-error-600" : "text-success-600"
                )}>
                  {infraMetrics ? `${infraMetrics.prometheus.errorRate}%` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
