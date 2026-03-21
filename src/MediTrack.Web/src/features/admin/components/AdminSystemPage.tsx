import { useState } from "react";
import {
  Activity, CheckCircle2, Sparkles, Users, FileText, Server,
  Clock, AlertTriangle, Info, CheckCircle, Bell, XCircle,
  HeartPulse, Target,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";
import {
  useGetSystemHealthQuery,
  useGetInfrastructureMetricsQuery,
  useGetMetricsTimeseriesQuery,
} from "@/features/clara/store/claraApi";
import type { ServiceHealthEntry } from "../types";
import {
  AreaChartCard,
  ChartSkeleton,
  MetricCardSkeleton,
  InfraCardSkeleton,
  ErrorState,
} from "./charts";
import { AutoRefreshIndicator } from "./AutoRefreshIndicator";
import { PRIMARY_700, ERROR_500, WARNING_500 } from "@/shared/utils/chartColors";

/* ── Breadcrumb ── */

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/dashboard" },
  { label: "Admin", href: "/admin" },
  { label: "System Health" },
];

/* ── Style maps ── */

const SERVICE_ICON_MAP: Record<string, { icon: typeof Sparkles; iconBg: string; iconColor: string }> = {
  "Clara AI Service": { icon: Sparkles, iconBg: "bg-accent-50", iconColor: "text-accent-600" },
  "Identity API": { icon: Users, iconBg: "bg-warning-50", iconColor: "text-warning-600" },
  "Patient API": { icon: Users, iconBg: "bg-primary-50", iconColor: "text-primary-700" },
  "Appointment API": { icon: Clock, iconBg: "bg-secondary-50", iconColor: "text-secondary-700" },
  "Medical Records API": { icon: FileText, iconBg: "bg-info-50", iconColor: "text-info-600" },
  "Notification Worker": { icon: Bell, iconBg: "bg-muted", iconColor: "text-muted-foreground" },
};

const DEFAULT_ICON = { icon: Server, iconBg: "bg-muted", iconColor: "text-muted-foreground" };

type ServiceStatus = "Healthy" | "Degraded" | "Unhealthy";

const SERVICE_STATUS_STYLES: Record<ServiceStatus, { dot: string; badge: string; label: string }> = {
  Healthy: {
    dot: "bg-success-500",
    badge: "border border-success-500/30 bg-success-50 text-success-700",
    label: "Operational",
  },
  Degraded: {
    dot: "bg-warning-500",
    badge: "border border-warning-500/30 bg-warning-50 text-warning-700",
    label: "Degraded",
  },
  Unhealthy: {
    dot: "bg-error-500",
    badge: "border border-error-500/30 bg-error-50 text-error-700",
    label: "Down",
  },
};

function responseTimeColor(ms: number): string {
  if (ms <= 100) return "text-success-700";
  if (ms <= 200) return "text-warning-700";
  return "text-error-700";
}

function dependencyStatusDot(status: string): string {
  if (status === "Healthy") return "bg-success-500";
  if (status === "Degraded") return "bg-warning-500";
  return "bg-error-500";
}

type AlertType = "warning" | "info" | "resolved";

interface DerivedAlert {
  readonly id: string;
  readonly type: AlertType;
  readonly title: string;
  readonly description: string;
}

const ALERT_STYLES: Record<AlertType, { bar: string; badge: string; icon: typeof AlertTriangle; iconColor: string }> = {
  warning: { bar: "bg-warning-500", badge: "border border-warning-500/30 bg-warning-50 text-warning-700", icon: AlertTriangle, iconColor: "text-warning-600" },
  info: { bar: "bg-info-500", badge: "border border-info-500/30 bg-info-50 text-info-700", icon: Info, iconColor: "text-info-600" },
  resolved: { bar: "bg-success-500", badge: "border border-success-500/30 bg-success-50 text-success-700", icon: CheckCircle, iconColor: "text-success-600" },
};

