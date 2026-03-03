import {
  Activity,
  CalendarDays,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
  Users,
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
  }[status] ?? { icon: Activity, label: "Status Unknown", bg: "bg-neutral-50", border: "border-neutral-200", text: "text-neutral-700", iconColor: "text-neutral-500" };

  const StatusIcon = config.icon;

  return (
    <div className={clsxMerge("flex items-center gap-3 rounded-lg border px-4 py-3", config.bg, config.border)}>
      <StatusIcon className={clsxMerge("h-5 w-5", config.iconColor)} />
      <span className={clsxMerge("text-sm font-medium", config.text)}>{config.label}</span>
    </div>
  );
}

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
          <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">
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
          <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-neutral-900">RabbitMQ</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Queue Depth</span>
                <span className="font-medium text-neutral-900">
                  {infraMetrics?.rabbitMQ.totalMessages ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Publish Rate</span>
                <span className="font-medium text-neutral-900">
                  {infraMetrics?.rabbitMQ.messagePublishRate ?? "—"} msg/s
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Connections</span>
                <span className="font-medium text-neutral-900">
                  {infraMetrics?.rabbitMQ.connections ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-neutral-900">PostgreSQL</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Connections</span>
                <span className="font-medium text-neutral-900">
                  {infraMetrics ? `${infraMetrics.database.activeConnections}/${infraMetrics.database.maxConnections}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Total DB Size</span>
                <span className="font-medium text-neutral-900">
                  {infraMetrics?.database.databaseSizeFormatted ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Transactions</span>
                <span className="font-medium text-neutral-900">
                  {infraMetrics?.database.transactionsCommitted.toLocaleString() ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-neutral-900">API Performance</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Requests/s</span>
                <span className="font-medium text-neutral-900">
                  {infraMetrics?.prometheus.requestsPerSecond ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">p95 Latency</span>
                <span className="font-medium text-neutral-900">
                  {infraMetrics ? `${infraMetrics.prometheus.latencyP95Ms}ms` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Error Rate</span>
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
