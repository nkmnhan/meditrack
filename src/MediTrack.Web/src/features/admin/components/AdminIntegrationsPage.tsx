import { useState } from "react";
import {
  Cable, CheckCircle2, AlertTriangle, XCircle, Settings2,
  Clock, Database, ExternalLink, ChevronDown, RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";

/* -- Types -- */

type IntegrationStatus = "connected" | "degraded" | "disconnected" | "not_configured";
type SyncEntryStatus = "success" | "partial" | "failed";

interface SyncError {
  readonly resourceType: string;
  readonly resourceId: string;
  readonly errorMessage: string;
  readonly timestamp: string;
}

interface SyncHistoryEntry {
  readonly timestamp: string;
  readonly recordsSynced: number;
  readonly duration: string;
  readonly status: SyncEntryStatus;
  readonly details: string;
}

interface EhrIntegration {
  readonly name: string;
  readonly description: string;
  readonly status: IntegrationStatus;
  readonly lastSync: string;
  readonly recordCount: string;
  readonly syncErrors?: readonly SyncError[];
  readonly syncHistory?: readonly SyncHistoryEntry[];
}

/* -- Breadcrumb -- */

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/dashboard" },
  { label: "Admin", href: "/admin" },
  { label: "Integrations" },
];

/* -- Demo data -- */

const SYNC_ERRORS: SyncError[] = [
  {
    resourceType: "Patient",
    resourceId: "PT-2024-042",
    errorMessage: "Validation error — missing required field 'birthDate'",
    timestamp: "Today at 14:32",
  },
  {
    resourceType: "Encounter",
    resourceId: "ENC-2024-187",
    errorMessage: "Reference integrity — linked Practitioner PR-0091 not found",
    timestamp: "Today at 11:05",
  },
  {
    resourceType: "Observation",
    resourceId: "OBS-2024-319",
    errorMessage: "Invalid code system — LOINC code 9999-0 not recognized",
    timestamp: "Today at 08:47",
  },
];

const SYNC_HISTORY: SyncHistoryEntry[] = [
  {
    timestamp: "Today at 14:30",
    recordsSynced: 312,
    duration: "4.2s",
    status: "partial",
    details: "3 records failed validation",
  },
  {
    timestamp: "Today at 12:00",
    recordsSynced: 589,
    duration: "6.8s",
    status: "success",
    details: "All records synced successfully",
  },
  {
    timestamp: "Today at 08:00",
    recordsSynced: 421,
    duration: "5.1s",
    status: "success",
    details: "All records synced successfully",
  },
  {
    timestamp: "Yesterday at 20:00",
    recordsSynced: 0,
    duration: "1.2s",
    status: "failed",
    details: "Connection timeout — retried 3 times",
  },
  {
    timestamp: "Yesterday at 16:00",
    recordsSynced: 738,
    duration: "8.4s",
    status: "success",
    details: "All records synced successfully",
  },
];

const INTEGRATIONS: EhrIntegration[] = [
  {
    name: "MediTrack Internal",
    description: "Internal EHR system — direct API via Duende IdentityServer",
    status: "connected",
    lastSync: "2 minutes ago",
    recordCount: "12,847",
    syncErrors: SYNC_ERRORS,
    syncHistory: SYNC_HISTORY,
  },
  {
    name: "Epic FHIR",
    description: "Epic EHR integration via SMART on FHIR (RS384 JWT Bearer Grant)",
    status: "not_configured",
    lastSync: "\u2014",
    recordCount: "\u2014",
  },
  {
    name: "Cerner OAuth2",
    description: "Cerner EHR integration via OAuth2 Client Credentials Flow",
    status: "not_configured",
    lastSync: "\u2014",
    recordCount: "\u2014",
  },
  {
    name: "Generic FHIR",
    description: "Generic FHIR R4 endpoint — configurable Bearer/Basic/None auth",
    status: "not_configured",
    lastSync: "\u2014",
    recordCount: "\u2014",
  },
];

/* -- Status configuration -- */