const RANGE_OPTIONS = [
  { label: "1h", value: "1h" },
  { label: "6h", value: "6h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
] as const;

function getOverallBanner(overallStatus: string) {
  if (overallStatus === "Unhealthy") {
    return {
      border: "border-error-200 bg-error-50",
      icon: XCircle,
      iconColor: "text-error-600",
      title: "Service disruption detected",
      titleColor: "text-error-700",
      sub: "One or more services are unreachable",
      subColor: "text-error-600",
    };
  }
  if (overallStatus === "Degraded") {
    return {
      border: "border-warning-200 bg-warning-50",
      icon: AlertTriangle,
      iconColor: "text-warning-600",
      title: "Some services degraded",
      titleColor: "text-warning-700",
      sub: "Performance may be affected",
      subColor: "text-warning-600",
    };
  }
  return {
    border: "border-success-200 bg-success-50",
    icon: CheckCircle2,
    iconColor: "text-success-600",
    title: "All systems operational",
    titleColor: "text-success-700",
    sub: "All services responding normally",
    subColor: "text-success-600",
  };
}

function deriveAlerts(
  services: ServiceHealthEntry[],
  errorRate: number,
  latencyP95: number,
  queueDepth: number,
  dbConnectionRatio: number,
): DerivedAlert[] {
  const alerts: DerivedAlert[] = [];
  let alertId = 0;

  for (const service of services) {
    if (service.status === "Unhealthy") {
      alerts.push({
        id: String(++alertId),
        type: "warning",
        title: `${service.name} is down`,
        description: `Service is unreachable. Response time: ${service.responseMs}ms.`,
      });
    } else if (service.status === "Degraded") {
      alerts.push({
        id: String(++alertId),
        type: "warning",
        title: `${service.name} is degraded`,
        description: `Service is responding but some checks failed.`,
      });
    }
  }

  if (errorRate > 5) {
    alerts.push({
      id: String(++alertId),
      type: "warning",
      title: "High error rate detected",
      description: `Current error rate is ${errorRate}%, exceeding 5% threshold.`,
    });
  }

  if (latencyP95 > 500) {
    alerts.push({
      id: String(++alertId),
      type: "warning",
      title: "High API latency",
      description: `p95 latency is ${latencyP95}ms, exceeding 500ms threshold.`,
    });
  }

  if (queueDepth > 1000) {
    alerts.push({
      id: String(++alertId),
      type: "warning",
      title: "Deep message queue",
      description: `${queueDepth} messages pending in RabbitMQ queues.`,
    });
  }

  if (dbConnectionRatio > 0.8) {
    alerts.push({
      id: String(++alertId),
      type: "warning",
      title: "High database connection usage",
      description: `${Math.round(dbConnectionRatio * 100)}% of max connections in use.`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "0",
      type: "resolved",
      title: "No active alerts",
      description: "All metrics are within normal thresholds.",
    });
  }

  return alerts;
}

function formatTimeLabel(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const HEALTH_POLLING_MS = 30000;

/* ── FHIR Endpoint Demo Data ── */

interface FhirResourceStatus {
  readonly name: string;
  readonly status: "Healthy" | "Degraded" | "Unhealthy";
}

const FHIR_RESOURCE_STATUSES: FhirResourceStatus[] = [
  { name: "Patient", status: "Healthy" },
  { name: "Observation", status: "Healthy" },
  { name: "Encounter", status: "Healthy" },
  { name: "Condition", status: "Healthy" },
];

const FHIR_DEMO = {
  status: "Healthy" as const,
  responseMs: 45,
  conformanceCheck: "Passed" as const,
};

/* ── Uptime SLA ── */

const SLA_TARGET_PERCENT = 99.9;
const CURRENT_UPTIME_PERCENT = 99.95;

function uptimeColor(uptimePercent: number): string {
  if (uptimePercent >= SLA_TARGET_PERCENT) return "text-success-700";
  if (uptimePercent >= 99) return "text-warning-700";
  return "text-error-700";
}

function uptimeBgColor(uptimePercent: number): string {
  if (uptimePercent >= SLA_TARGET_PERCENT) return "bg-success-50 border-success-200";
  if (uptimePercent >= 99) return "bg-warning-50 border-warning-200";
  return "bg-error-50 border-error-200";
}

/* ── Component ── */

export function AdminSystemPage() {
  const [timeRange, setTimeRange] = useState<string>("6h");

  const {
    data: healthData,
    isLoading: isHealthLoading,
    isError: isHealthError,
    isFetching: isHealthFetching,
    fulfilledTimeStamp: healthTimestamp,
    refetch: refetchHealth,
  } = useGetSystemHealthQuery(undefined, {
    pollingInterval: HEALTH_POLLING_MS,
  });
  const {
    data: infraMetrics,
    isLoading: isInfraLoading,
    isError: isInfraError,
    refetch: refetchInfra,
  } = useGetInfrastructureMetricsQuery(undefined, {
    pollingInterval: HEALTH_POLLING_MS,
  });
  const {
    data: requestRateTimeSeries,
    isLoading: isRequestRateLoading,
    isError: isRequestRateError,
    refetch: refetchRequestRate,
  } = useGetMetricsTimeseriesQuery(
    { metric: "request_rate", range: timeRange },
    { pollingInterval: HEALTH_POLLING_MS }
  );
  const {
    data: errorRateTimeSeries,
    isLoading: isErrorRateLoading,
    isError: isErrorRateError,
    refetch: refetchErrorRate,
  } = useGetMetricsTimeseriesQuery(
    { metric: "error_rate", range: timeRange },
    { pollingInterval: HEALTH_POLLING_MS }
  );
  const {
    data: latencyTimeSeries,
    isLoading: isLatencyLoading,
    isError: isLatencyError,
    refetch: refetchLatency,
  } = useGetMetricsTimeseriesQuery(
    { metric: "latency_p95", range: timeRange },
    { pollingInterval: HEALTH_POLLING_MS }
  );

  const services = healthData?.services ?? [];
  const overallStatus = healthData?.overallStatus ?? "Healthy";
  const banner = getOverallBanner(overallStatus);
  const BannerIcon = banner.icon;

  const errorRate = infraMetrics?.prometheus.errorRate ?? 0;
  const latencyP95 = infraMetrics?.prometheus.latencyP95Ms ?? 0;
  const requestsPerSec = infraMetrics?.prometheus.requestsPerSecond ?? 0;
  const dbConnections = infraMetrics?.database.activeConnections ?? 0;
  const dbMaxConnections = infraMetrics?.database.maxConnections ?? 100;
  const dbConnectionRatio = dbMaxConnections > 0 ? dbConnections / dbMaxConnections : 0;

  const alerts = deriveAlerts(
    services, errorRate, latencyP95,
    infraMetrics?.rabbitMQ.totalMessages ?? 0,
    dbConnectionRatio
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
            <Activity className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">System Health</h1>
            <p className="text-sm text-muted-foreground">Real-time service status and infrastructure metrics</p>
          </div>
        </div>
        <AutoRefreshIndicator
          pollingIntervalMs={HEALTH_POLLING_MS}
          lastFetchTimestamp={healthTimestamp}
          isFetching={isHealthFetching}
        />
      </div>

      {/* Status banner */}
      {isHealthLoading ? (
        <div className="h-14 animate-pulse rounded-lg bg-muted" />
      ) : isHealthError ? (
        <ErrorState
          title="Failed to check system health"
          message="Check your connection and try again."
          onRetry={refetchHealth}
          compact
        />
      ) : (
        <div className={clsxMerge("flex items-center gap-3 rounded-lg border px-5 py-4", banner.border)}>
          <BannerIcon className={clsxMerge("h-5 w-5 flex-shrink-0", banner.iconColor)} />
          <div>
            <p className={clsxMerge("text-sm font-semibold", banner.titleColor)}>{banner.title}</p>
            <p className={clsxMerge("text-xs", banner.subColor)}>{banner.sub}</p>
          </div>
        </div>
      )}

      {/* Live Metrics (from Prometheus + infrastructure) */}
      {isInfraLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <MetricCardSkeleton key={index} />
          ))}
        </div>
      ) : isInfraError ? (
        <ErrorState
          title="Infrastructure metrics unavailable"
          message="Could not fetch Prometheus/database/RabbitMQ metrics."
          onRetry={refetchInfra}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-5 text-center shadow-sm">
            <p className={clsxMerge("text-3xl font-bold", errorRate > 1 ? "text-error-700" : "text-success-700")}>
              {errorRate}%
            </p>
            <p className="mt-0.5 text-sm text-foreground/80">Error Rate</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Last 5 minutes</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 text-center shadow-sm">
            <p className={clsxMerge("text-3xl font-bold", latencyP95 > 300 ? "text-warning-700" : "text-success-700")}>
              {latencyP95}ms
            </p>
            <p className="mt-0.5 text-sm text-foreground/80">p95 Latency</p>
            <p className="mt-0.5 text-xs text-muted-foreground">API gateway</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-primary-700">{requestsPerSec}</p>
            <p className="mt-0.5 text-sm text-foreground/80">Requests/sec</p>
            <p className="mt-0.5 text-xs text-muted-foreground">All services</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 text-center shadow-sm">
            <p className={clsxMerge("text-3xl font-bold", dbConnectionRatio > 0.8 ? "text-warning-700" : "text-primary-700")}>
              {dbConnections}/{dbMaxConnections}
            </p>
            <p className="mt-0.5 text-sm text-foreground/80">DB Connections</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Active / max</p>
          </div>
        </div>
      )}

      {/* Service Status Cards (real data with dependency breakdown) */}
      {isHealthLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-border" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-border" />
                  <div className="h-3 w-48 rounded bg-muted" />
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-3">
                <div className="h-3 w-40 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : !isHealthError && services.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* FHIR R4 Endpoint Card */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary-50">
                  <HeartPulse className="h-5 w-5 text-secondary-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">FHIR R4 Endpoint</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">HL7 FHIR R4 interoperability layer</p>
                </div>
              </div>
              <span className={clsxMerge(
                "inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                SERVICE_STATUS_STYLES[FHIR_DEMO.status].badge
              )}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className={clsxMerge("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", SERVICE_STATUS_STYLES[FHIR_DEMO.status].dot)} />
                  <span className={clsxMerge("relative inline-flex h-1.5 w-1.5 rounded-full", SERVICE_STATUS_STYLES[FHIR_DEMO.status].dot)} />
                </span>
                {SERVICE_STATUS_STYLES[FHIR_DEMO.status].label}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Response</p>
                <p className={clsxMerge("mt-0.5 text-sm font-semibold", responseTimeColor(FHIR_DEMO.responseMs))}>{FHIR_DEMO.responseMs}ms</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conformance</p>
                <p className={clsxMerge(
                  "mt-0.5 text-sm font-semibold",
                  FHIR_DEMO.conformanceCheck === "Passed" ? "text-success-700" : "text-error-700"
                )}>
                  {FHIR_DEMO.conformanceCheck}
                </p>
              </div>
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Resource Types</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {FHIR_RESOURCE_STATUSES.map((resource) => (
                  <div key={resource.name} className="flex items-center gap-1.5">
                    <span className={clsxMerge("h-2 w-2 rounded-full", dependencyStatusDot(resource.status))} />
                    <span className="text-xs text-muted-foreground">{resource.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {services.map((service: ServiceHealthEntry) => {
            const iconInfo = SERVICE_ICON_MAP[service.name] ?? DEFAULT_ICON;
            const ServiceIcon = iconInfo.icon;
            const statusKey = (service.status as ServiceStatus) ?? "Unhealthy";
            const statusStyle = SERVICE_STATUS_STYLES[statusKey] ?? SERVICE_STATUS_STYLES.Unhealthy;

            return (
              <div key={service.name} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={clsxMerge("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg", iconInfo.iconBg)}>
                      <ServiceIcon className={clsxMerge("h-5 w-5", iconInfo.iconColor)} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{service.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  <span className={clsxMerge("inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyle.badge)}>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className={clsxMerge("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", statusStyle.dot)} />
                      <span className={clsxMerge("relative inline-flex h-1.5 w-1.5 rounded-full", statusStyle.dot)} />
                    </span>
                    {statusStyle.label}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Response</p>
                    <p className={clsxMerge("mt-0.5 text-sm font-semibold", responseTimeColor(service.responseMs))}>{service.responseMs}ms</p>
                  </div>
                  {service.dependencies?.map((dependency) => (
                    <div key={dependency.name} className="flex items-center gap-1.5">
                      <span className={clsxMerge("h-2 w-2 rounded-full", dependencyStatusDot(dependency.status))} />
                      <span className="text-xs text-muted-foreground">{dependency.name}</span>
                      <span className="text-xs text-muted-foreground/70">{dependency.durationMs}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Time-series Charts */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-foreground">Performance Trends</h2>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-0.5 shadow-sm">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              className={clsxMerge(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                timeRange === option.value
                  ? "bg-primary-700 text-white"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {isRequestRateLoading ? (
          <ChartSkeleton />
        ) : isRequestRateError ? (
          <ErrorState
            title="Request rate unavailable"
            message="Could not load time-series data from Prometheus."
            onRetry={refetchRequestRate}
          />
        ) : (
          <AreaChartCard
            title="Request Rate"
            description="Requests per second by service"
            data={(requestRateTimeSeries?.data ?? []) as unknown as Record<string, unknown>[]}
            xAxisKey="timestamp"
            series={[{ dataKey: "value", label: "req/s", color: PRIMARY_700 }]}
            formatXAxis={formatTimeLabel}
          />
        )}
        {isErrorRateLoading ? (
          <ChartSkeleton />
        ) : isErrorRateError ? (
          <ErrorState
            title="Error rate unavailable"
            message="Could not load time-series data from Prometheus."
            onRetry={refetchErrorRate}
          />
        ) : (
          <AreaChartCard
            title="Error Rate"
            description="Error percentage across all services"
            data={(errorRateTimeSeries?.data ?? []) as unknown as Record<string, unknown>[]}
            xAxisKey="timestamp"
            series={[{ dataKey: "value", label: "Error %", color: ERROR_500 }]}
            formatXAxis={formatTimeLabel}
          />
        )}
      </div>

      {isLatencyLoading ? (
        <ChartSkeleton height={220} />
      ) : isLatencyError ? (
        <ErrorState
          title="Latency data unavailable"
          message="Could not load p95 latency from Prometheus."
          onRetry={refetchLatency}
        />
      ) : (
        <AreaChartCard
          title="p95 Latency"
          description="95th percentile response time in milliseconds"
          data={(latencyTimeSeries?.data ?? []) as unknown as Record<string, unknown>[]}
          xAxisKey="timestamp"
          series={[{ dataKey: "value", label: "ms", color: WARNING_500 }]}
          formatXAxis={formatTimeLabel}
          height={220}
        />
      )}

      {/* Uptime SLA Indicator */}
      <div className={clsxMerge("rounded-lg border p-5 shadow-sm", uptimeBgColor(CURRENT_UPTIME_PERCENT))}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Target className={clsxMerge("h-5 w-5 flex-shrink-0", uptimeColor(CURRENT_UPTIME_PERCENT))} />
            <div>
              <div className="flex items-baseline gap-2">
                <p className={clsxMerge("text-2xl font-bold", uptimeColor(CURRENT_UPTIME_PERCENT))}>
                  {CURRENT_UPTIME_PERCENT}%
                </p>
                <span className="text-sm text-muted-foreground">current uptime</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                SLA Target: {SLA_TARGET_PERCENT}% — {" "}
                <span className={clsxMerge(
                  "font-semibold",
                  CURRENT_UPTIME_PERCENT >= SLA_TARGET_PERCENT ? "text-success-700" : "text-error-700"
                )}>
                  {CURRENT_UPTIME_PERCENT >= SLA_TARGET_PERCENT ? "Above Target" : "Below Target"}
                </span>
              </p>
            </div>
          </div>
          {CURRENT_UPTIME_PERCENT < SLA_TARGET_PERCENT && (
            <div className="flex items-center gap-2 rounded-md border border-error-200 bg-error-50 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-error-600" />
              <p className="text-xs font-medium text-error-700">Uptime is below SLA target of {SLA_TARGET_PERCENT}%</p>
            </div>
          )}
        </div>
        {/* Visual SLA bar */}
        <div className="mt-4">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-border">
            <div
              className={clsxMerge(
                "h-full rounded-full transition-all",
                CURRENT_UPTIME_PERCENT >= SLA_TARGET_PERCENT ? "bg-success-500" : CURRENT_UPTIME_PERCENT >= 99 ? "bg-warning-500" : "bg-error-500"
              )}
              style={{ width: `${Math.min(CURRENT_UPTIME_PERCENT, 100)}%` }}
            />
            {/* Dashed SLA target line */}
            <div
              className="absolute top-0 h-full border-r-2 border-dashed border-error-500"
              style={{ left: `${SLA_TARGET_PERCENT}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span className="text-error-600 font-medium">{SLA_TARGET_PERCENT}% target</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Infrastructure Panels */}
      {isInfraLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <InfraCardSkeleton key={index} />
          ))}
        </div>
      ) : isInfraError ? null : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* RabbitMQ Panel */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">RabbitMQ</h3>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Queue Depth</span>
                <span className={clsxMerge("font-medium", (infraMetrics?.rabbitMQ.totalMessages ?? 0) > 1000 ? "text-warning-700" : "text-foreground")}>
                  {infraMetrics?.rabbitMQ.totalMessages ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Publish Rate</span>
                <span className="font-medium text-foreground">{infraMetrics?.rabbitMQ.messagePublishRate ?? "—"} msg/s</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Deliver Rate</span>
                <span className="font-medium text-foreground">{infraMetrics?.rabbitMQ.messageDeliverRate ?? "—"} msg/s</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Connections</span>
                <span className="font-medium text-foreground">{infraMetrics?.rabbitMQ.connections ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Channels</span>
                <span className="font-medium text-foreground">{infraMetrics?.rabbitMQ.channels ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* PostgreSQL Panel */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">PostgreSQL</h3>
            <div className="mt-3 space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Connection Pool</span>
                  <span className="font-medium text-foreground">
                    {infraMetrics ? `${infraMetrics.database.activeConnections}/${infraMetrics.database.maxConnections}` : "—"}
                  </span>
                </div>
                {infraMetrics && (
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={clsxMerge(
                        "h-full rounded-full transition-all",
                        dbConnectionRatio > 0.8 ? "bg-warning-500" : dbConnectionRatio > 0.6 ? "bg-primary-400" : "bg-success-500"
                      )}
                      style={{ width: `${Math.min(dbConnectionRatio * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total DB Size</span>
                <span className="font-medium text-foreground">{infraMetrics?.database.databaseSizeFormatted ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Commits</span>
                <span className="font-medium text-foreground">{infraMetrics?.database.transactionsCommitted.toLocaleString() ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rollbacks</span>
                <span className={clsxMerge("font-medium", (infraMetrics?.database.transactionsRolledBack ?? 0) > 0 ? "text-warning-700" : "text-foreground")}>
                  {infraMetrics?.database.transactionsRolledBack.toLocaleString() ?? "—"}
                </span>
              </div>
            </div>
            {/* Database sizes */}
            {infraMetrics && infraMetrics.database.databases.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">Databases</p>
                <div className="mt-1.5 space-y-1">
                  {infraMetrics.database.databases.map((database) => (
                    <div key={database.name} className="flex items-center justify-between text-xs">
                      <span className="truncate text-muted-foreground">{database.name}</span>
                      <span className="flex-shrink-0 text-foreground">{database.sizeFormatted}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Queues Panel */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">Message Queues</h3>
            {infraMetrics && infraMetrics.rabbitMQ.queues.length > 0 ? (
              <div className="mt-3 space-y-2">
                {infraMetrics.rabbitMQ.queues.map((queue) => (
                  <div key={queue.name} className="rounded-md border border-border p-2.5">
                    <p className="truncate text-xs font-medium text-foreground">{queue.name}</p>
                    <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                      <span>{queue.messages} msgs</span>
                      <span>{queue.consumers} consumers</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground/70">No queues found</p>
            )}
          </div>
        </div>
      )}

      {/* Derived Alerts */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-6 pb-3 pt-5">
          <Bell className="h-5 w-5 text-foreground/80" />
          <h2 className="font-semibold text-foreground">Active Alerts</h2>
          {alerts.filter((alert) => alert.type === "warning").length > 0 && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-warning-50 text-xs font-semibold text-warning-700">
              {alerts.filter((alert) => alert.type === "warning").length}
            </span>
          )}
        </div>
        <div className="divide-y divide-neutral-100">
          {alerts.map((alert) => {
            const alertStyle = ALERT_STYLES[alert.type];
            const AlertIcon = alertStyle.icon;
            return (
              <div key={alert.id} className="flex gap-3 px-5 py-4">
                <div className={clsxMerge("mt-0.5 w-1 flex-shrink-0 rounded-full", alertStyle.bar)} />
                <AlertIcon className={clsxMerge("mt-0.5 h-4 w-4 flex-shrink-0", alertStyle.iconColor)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{alert.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
