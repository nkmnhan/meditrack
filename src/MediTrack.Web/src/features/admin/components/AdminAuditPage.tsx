import { useState } from "react";
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
}

/* ── Mock data ── */

const ACTION_BADGE_STYLES: Record<AuditAction, string> = {
  Create: "bg-success-50 text-success-700",
  View: "bg-neutral-100 text-neutral-600",
  Update: "bg-primary-100 text-primary-700",
  Delete: "bg-error-50 text-error-700",
  Login: "bg-info-50 text-info-700",
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
    detail: "Created new encounter record for patient Sarah Johnson",
    timestamp: "2 min ago",
  },
  {
    id: "2",
    userName: "Dr. Lee",
    userInitials: "JL",
    avatarBg: "bg-secondary-100 text-secondary-700",
    action: "View",
    resourceType: "Patient",
    resourceId: "PAT-1847",
    detail: "Viewed patient demographics for Michael Chen",
    timestamp: "8 min ago",
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
  },
  {
    id: "4",
    userName: "Dr. Smith",
    userInitials: "AS",
    avatarBg: "bg-accent-100 text-accent-700",
    action: "Delete",
    resourceType: "Appointment",
    resourceId: "APT-8821",
    detail: "Cancelled appointment due to patient request",
    timestamp: "32 min ago",
  },
  {
    id: "5",
    userName: "Nurse Kim",
    userInitials: "SK",
    avatarBg: "bg-info-100 text-info-700",
    action: "Login",
    resourceType: "Session",
    resourceId: "SES-99210",
    detail: "Logged in from 192.168.1.45 (Chrome, Windows)",
    timestamp: "45 min ago",
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
  },
  {
    id: "9",
    userName: "Admin Davis",
    userInitials: "MD",
    avatarBg: "bg-warning-100 text-warning-700",
    action: "Login",
    resourceType: "Session",
    resourceId: "SES-99187",
    detail: "Logged in from 10.0.0.12 (Firefox, macOS)",
    timestamp: "3 hrs ago",
  },
  {
    id: "10",
    userName: "Dr. Lee",
    userInitials: "JL",
    avatarBg: "bg-secondary-100 text-secondary-700",
    action: "Create",
    resourceType: "Clara Session",
    resourceId: "CLA-4401",
    detail: "Started Clara AI session for patient consultation",
    timestamp: "4 hrs ago",
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
        <div className="divide-y divide-neutral-100">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="flex gap-3 px-5 py-4">
              {/* Avatar */}
              <div className={clsxMerge("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold", entry.avatarBg)}>
                {entry.userInitials}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900">{entry.userName}</span>
                    <span className={clsxMerge("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", ACTION_BADGE_STYLES[entry.action])}>
                      {entry.action}
                    </span>
                    <span className="text-sm text-neutral-600">{entry.resourceType}</span>
                  </div>
                  <span className="flex-shrink-0 text-xs text-neutral-500">{entry.timestamp}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700">
                    {entry.resourceId}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-600">{entry.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center px-5 py-12">
            <ShieldCheck className="h-10 w-10 text-neutral-300" />
            <p className="mt-3 text-sm font-medium text-neutral-900">No audit entries found</p>
            <p className="mt-1 text-xs text-neutral-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