const STATUS_CONFIG: Record<IntegrationStatus, {
  label: string;
  icon: typeof CheckCircle2;
  badgeClasses: string;
  dotColor: string;
}> = {
  connected: {
    label: "Connected",
    icon: CheckCircle2,
    badgeClasses: "border border-success-500/30 bg-success-50 text-success-700",
    dotColor: "bg-success-500",
  },
  degraded: {
    label: "Degraded",
    icon: AlertTriangle,
    badgeClasses: "border border-warning-500/30 bg-warning-50 text-warning-700",
    dotColor: "bg-warning-500",
  },
  disconnected: {
    label: "Disconnected",
    icon: XCircle,
    badgeClasses: "border border-error-500/30 bg-error-50 text-error-700",
    dotColor: "bg-error-500",
  },
  not_configured: {
    label: "Not Configured",
    icon: Settings2,
    badgeClasses: "border border-border bg-muted text-muted-foreground",
    dotColor: "bg-border",
  },
};

const SYNC_STATUS_CONFIG: Record<SyncEntryStatus, {
  icon: typeof CheckCircle2;
  iconClass: string;
  labelClass: string;
  label: string;
}> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-success-600",
    labelClass: "text-success-700",
    label: "Success",
  },
  partial: {
    icon: AlertTriangle,
    iconClass: "text-warning-600",
    labelClass: "text-warning-700",
    label: "Partial",
  },
  failed: {
    icon: XCircle,
    iconClass: "text-error-600",
    labelClass: "text-error-700",
    label: "Failed",
  },
};

/* -- Helpers -- */

function getActiveCount(integrations: EhrIntegration[]): number {
  return integrations.filter(
    (integration) => integration.status === "connected" || integration.status === "degraded"
  ).length;
}

/* -- Sub-components -- */

