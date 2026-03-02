import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Search, ChevronDown, Download } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";

/* ── Breadcrumb ── */

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Admin", href: "/admin" },
  { label: "Audit Log" },
];

/* ── Types ── */

type AuditAction = "Create" | "View" | "Update" | "Delete" | "Login";

interface AuditEntry {
  readonly id: string;
  readonly userName: string;
  readonly userInitials: string;
  readonly avatarBg: string;
  readonly action: AuditAction;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly detail: string;
  readonly timestamp: string;
  readonly sessionRef: string | null;
}

/* ── Mock data ── */

const ACTION_BADGE_STYLES: Record<AuditAction, string> = {
  Create: "border border-success-500/30 bg-success-50 text-success-700",
  View: "border border-neutral-200 bg-neutral-100 text-neutral-700",
  Update: "border border-primary-200 bg-primary-50 text-primary-700",
  Delete: "border border-error-500/30 bg-error-50 text-error-700",
  Login: "border border-info-500/30 bg-info-50 text-info-700",
};

const ACTION_DOT_COLORS: Record<AuditAction, string> = {
  Create: "bg-success-500",
  View: "bg-neutral-300",
  Update: "bg-primary-700",
  Delete: "bg-error-500",
  Login: "bg-info-500",
};

const mockAuditEntries: AuditEntry[] = [
  {
    id: "1",
    userName: "Dr. Nguyen",
    userInitials: "TN",
    avatarBg: "bg-primary-100 text-primary-700",
    action: "Create",
    resourceType: "Medical Record",
    resourceId: "MR-20260301-0042",
    detail: "AI-assisted draft saved as medical record for Sarah Johnson (G44.2)",
    timestamp: "2 min ago",
    sessionRef: "S-2026-0042",
  },
  {
    id: "2",
    userName: "Dr. Lee",
    userInitials: "JL",
    avatarBg: "bg-secondary-100 text-secondary-700",
    action: "View",
    resourceType: "Patient",
    resourceId: "PAT-1847",
    detail: "Viewed patient demographics and appointment history for Michael Chen",
    timestamp: "8 min ago",
    sessionRef: null,
  },
  {
    id: "3",
    userName: "Admin Davis",
    userInitials: "MD",
    avatarBg: "bg-warning-100 text-warning-700",
    action: "Update",
    resourceType: "User",
    resourceId: "USR-0034",
    detail: "Updated role from Nurse to Senior Nurse for Kim",
    timestamp: "15 min ago",
    sessionRef: null,
  },
  {
    id: "4",
    userName: "Dr. Smith",
    userInitials: "AS",
    avatarBg: "bg-accent-100 text-accent-700",
    action: "Delete",
    resourceType: "Draft Record",
    resourceId: "DRAFT-0091",
    detail: "AI draft discarded — session S-2026-0039",
    timestamp: "32 min ago",
    sessionRef: null,
  },
  {
    id: "5",
    userName: "Nurse Kim",
    userInitials: "SK",
    avatarBg: "bg-info-100 text-info-700",
    action: "Login",
    resourceType: "Auth",
    resourceId: "SES-99210",
    detail: "Successful login from 192.168.1.45 (Chrome, Windows)",
    timestamp: "45 min ago",
    sessionRef: null,
  },
  {
    id: "6",
    userName: "Dr. Nguyen",
    userInitials: "TN",
    avatarBg: "bg-primary-100 text-primary-700",
    action: "Update",
    resourceType: "Medical Record",
    resourceId: "MR-20260228-0039",
    detail: "Updated diagnosis codes and treatment plan for Emily Rivera",
    timestamp: "1 hr ago",
    sessionRef: null,
  },
  {
    id: "7",
    userName: "Reception Patel",
    userInitials: "RP",
    avatarBg: "bg-neutral-100 text-neutral-600",
    action: "Create",
    resourceType: "Appointment",
    resourceId: "APT-8834",
    detail: "Scheduled follow-up appointment for James O'Brien on March 10",
    timestamp: "1 hr ago",
    sessionRef: null,
  },
  {
    id: "8",
    userName: "Dr. Kim",
    userInitials: "DK",
    avatarBg: "bg-primary-100 text-primary-700",
    action: "View",
    resourceType: "Medical Record",
    resourceId: "MR-20260225-0031",
    detail: "Reviewed lab results for Aisha Patel",
    timestamp: "2 hrs ago",
    sessionRef: null,
  },
  {
    id: "9",
    userName: "Admin Davis",
    userInitials: "MD",
    avatarBg: "bg-warning-100 text-warning-700",
    action: "Login",
    resourceType: "Auth",
    resourceId: "SES-99187",
    detail: "Logged in from 10.0.0.12 (Firefox, macOS)",
    timestamp: "3 hrs ago",
    sessionRef: null,
  },
  {
    id: "10",
    userName: "Dr. Lee",
    userInitials: "JL",
    avatarBg: "bg-secondary-100 text-secondary-700",
    action: "Create",
    resourceType: "Clara Session",
    resourceId: "S-2026-0042",
    detail: "New Clara session started — 23m 45s duration, 4 suggestions generated",
    timestamp: "4 hrs ago",
    sessionRef: "S-2026-0042",
  },
];

