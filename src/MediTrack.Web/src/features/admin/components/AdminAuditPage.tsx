import { useState } from "react";
import { ShieldCheck, Shield, Search, ChevronDown, ChevronLeft, ChevronRight, Download, Loader2, Archive, Clock } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";
import { useGetAuditLogsQuery, useGetArchivedAuditLogsQuery, useGetAuditStatsQuery } from "@/features/clara/store/claraApi";
import { getInitials, getAvatarColor } from "@/shared/utils/avatarUtils";
import type { AuditLogDto, ArchivedAuditLogDto } from "../types";

/* ── Breadcrumb ── */

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/dashboard" },
  { label: "Admin", href: "/admin" },
  { label: "Audit Log" },
];

/* ── Types ── */

type AuditTab = "recent" | "archived";

/* ── Style maps ── */

const ACTION_BADGE_STYLES: Record<string, string> = {
  Create: "border border-success-500/30 bg-success-50 text-success-700",
  Read: "border border-border bg-muted text-foreground/80",
  Update: "border border-primary-200 bg-primary-50 text-primary-700",
  Delete: "border border-error-500/30 bg-error-50 text-error-700",
  Search: "border border-info-500/30 bg-info-50 text-info-700",
  Export: "border border-warning-500/30 bg-warning-50 text-warning-700",
  PHI: "border border-accent-200 bg-accent-50 text-accent-700",
};

const ACTION_DOT_COLORS: Record<string, string> = {
  Create: "bg-success-500",
  Read: "bg-border",
  Update: "bg-primary-700",
  Delete: "bg-error-500",
  Search: "bg-info-500",
  Export: "bg-warning-500",
  PHI: "bg-accent-500",
};

const PHI_RESOURCE_TYPES = new Set(["Patient", "MedicalRecord", "Prescription"]);

function isPhiResource(resourceType: string): boolean {
  return PHI_RESOURCE_TYPES.has(resourceType);
}

function formatTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

/* ── Component ── */

