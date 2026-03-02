import { useState } from "react";
import { UserCog, Search, ChevronDown, ChevronLeft, ChevronRight, UserCheck, UserX, Loader2, UserPlus } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";
import { useGetUsersQuery, useDeactivateUserMutation, useActivateUserMutation } from "../store/adminApi";
import { getInitials, getAvatarColor } from "@/shared/utils/avatarUtils";
import type { UserListItem } from "../types";

/* ── Breadcrumb ── */

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Admin", href: "/admin" },
  { label: "User Management" },
];

/* ── Style maps ── */

const ROLE_BADGE_STYLES: Record<string, string> = {
  Doctor: "border border-primary-200 bg-primary-100 text-primary-700",
  Admin: "border border-accent-200 bg-accent-100 text-accent-700",
  Nurse: "border border-secondary-200 bg-secondary-100 text-secondary-700",
  Receptionist: "border border-neutral-200 bg-neutral-100 text-neutral-600",
  Patient: "border border-info-200 bg-info-100 text-info-700",
};

function formatLastActive(lastLoginAt: string | null): string {
  if (!lastLoginAt) return "Never";
  const date = new Date(lastLoginAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getUserFullName(user: UserListItem): string {
  return `${user.firstName} ${user.lastName}`;
}

/* ── Component ── */

export function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 25;

  const { data, isLoading, isError } = useGetUsersQuery({
    role: roleFilter || undefined,
    status: (statusFilter as "active" | "inactive") || undefined,
    search: searchQuery || undefined,
    pageNumber,
    pageSize,
  });

  const [deactivateUser] = useDeactivateUserMutation();
  const [activateUser] = useActivateUserMutation();

  const users = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;

  function handleToggleStatus(user: UserListItem) {
    if (user.isActive) {
      deactivateUser(user.id);
    } else {
      activateUser(user.id);
    }
  }

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
            <p className="text-sm text-neutral-500">{totalCount} total users</p>
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
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPageNumber(1);
              }}
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
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setPageNumber(1);
              }}
              className="h-10 appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
            >
              <option value="">All Roles</option>
              <option value="Doctor">Doctor</option>
              <option value="Admin">Admin</option>
              <option value="Nurse">Nurse</option>
              <option value="Receptionist">Receptionist</option>
              <option value="Patient">Patient</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPageNumber(1);
              }}
              className="h-10 appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          </div>

          <span className="text-sm text-neutral-500 sm:ml-auto">
            {totalCount} {totalCount === 1 ? "user" : "users"}
          </span>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white px-5 py-12 shadow-sm">
          <UserCog className="h-10 w-10 text-error-300" />
          <p className="mt-3 text-sm font-medium text-neutral-900">Failed to load users</p>
          <p className="mt-1 text-xs text-neutral-500">Check your connection and try again</p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white px-5 py-12 shadow-sm">
          <UserCog className="h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm font-medium text-neutral-900">No users found</p>
          <p className="mt-1 text-xs text-neutral-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden rounded-lg border border-neutral-200 bg-white shadow-sm md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Last Active</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {users.map((user) => {
                  const fullName = getUserFullName(user);
                  return (
                    <tr key={user.id} className="transition-colors hover:bg-neutral-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={clsxMerge("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold", getAvatarColor(fullName))}>
                            {getInitials(fullName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-900">{fullName}</p>
                            <p className="truncate text-xs text-neutral-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsxMerge("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", ROLE_BADGE_STYLES[user.role] ?? "border border-neutral-200 bg-neutral-100 text-neutral-600")}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsxMerge(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          user.isActive
                            ? "border border-success-500/30 bg-success-50 text-success-700"
                            : "border border-neutral-200 bg-neutral-100 text-neutral-600"
                        )}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-neutral-600">{formatLastActive(user.lastLoginAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            aria-label={user.isActive ? `Deactivate ${fullName}` : `Activate ${fullName}`}
                            onClick={() => handleToggleStatus(user)}
                            className={clsxMerge(
                              "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                              user.isActive
                                ? "text-neutral-400 hover:bg-error-50 hover:text-error-600"
                                : "text-neutral-400 hover:bg-success-50 hover:text-success-600"
                            )}
                          >
                            {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {users.map((user) => {
              const fullName = getUserFullName(user);
              return (
                <div key={user.id} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={clsxMerge("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold", getAvatarColor(fullName))}>
                      {getInitials(fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-900">{fullName}</p>
                          <p className="truncate text-xs text-neutral-500">{user.email}</p>
                        </div>
                        <button
                          type="button"
                          aria-label={user.isActive ? `Deactivate ${fullName}` : `Activate ${fullName}`}
                          onClick={() => handleToggleStatus(user)}
                          className={clsxMerge(
                            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors",
                            user.isActive
                              ? "text-neutral-400 hover:bg-error-50 hover:text-error-600"
                              : "text-neutral-400 hover:bg-success-50 hover:text-success-600"
                          )}
                        >
                          {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={clsxMerge("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", ROLE_BADGE_STYLES[user.role] ?? "border border-neutral-200 bg-neutral-100 text-neutral-600")}>
                          {user.role}
                        </span>
                        <span className={clsxMerge(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          user.isActive
                            ? "border border-success-500/30 bg-success-50 text-success-700"
                            : "border border-neutral-200 bg-neutral-100 text-neutral-600"
                        )}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-neutral-500">Last active: {formatLastActive(user.lastLoginAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-5 py-3 shadow-sm">
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
        </>
      )}
    </div>
  );
}
