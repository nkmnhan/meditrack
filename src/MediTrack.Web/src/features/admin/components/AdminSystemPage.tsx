import {
  Activity, CheckCircle2, Brain, Users, FileText,
  Clock, AlertTriangle, Info, CheckCircle, Bell, Loader2, XCircle,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";
import { useGetSystemHealthQuery } from "@/features/clara/store/claraApi";
import type { ServiceHealthEntry } from "../types";

/* ── Breadcrumb ── */

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Admin", href: "/admin" },
  { label: "System Health" },
];

/* ── Static data (requires external monitoring integration — out of scope) ── */

const uptimeMetrics = [
  { label: "Overall Uptime", value: "99.97%", sub: "Last 90 days", valueColor: "text-success-700" },
  { label: "Avg Response", value: "142ms", sub: "API gateway", valueColor: "text-success-700" },
  { label: "Active Sessions", value: "23", sub: "Right now", valueColor: "text-primary-700" },
  { label: "Error Rate", value: "0.03%", sub: "Last 24 hours", valueColor: "text-success-700" },
];

type AlertType = "warning" | "info" | "resolved";

interface AlertEntry {
  readonly id: string;
  readonly type: AlertType;
  readonly title: string;
  readonly description: string;
  readonly timestamp: string;
}

const recentAlerts: AlertEntry[] = [
  {
    id: "1",
    type: "warning",
    title: "Medical Records API latency spike",
    description: "Response times exceeded 300ms threshold. Auto-scaling triggered.",
    timestamp: "12 min ago",
  },
  {
    id: "2",
    type: "resolved",
    title: "Database connection pool recovered",
    description: "Connection pool utilization normalized after temporary spike to 92%.",
    timestamp: "1 hr ago",
  },
  {
    id: "3",
    type: "info",
    title: "Scheduled maintenance window",
    description: "Clara AI model update scheduled for tonight at 2:00 AM EST.",
    timestamp: "3 hrs ago",
  },
  {
    id: "4",
    type: "resolved",
    title: "Certificate renewal completed",
    description: "TLS certificates for all services renewed successfully.",
    timestamp: "6 hrs ago",
  },
];

/* ── Style maps ── */

const SERVICE_ICON_MAP: Record<string, { icon: typeof Brain; iconBg: string; iconColor: string }> = {
  "Clara AI Service": { icon: Brain, iconBg: "bg-accent-50", iconColor: "text-accent-600" },
  "Identity API": { icon: Users, iconBg: "bg-warning-50", iconColor: "text-warning-600" },
  "Patient API": { icon: Users, iconBg: "bg-primary-50", iconColor: "text-primary-700" },
  "Appointment API": { icon: Clock, iconBg: "bg-secondary-50", iconColor: "text-secondary-700" },
  "Medical Records API": { icon: FileText, iconBg: "bg-info-50", iconColor: "text-info-600" },
};

const DEFAULT_ICON = { icon: Activity, iconBg: "bg-neutral-50", iconColor: "text-neutral-600" };

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

const ALERT_STYLES: Record<AlertType, { bar: string; badge: string; icon: typeof AlertTriangle; iconColor: string }> = {
  warning: { bar: "bg-warning-500", badge: "border border-warning-500/30 bg-warning-50 text-warning-700", icon: AlertTriangle, iconColor: "text-warning-600" },
  info: { bar: "bg-info-500", badge: "border border-info-500/30 bg-info-50 text-info-700", icon: Info, iconColor: "text-info-600" },
  resolved: { bar: "bg-success-500", badge: "border border-success-500/30 bg-success-50 text-success-700", icon: CheckCircle, iconColor: "text-success-600" },
};

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

/* ── Component ── */

