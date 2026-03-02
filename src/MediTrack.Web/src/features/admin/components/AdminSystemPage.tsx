import {
  Activity, CheckCircle2, Brain, Users, FileText,
  Clock, AlertTriangle, Info, CheckCircle, Bell,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";

/* ── Breadcrumb ── */

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Admin", href: "/admin" },
  { label: "System Health" },
];

/* ── Mock data ── */

const uptimeMetrics = [
  { label: "Overall Uptime", value: "99.97%", sub: "Last 90 days", valueColor: "text-success-700" },
  { label: "Avg Response", value: "142ms", sub: "API gateway", valueColor: "text-success-700" },
  { label: "Active Sessions", value: "23", sub: "Right now", valueColor: "text-primary-700" },
  { label: "Error Rate", value: "0.03%", sub: "Last 24 hours", valueColor: "text-success-700" },
];

type ServiceStatus = "Operational" | "Degraded";

interface ServiceInfo {
  readonly name: string;
  readonly description: string;
  readonly icon: typeof Brain;
  readonly status: ServiceStatus;
  readonly uptime: string;
  readonly responseMs: number;
  readonly iconBg: string;
  readonly iconColor: string;
}

const services: ServiceInfo[] = [
  { name: "Clara AI Service", description: "MCP server + session orchestration", icon: Brain, status: "Operational", uptime: "99.99%", responseMs: 89, iconBg: "bg-accent-50", iconColor: "text-accent-600" },
  { name: "Patient API", description: "Patient CRUD + demographics", icon: Users, status: "Operational", uptime: "99.98%", responseMs: 54, iconBg: "bg-primary-50", iconColor: "text-primary-700" },
  { name: "Appointment Service", description: "Calendar + scheduling engine", icon: Clock, status: "Operational", uptime: "99.97%", responseMs: 71, iconBg: "bg-secondary-50", iconColor: "text-secondary-700" },
  { name: "Medical Records API", description: "EHR read/write + FHIR bridge", icon: FileText, status: "Degraded", uptime: "98.21%", responseMs: 340, iconBg: "bg-warning-50", iconColor: "text-warning-600" },
];

const SERVICE_STATUS_STYLES: Record<ServiceStatus, { dot: string; badge: string; label: string }> = {
  Operational: {
    dot: "bg-success-500",
    badge: "border border-success-500/30 bg-success-50 text-success-700",
    label: "Operational",
  },
  Degraded: {
    dot: "bg-warning-500",
    badge: "border border-warning-500/30 bg-warning-50 text-warning-700",
    label: "Degraded",
  },
};

function responseTimeColor(ms: number): string {
  if (ms <= 100) return "text-success-700";
  if (ms <= 200) return "text-warning-700";
  return "text-error-700";
}

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
  {
    id: "5",
    type: "warning",
    title: "Elevated error rate on Patient API",
    description: "Error rate briefly reached 0.5% due to upstream timeout. Resolved after retry.",
    timestamp: "1 day ago",
  },
];

const ALERT_STYLES: Record<AlertType, { bar: string; badge: string; icon: typeof AlertTriangle; iconColor: string }> = {
  warning: { bar: "bg-warning-500", badge: "border border-warning-500/30 bg-warning-50 text-warning-700", icon: AlertTriangle, iconColor: "text-warning-600" },
  info: { bar: "bg-info-500", badge: "border border-info-500/30 bg-info-50 text-info-700", icon: Info, iconColor: "text-info-600" },
  resolved: { bar: "bg-success-500", badge: "border border-success-500/30 bg-success-50 text-success-700", icon: CheckCircle, iconColor: "text-success-600" },
};

/* ── Component ── */

export function AdminSystemPage() {
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

      {/* All systems operational banner */}
      <div className="flex items-center gap-3 rounded-lg border border-success-200 bg-success-50 px-5 py-4">
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success-600" />
        <div>
          <p className="text-sm font-semibold text-success-700">All systems operational</p>
          <p className="text-xs text-success-600">Last checked 30 seconds ago</p>
        </div>
      </div>

      {/* Uptime Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {uptimeMetrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-neutral-200 bg-white p-5 text-center shadow-sm">
            <p className={clsxMerge("text-3xl font-bold", metric.valueColor)}>{metric.value}</p>
            <p className="mt-0.5 text-sm text-neutral-700">{metric.label}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{metric.sub}</p>
          </div>
        ))}
      </div>

      {/* Service Status Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {services.map((service) => {
          const statusStyle = SERVICE_STATUS_STYLES[service.status];
          return (
            <div key={service.name} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={clsxMerge("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg", service.iconBg)}>
                    <service.icon className={clsxMerge("h-5 w-5", service.iconColor)} />
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
                  <p className="text-xs text-neutral-500">Uptime</p>
                  <p className="mt-0.5 text-sm font-semibold text-neutral-900">{service.uptime}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Response</p>
                  <p className={clsxMerge("mt-0.5 text-sm font-semibold", responseTimeColor(service.responseMs))}>{service.responseMs}ms</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Alerts */}
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