const UNIQUE_USERS = [...new Set(mockAuditEntries.map((entry) => entry.userName))];

/* ── Component ── */

export function AdminAuditPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  const filteredEntries = mockAuditEntries.filter((entry) => {
    const isMatchingSearch =
      searchQuery === "" ||
      entry.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.resourceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.resourceType.toLowerCase().includes(searchQuery.toLowerCase());
    const isMatchingAction = actionFilter === "all" || entry.action === actionFilter;
    const isMatchingUser = userFilter === "all" || entry.userName === userFilter;
    return isMatchingSearch && isMatchingAction && isMatchingUser;
  });

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
              onChange={(event) => setSearchQuery(event.target.value)}
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
              onChange={(event) => setActionFilter(event.target.value as AuditAction | "all")}
              className="h-10 appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
            >
              <option value="all">All Actions</option>
              <option value="Create">Create</option>
              <option value="Update">Update</option>
              <option value="Delete">Delete</option>
              <option value="View">View</option>
              <option value="Login">Login</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          </div>

          {/* User filter */}
          <div className="relative">
            <select
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
              className="h-10 appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
            >
              <option value="all">All Users</option>
              {UNIQUE_USERS.map((userName) => (
                <option key={userName} value={userName}>{userName}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          </div>

          <span className="text-sm text-neutral-500 sm:ml-auto">
            {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
      </div>

      {/* Audit Timeline */}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-12">
            <ShieldCheck className="h-10 w-10 text-neutral-300" />
            <p className="mt-3 text-sm font-medium text-neutral-900">No audit entries found</p>
            <p className="mt-1 text-xs text-neutral-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 px-5 py-4">
                {/* Avatar */}
                <div className={clsxMerge("mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold", entry.avatarBg)}>
                  {entry.userInitials}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  {/* Line 1: action badge + resource + ID chip */}
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <span className={clsxMerge("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", ACTION_BADGE_STYLES[entry.action])}>
                      <span className={clsxMerge("mr-1.5 h-1.5 w-1.5 rounded-full", ACTION_DOT_COLORS[entry.action])} />
                      {entry.action}
                    </span>
                    <span className="text-sm font-medium text-neutral-900">{entry.resourceType}</span>
                    {entry.resourceId && (
                      <span className="hidden rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-xs text-neutral-500 sm:inline">
                        {entry.resourceId}
                      </span>
                    )}
                  </div>
                  {/* Line 2: detail */}
                  <p className="text-sm text-neutral-700">{entry.detail}</p>
                  {/* Line 3: user + session link */}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-neutral-500">{entry.userName}</span>
                    {entry.sessionRef && (
                      <>
                        <span className="text-neutral-200">&middot;</span>
                        <Link
                          to={`/clara/session/${entry.sessionRef}/summary`}
                          className="text-xs text-accent-700 hover:underline"
                        >
                          View session &rarr;
                        </Link>
                      </>
                    )}
                    <span className="ml-auto text-xs text-neutral-500 sm:hidden">{entry.timestamp}</span>
                  </div>
                </div>

                {/* Timestamp (desktop) */}
                <span className="mt-0.5 hidden flex-shrink-0 whitespace-nowrap text-xs text-neutral-500 sm:block">
                  {entry.timestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
