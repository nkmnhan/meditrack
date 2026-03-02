import { useState } from "react";
import { UserCog, Search, ChevronDown, Pencil, Trash2, UserPlus } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";

/* ── Breadcrumb ── */

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Admin", href: "/admin" },
  { label: "User Management" },
];

/* ── Types ── */

type UserRole = "Doctor" | "Admin" | "Nurse" | "Receptionist";
type UserStatus = "Active" | "Inactive" | "Pending";

interface MockUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly initials: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly lastActive: string;
  readonly sessions: number;
  readonly avatarBg: string;
}

/* ── Mock data ── */

const mockUsers: MockUser[] = [
  { id: "1", name: "Dr. Nguyen", email: "nguyen@meditrack.io", initials: "TN", role: "Doctor", status: "Active", lastActive: "2 min ago", sessions: 412, avatarBg: "bg-primary-100 text-primary-700" },
  { id: "2", name: "Dr. Lee", email: "lee@meditrack.io", initials: "JL", role: "Doctor", status: "Active", lastActive: "15 min ago", sessions: 387, avatarBg: "bg-secondary-100 text-secondary-700" },
  { id: "3", name: "Dr. Smith", email: "smith@meditrack.io", initials: "AS", role: "Doctor", status: "Inactive", lastActive: "3 days ago", sessions: 356, avatarBg: "bg-accent-100 text-accent-700" },
  { id: "4", name: "Admin Davis", email: "davis@meditrack.io", initials: "MD", role: "Admin", status: "Active", lastActive: "1 hr ago", sessions: 89, avatarBg: "bg-warning-100 text-warning-700" },
  { id: "5", name: "Nurse Kim", email: "kim@meditrack.io", initials: "SK", role: "Nurse", status: "Active", lastActive: "30 min ago", sessions: 201, avatarBg: "bg-info-100 text-info-700" },
  { id: "6", name: "Reception Patel", email: "patel@meditrack.io", initials: "RP", role: "Receptionist", status: "Pending", lastActive: "Never", sessions: 0, avatarBg: "bg-neutral-100 text-neutral-600" },
  { id: "7", name: "Dr. Kim", email: "dkim@meditrack.io", initials: "DK", role: "Doctor", status: "Active", lastActive: "5 min ago", sessions: 334, avatarBg: "bg-primary-100 text-primary-700" },
];

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  Doctor: "border border-primary-200 bg-primary-100 text-primary-700",
  Admin: "border border-accent-200 bg-accent-100 text-accent-700",
  Nurse: "border border-secondary-200 bg-secondary-100 text-secondary-700",
  Receptionist: "border border-neutral-200 bg-neutral-100 text-neutral-600",
};

const STATUS_BADGE_STYLES: Record<UserStatus, string> = {
  Active: "border border-success-500/30 bg-success-50 text-success-700",
  Inactive: "border border-neutral-200 bg-neutral-100 text-neutral-600",
  Pending: "border border-warning-500/30 bg-warning-50 text-warning-700",
};

/* ── Component ── */

export function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");

  const filteredUsers = mockUsers.filter((user) => {
    const isMatchingSearch =
      searchQuery === "" ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const isMatchingRole = roleFilter === "all" || user.role === roleFilter;
    const isMatchingStatus = statusFilter === "all" || user.status === statusFilter;
    return isMatchingSearch && isMatchingRole && isMatchingStatus;
  });

  return (
    <div className="space-y-6">
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
            <UserCog className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">User Management</h1>
            <p className="text-sm text-neutral-500">{mockUsers.length} total users</p>
          </div>
        </div>
        <button
          type="button"
          className={clsxMerge(
            "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4",
            "bg-primary-700 text-sm font-medium text-white",
            "transition-colors hover:bg-primary-800"
          )}
        >
          <UserPlus className="h-4 w-4" />
          Invite User
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
              placeholder="Search users..."
              className={clsxMerge(
                "h-10 w-full rounded-lg border border-neutral-200 pl-9 pr-3 text-sm",
                "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500",
                "transition-colors"
              )}
            />
          </div>

          {/* Role filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as UserRole | "all")}
              className="h-10 appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
            >
              <option value="all">All Roles</option>
              <option value="Doctor">Doctor</option>
              <option value="Admin">Admin</option>
              <option value="Nurse">Nurse</option>
              <option value="Receptionist">Receptionist</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as UserStatus | "all")}
              className="h-10 appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Pending">Pending</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          </div>

          <span className="text-sm text-neutral-500 sm:ml-auto">
            {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
          </span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden rounded-lg border border-neutral-200 bg-white shadow-sm md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Last Active</th>
              <th className="px-5 py-3 text-right">Sessions</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-neutral-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={clsxMerge("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold", user.avatarBg)}>
                      {user.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{user.name}</p>
                      <p className="truncate text-xs text-neutral-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={clsxMerge("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", ROLE_BADGE_STYLES[user.role])}>
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={clsxMerge("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_BADGE_STYLES[user.status])}>
                    {user.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-neutral-600">{user.lastActive}</td>
                <td className="px-5 py-3 text-right text-sm font-medium text-neutral-900">{user.sessions}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      aria-label={`Edit ${user.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${user.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-error-50 hover:text-error-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filteredUsers.map((user) => (
          <div key={user.id} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className={clsxMerge("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold", user.avatarBg)}>
                {user.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">{user.name}</p>
                    <p className="truncate text-xs text-neutral-500">{user.email}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Edit ${user.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${user.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-error-50 hover:text-error-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={clsxMerge("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", ROLE_BADGE_STYLES[user.role])}>
                    {user.role}
                  </span>
                  <span className={clsxMerge("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_BADGE_STYLES[user.status])}>
                    {user.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                  <span>Last active: {user.lastActive}</span>
                  <span>{user.sessions} sessions</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
