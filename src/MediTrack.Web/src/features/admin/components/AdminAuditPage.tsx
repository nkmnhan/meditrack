import { useState } from "react";
import { ShieldCheck, Search, ChevronDown, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";
import { useGetAuditLogsQuery } from "@/features/clara/store/claraApi";
import { getInitials, getAvatarColor } from "@/shared/utils/avatarUtils";
import type { AuditLogDto } from "../types";

/* ── Breadcrumb ── */

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Admin", href: "/admin" },
  { label: "Audit Log" },
];

/* ── Style maps ── */

const ACTION_BADGE_STYLES: Record<string, string> = {
  Create: "border border-success-500/30 bg-success-50 text-success-700",
  Read: "border border-neutral-200 bg-neutral-100 text-neutral-700",
  Update: "border border-primary-200 bg-primary-50 text-primary-700",
  Delete: "border border-error-500/30 bg-error-50 text-error-700",
  Search: "border border-info-500/30 bg-info-50 text-info-700",
  Export: "border border-warning-500/30 bg-warning-50 text-warning-700",
};

const ACTION_DOT_COLORS: Record<string, string> = {
  Create: "bg-success-500",
  Read: "bg-neutral-300",
  Update: "bg-primary-700",
  Delete: "bg-error-500",
  Search: "bg-info-500",
  Export: "bg-warning-500",
};

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

/* ── Component ── */

export function AdminAuditPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 25;

  const { data, isLoading, isError } = useGetAuditLogsQuery({
    action: actionFilter || undefined,
    search: searchQuery || undefined,
    severity: severityFilter || undefined,
    pageNumber,
    pageSize,
  });

  const entries = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;

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
            <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Audit Log</h1>
            <p className="text-sm text-neutral-500">Track all user actions and data access</p>
          </div>
        </div>
        <button
          type="button"
          className={clsxMerge(
            "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4",
            "border border-neutral-200 bg-white text-sm font-medium text-neutral-700",
            "transition-colors hover:bg-neutral-50"
          )}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPageNumber(1);
              }}
              placeholder="Search audit entries..."
              className={clsxMerge(
                "h-10 w-full rounded-lg border border-neutral-200 pl-9 pr-3 text-sm",
                "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500",
                "transition-colors"
              )}
            />
          </div>

          {/* Action filter */}
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(event) => {
                setActionFilter(event.target.value);
                setPageNumber(1);
              }}
              className="h-10 appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
            >
              <option value="">All Actions</option>
              <option value="Create">Create</option>
              <option value="Read">Read</option>
              <option value="Update">Update</option>
              <option value="Delete">Delete</option>
              <option value="Search">Search</option>
              <option value="Export">Export</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          </div>

          {/* Severity filter */}
          <div className="relative">
            <select
              value={severityFilter}
              onChange={(event) => {
                setSeverityFilter(event.target.value);
                setPageNumber(1);
              }}
              className="h-10 appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
            >
              <option value="">All Severities</option>
              <option value="Info">Info</option>
              <option value="Warning">Warning</option>
              <option value="Error">Error</option>
              <option value="Critical">Critical</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          </div>

          <span className="text-sm text-neutral-500 sm:ml-auto">
            {totalCount} {totalCount === 1 ? "entry" : "entries"}
          </span>
        </div>
      </div>

      {/* Audit Timeline */}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center px-5 py-12">
            <ShieldCheck className="h-10 w-10 text-error-300" />
            <p className="mt-3 text-sm font-medium text-neutral-900">Failed to load audit logs</p>
            <p className="mt-1 text-xs text-neutral-500">Check your connection and try again</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-12">
            <ShieldCheck className="h-10 w-10 text-neutral-300" />
            <p className="mt-3 text-sm font-medium text-neutral-900">No audit entries found</p>
            <p className="mt-1 text-xs text-neutral-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {entries.map((entry: AuditLogDto) => {
              const badgeStyle = ACTION_BADGE_STYLES[entry.action] ?? "border border-neutral-200 bg-neutral-100 text-neutral-700";
              const dotColor = ACTION_DOT_COLORS[entry.action] ?? "bg-neutral-300";

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
                      <span className="text-sm font-medium text-neutral-900">{entry.resourceType}</span>
                      {entry.resourceId && (
                        <span className="hidden rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-xs text-neutral-500 sm:inline">
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
                      <span className="text-xs text-neutral-500">{entry.username}</span>
                      <span className="text-neutral-200">&middot;</span>
                      <span className="text-xs text-neutral-500">{entry.userRole}</span>
                      <span className="ml-auto text-xs text-neutral-500 sm:hidden">{formatTimestamp(entry.timestamp)}</span>
                    </div>
                  </div>

                  {/* Timestamp (desktop) */}
                  <span className="mt-0.5 hidden flex-shrink-0 whitespace-nowrap text-xs text-neutral-500 sm:block">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3">
            <p className="text-sm text-neutral-500">
              Page {pageNumber} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!data?.hasPreviousPage}
                onClick={() => setPageNumber((previousPage) => previousPage - 1)}
                className={clsxMerge(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 transition-colors",
                  data?.hasPreviousPage ? "hover:bg-neutral-50" : "cursor-not-allowed opacity-50"
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={!data?.hasNextPage}
                onClick={() => setPageNumber((previousPage) => previousPage + 1)}
                className={clsxMerge(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 transition-colors",
                  data?.hasNextPage ? "hover:bg-neutral-50" : "cursor-not-allowed opacity-50"
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