export function AdminAuditPage() {
  const [activeTab, setActiveTab] = useState<AuditTab>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [dateFrom] = useState("");
  const [dateTo] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 25;

  const queryParams = {
    action: actionFilter || undefined,
    search: searchQuery || undefined,
    severity: severityFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    pageNumber,
    pageSize,
  };

  const recentQuery = useGetAuditLogsQuery(queryParams, { skip: activeTab !== "recent" });
  const archivedQuery = useGetArchivedAuditLogsQuery(queryParams, { skip: activeTab !== "archived" });
  const { data: auditStats } = useGetAuditStatsQuery();

  const activeQuery = activeTab === "recent" ? recentQuery : archivedQuery;
  const entries = activeQuery.data?.items ?? [];
  const totalCount = activeQuery.data?.totalCount ?? 0;
  const totalPages = activeQuery.data?.totalPages ?? 0;

  const phiAccessCount = entries.filter(
    (entry: AuditLogDto | ArchivedAuditLogDto) => isPhiResource(entry.resourceType)
  ).length;

  function handleTabChange(tab: AuditTab) {
    setActiveTab(tab);
    setPageNumber(1);
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setPageNumber(1);
  }

  function handleActionFilterChange(value: string) {
    setActionFilter(value);
    setPageNumber(1);
  }

  function handleSeverityFilterChange(value: string) {
    setSeverityFilter(value);
    setPageNumber(1);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
            <ShieldCheck className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">Audit Log</h1>
            <p className="text-sm text-muted-foreground">Track all user actions and data access</p>
          </div>
        </div>
        <button
          type="button"
          className={clsxMerge(
            "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4",
            "border border-border bg-card text-sm font-medium text-foreground/80",
            "transition-colors hover:bg-muted"
          )}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Stats Banner */}
      {auditStats && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary-700" />
            <span className="text-sm text-foreground/80">
              <span className="font-semibold text-foreground">{formatCount(auditStats.hotRecordCount)}</span>{" "}
              recent logs (last {auditStats.retentionMonths} months)
            </span>
          </div>
          <span className="hidden text-muted-foreground/50 sm:inline">&middot;</span>
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground/80">
              <span className="font-semibold text-foreground">{formatCount(auditStats.archivedRecordCount)}</span>{" "}
              archived logs
            </span>
          </div>
          <span className="hidden text-muted-foreground/50 sm:inline">&middot;</span>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent-500" />
            <span className="text-sm text-foreground/80">
              <span className="font-semibold text-foreground">{phiAccessCount}</span>{" "}
              PHI access {phiAccessCount === 1 ? "event" : "events"}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
        <button
          type="button"
          onClick={() => handleTabChange("recent")}
          className={clsxMerge(
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "recent"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Clock className="mr-1.5 inline-block h-4 w-4" />
          Recent
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("archived")}
          className={clsxMerge(
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "archived"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Archive className="mr-1.5 inline-block h-4 w-4" />
          Archived
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search audit entries..."
              className={clsxMerge(
                "h-10 w-full rounded-lg border border-border pl-9 pr-3 text-sm",
                "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500",
                "transition-colors"
              )}
            />
          </div>

          {/* Action filter */}
          <div className="relative">
            <select
              value={actionFilter}
              aria-label="Filter by action"
              onChange={(event) => handleActionFilterChange(event.target.value)}
              className="h-10 appearance-none rounded-md border border-border bg-card pl-3 pr-8 text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
            >
              <option value="">All Actions</option>
              <option value="Create">Create</option>
              <option value="Read">Read</option>
              <option value="Update">Update</option>
              <option value="Delete">Delete</option>
              <option value="Search">Search</option>
              <option value="Export">Export</option>
              <option value="PHI">PHI Access</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Severity filter */}
          <div className="relative">
            <select
              value={severityFilter}
              aria-label="Filter by severity"
              onChange={(event) => handleSeverityFilterChange(event.target.value)}
              className="h-10 appearance-none rounded-md border border-border bg-card pl-3 pr-8 text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
            >
              <option value="">All Severities</option>
              <option value="Info">Info</option>
              <option value="Warning">Warning</option>
              <option value="Error">Error</option>
              <option value="Critical">Critical</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <span className="text-sm text-muted-foreground sm:ml-auto" aria-live="polite">
            {totalCount} {totalCount === 1 ? "entry" : "entries"}
          </span>
        </div>
      </div>

      {/* Audit Timeline */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        {activeQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
          </div>
        ) : activeQuery.isError ? (
          <div className="flex flex-col items-center justify-center px-5 py-12">
            <ShieldCheck className="h-10 w-10 text-error-300" />
            <p className="mt-3 text-sm font-medium text-foreground">Failed to load audit logs</p>
            <p className="mt-1 text-xs text-muted-foreground">Check your connection and try again</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-12">
            {activeTab === "archived" ? (
              <Archive className="h-10 w-10 text-muted-foreground/50" />
            ) : (
              <ShieldCheck className="h-10 w-10 text-muted-foreground/50" />
            )}
            <p className="mt-3 text-sm font-medium text-foreground">
              No {activeTab === "archived" ? "archived " : ""}audit entries found
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((entry: AuditLogDto | ArchivedAuditLogDto) => {
              const badgeStyle = ACTION_BADGE_STYLES[entry.action] ?? "border border-border bg-muted text-foreground/80";
              const dotColor = ACTION_DOT_COLORS[entry.action] ?? "bg-border";
              const isArchived = activeTab === "archived" && "archivedAt" in entry;

              return (
                <div key={entry.id} className="flex items-start gap-4 px-5 py-4">
                  {/* Avatar */}
                  <div className={clsxMerge("mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold", getAvatarColor(entry.username))}>
                    {getInitials(entry.username)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <span className={clsxMerge("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", badgeStyle)}>
                        <span className={clsxMerge("mr-1.5 h-1.5 w-1.5 rounded-full", dotColor)} />
                        {entry.action}
                      </span>
                      <span className="text-sm font-medium text-foreground">{entry.resourceType}</span>
                      {isPhiResource(entry.resourceType) && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent-200 bg-accent-50 px-1.5 py-0.5 text-xs font-medium text-accent-700">
                          <Shield className="h-3 w-3" />
                          PHI
                        </span>
                      )}
                      {entry.resourceId && (
                        <span className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground sm:inline">
                          {entry.resourceId}
                        </span>
                      )}
                      {!entry.success && (
                        <span className="inline-flex items-center rounded-full border border-error-500/30 bg-error-50 px-2 py-0.5 text-xs font-medium text-error-700">
                          Failed
                        </span>
                      )}
                    </div>
                    {entry.errorMessage && (
                      <p className="text-sm text-error-600">{entry.errorMessage}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">{entry.username}</span>
                      <span className="text-muted-foreground/40">&middot;</span>
                      <span className="text-xs text-muted-foreground">{entry.userRole}</span>
                      {isArchived && (
                        <>
                          <span className="text-muted-foreground/40">&middot;</span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70">
                            <Archive className="h-3 w-3" />
                            Archived {formatTimestamp((entry as ArchivedAuditLogDto).archivedAt)}
                          </span>
                        </>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground sm:hidden">{formatTimestamp(entry.timestamp)}</span>
                    </div>
                  </div>

                  {/* Timestamp (desktop) */}
                  <span className="mt-0.5 hidden flex-shrink-0 whitespace-nowrap text-xs text-muted-foreground sm:block">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-sm text-muted-foreground">
              Page {pageNumber} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!activeQuery.data?.hasPreviousPage}
                onClick={() => setPageNumber((previousPage) => previousPage - 1)}
                className={clsxMerge(
                  "inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground/80 transition-colors",
                  activeQuery.data?.hasPreviousPage ? "hover:bg-muted" : "cursor-not-allowed opacity-50"
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={!activeQuery.data?.hasNextPage}
                onClick={() => setPageNumber((previousPage) => previousPage + 1)}
                className={clsxMerge(
                  "inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground/80 transition-colors",
                  activeQuery.data?.hasNextPage ? "hover:bg-muted" : "cursor-not-allowed opacity-50"
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