export function AdminSystemPage() {
  const { data: healthData, isLoading, isError } = useGetSystemHealthQuery(undefined, {
    pollingInterval: 30000,
  });

  const services = healthData?.services ?? [];
  const overallStatus = healthData?.overallStatus ?? "Healthy";
  const banner = getOverallBanner(overallStatus);
  const BannerIcon = banner.icon;

  return (
    <div className="space-y-6">
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
          <Activity className="h-5 w-5 text-primary-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">System Health</h1>
          <p className="text-sm text-neutral-500">Real-time service status and performance</p>
        </div>
      </div>

      {/* Status banner */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3 rounded-lg border border-error-200 bg-error-50 px-5 py-4">
          <XCircle className="h-5 w-5 flex-shrink-0 text-error-600" />
          <div>
            <p className="text-sm font-semibold text-error-700">Failed to check system health</p>
            <p className="text-xs text-error-600">Check your connection and try again</p>
          </div>
        </div>
      ) : (
        <div className={clsxMerge("flex items-center gap-3 rounded-lg border px-5 py-4", banner.border)}>
          <BannerIcon className={clsxMerge("h-5 w-5 flex-shrink-0", banner.iconColor)} />
          <div>
            <p className={clsxMerge("text-sm font-semibold", banner.titleColor)}>{banner.title}</p>
            <p className={clsxMerge("text-xs", banner.subColor)}>{banner.sub}</p>
          </div>
        </div>
      )}

      {/* Uptime Metrics (static — requires external monitoring integration) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {uptimeMetrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-neutral-200 bg-white p-5 text-center shadow-sm">
            <p className={clsxMerge("text-3xl font-bold", metric.valueColor)}>{metric.value}</p>
            <p className="mt-0.5 text-sm text-neutral-700">{metric.label}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{metric.sub}</p>
          </div>
        ))}
      </div>

      {/* Service Status Cards (real data) */}
      {!isLoading && !isError && services.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {services.map((service: ServiceHealthEntry) => {
            const iconInfo = SERVICE_ICON_MAP[service.name] ?? DEFAULT_ICON;
            const ServiceIcon = iconInfo.icon;
            const statusKey = (service.status as ServiceStatus) ?? "Unhealthy";
            const statusStyle = SERVICE_STATUS_STYLES[statusKey] ?? SERVICE_STATUS_STYLES.Unhealthy;

            return (
              <div key={service.name} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={clsxMerge("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg", iconInfo.iconBg)}>
                      <ServiceIcon className={clsxMerge("h-5 w-5", iconInfo.iconColor)} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{service.name}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">{service.description}</p>
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
                <div className="mt-4 flex gap-6 border-t border-neutral-200 pt-3">
                  <div>
                    <p className="text-xs text-neutral-500">Response</p>
                    <p className={clsxMerge("mt-0.5 text-sm font-semibold", responseTimeColor(service.responseMs))}>{service.responseMs}ms</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Alerts (static — requires monitoring integration) */}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-6 pb-3 pt-5">
          <Bell className="h-5 w-5 text-neutral-700" />
          <h2 className="font-semibold text-neutral-900">Recent Alerts</h2>
          {recentAlerts.filter((alert) => alert.type === "warning").length > 0 && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-warning-50 text-xs font-semibold text-warning-700">
              {recentAlerts.filter((alert) => alert.type === "warning").length}
            </span>
          )}
        </div>
        <div className="divide-y divide-neutral-100">
          {recentAlerts.map((alert) => {
            const alertStyle = ALERT_STYLES[alert.type];
            const AlertIcon = alertStyle.icon;
            return (
              <div key={alert.id} className="flex gap-3 px-5 py-4">
                <div className={clsxMerge("mt-0.5 w-1 flex-shrink-0 rounded-full", alertStyle.bar)} />
                <AlertIcon className={clsxMerge("mt-0.5 h-4 w-4 flex-shrink-0", alertStyle.iconColor)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-neutral-900">{alert.title}</p>
                    <span className="flex-shrink-0 text-xs text-neutral-500">{alert.timestamp}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-neutral-600">{alert.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