function SyncErrorDetails({ syncErrors }: { readonly syncErrors: readonly SyncError[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (syncErrors.length === 0) return null;

  return (
    <div className="mt-3 rounded-md border border-error-200 bg-error-50">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsxMerge(
          "flex h-10 w-full items-center justify-between gap-2 px-3 text-left text-xs font-medium text-error-700",
          "hover:bg-error-100/50 transition-colors rounded-md"
        )}
      >
        <span className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {syncErrors.length} failed sync{syncErrors.length !== 1 ? "s" : ""} in last 24h
        </span>
        <ChevronDown
          className={clsxMerge(
            "h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-error-200 px-3 pb-3 pt-2 space-y-2">
          {syncErrors.map((syncError) => (
            <div
              key={`${syncError.resourceType}-${syncError.resourceId}`}
              className="rounded border border-error-200 bg-card p-2.5"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-semibold text-error-700">
                  {syncError.resourceType} {syncError.resourceId}
                </span>
                <span className="text-[10px] text-error-600">{syncError.timestamp}</span>
              </div>
              <p className="mt-1 text-xs text-error-700">{syncError.errorMessage}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SyncHistoryLog({ syncHistory }: { readonly syncHistory: readonly SyncHistoryEntry[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (syncHistory.length === 0) return null;

  return (
    <div className="mt-3 rounded-md border border-border bg-muted">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsxMerge(
          "flex h-10 w-full items-center justify-between gap-2 px-3 text-left text-xs font-medium text-foreground/80",
          "hover:bg-muted transition-colors rounded-md"
        )}
      >
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          Recent Syncs
        </span>
        <ChevronDown
          className={clsxMerge(
            "h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-1.5">
          {syncHistory.map((entry, entryIndex) => {
            const statusConfig = SYNC_STATUS_CONFIG[entry.status];
            const EntryStatusIcon = statusConfig.icon;

            return (
              <div
                key={`${entry.timestamp}-${entryIndex}`}
                className="flex flex-col gap-1.5 rounded border border-border bg-card p-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-2 sm:items-center">
                  <EntryStatusIcon className={clsxMerge("h-3.5 w-3.5 flex-shrink-0 mt-0.5 sm:mt-0", statusConfig.iconClass)} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className={clsxMerge("text-xs font-medium", statusConfig.labelClass)}>
                        {statusConfig.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{entry.timestamp}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{entry.details}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground pl-5 sm:pl-0 sm:flex-shrink-0">
                  <span>{entry.recordsSynced} records</span>
                  <span>{entry.duration}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -- Component -- */

export function AdminIntegrationsPage() {
  const activeCount = getActiveCount(INTEGRATIONS);
  const totalCount = INTEGRATIONS.length;

  const [syncingIntegrations, setSyncingIntegrations] = useState<Record<string, boolean>>({});
  const [lastSyncOverrides, setLastSyncOverrides] = useState<Record<string, string>>({});

  function handleSyncNow(integrationName: string) {
    setSyncingIntegrations((previous) => ({ ...previous, [integrationName]: true }));

    setTimeout(() => {
      setSyncingIntegrations((previous) => ({ ...previous, [integrationName]: false }));
      setLastSyncOverrides((previous) => ({ ...previous, [integrationName]: "just now" }));
      toast.success(`${integrationName} synced successfully`, {
        description: "All records are up to date.",
      });
    }, 2000);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
            <Cable className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">Integrations</h1>
            <p className="text-sm text-muted-foreground">Connected EHR systems and FHIR endpoints</p>
          </div>
        </div>
      </div>

      {/* Summary banner */}
      <div
        className={clsxMerge(
          "flex flex-col gap-2 rounded-lg border px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
          activeCount > 0
            ? "border-success-200 bg-success-50"
            : "border-border bg-muted"
        )}
      >
        <div className="flex items-center gap-2.5">
          <Cable
            className={clsxMerge(
              "h-5 w-5 flex-shrink-0",
              activeCount > 0 ? "text-success-700" : "text-muted-foreground"
            )}
          />
          <span
            className={clsxMerge(
              "text-sm font-semibold",
              activeCount > 0 ? "text-success-700" : "text-foreground/80"
            )}
          >
            {activeCount} of {totalCount} integrations active
          </span>
        </div>
        <span
          className={clsxMerge(
            "text-xs",
            activeCount > 0 ? "text-success-600" : "text-muted-foreground"
          )}
        >
          {activeCount > 0
            ? "At least one EHR system is connected"
            : "No EHR systems connected yet"}
        </span>
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {INTEGRATIONS.map((integration) => {
          const statusConfig = STATUS_CONFIG[integration.status];
          const isConfigured = integration.status !== "not_configured";
          const isConnected = integration.status === "connected" || integration.status === "degraded";
          const isSyncing = syncingIntegrations[integration.name] ?? false;
          const displayedLastSync = lastSyncOverrides[integration.name] ?? integration.lastSync;

          return (
            <div
              key={integration.name}
              className="rounded-lg border border-border bg-card p-5 shadow-sm"
            >
              {/* Top row: name + status badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{integration.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{integration.description}</p>
                </div>
                <span
                  className={clsxMerge(
                    "inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    statusConfig.badgeClasses
                  )}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    {integration.status === "connected" && (
                      <span
                        className={clsxMerge(
                          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                          statusConfig.dotColor
                        )}
                      />
                    )}
                    <span
                      className={clsxMerge(
                        "relative inline-flex h-1.5 w-1.5 rounded-full",
                        statusConfig.dotColor
                      )}
                    />
                  </span>
                  {statusConfig.label}
                </span>
              </div>

              {/* Metrics row */}
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Last Sync</p>
                    <p className="text-xs font-medium text-foreground/80">{displayedLastSync}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-muted-foreground/70" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Records</p>
                    <p className="text-xs font-medium text-foreground/80">{integration.recordCount}</p>
                  </div>
                </div>
              </div>

              {/* Sync error details (P1) */}
              {isConnected && integration.syncErrors && integration.syncErrors.length > 0 && (
                <SyncErrorDetails syncErrors={integration.syncErrors} />
              )}

              {/* Sync history log (P2) */}
              {isConnected && integration.syncHistory && integration.syncHistory.length > 0 && (
                <SyncHistoryLog syncHistory={integration.syncHistory} />
              )}

              {/* Action buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                {isConnected && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => handleSyncNow(integration.name)}
                    className={clsxMerge(
                      "inline-flex h-10 items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 text-sm font-medium text-primary-700 transition-colors",
                      isSyncing
                        ? "cursor-not-allowed opacity-60"
                        : "hover:bg-primary-100"
                    )}
                  >
                    <RefreshCw
                      className={clsxMerge(
                        "h-4 w-4",
                        isSyncing && "animate-spin"
                      )}
                    />
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </button>
                )}
                <button
                  type="button"
                  className={clsxMerge(
                    "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
                    isConfigured
                      ? "border border-border bg-card text-foreground/80 hover:bg-muted"
                      : "bg-primary-700 text-white hover:bg-primary-800"
                  )}
                >
                  {isConfigured ? (
                    <>
                      <ExternalLink className="h-4 w-4" />
                      View Details
                    </>
                  ) : (
                    <>
                      <Settings2 className="h-4 w-4" />
                      Configure
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
