import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserCog, Search, ChevronDown, ChevronLeft, ChevronRight,
  UserCheck, UserX, Loader2, UserPlus, Link2, ShieldCheck, ShieldOff, Pencil,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/components/ui/dialog";
import { toast } from "@/shared/components/ui/sonner";
import { useGetUsersQuery, useDeactivateUserMutation, useActivateUserMutation } from "../store/adminApi";
import { getInitials, getAvatarColor } from "@/shared/utils/avatarUtils";
import type { UserListItem } from "../types";

/* ── Constants ── */

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/dashboard" },
  { label: "Admin", href: "/admin" },
  { label: "User Management" },
];

const ROLE_OPTIONS = ["Doctor", "Nurse", "Receptionist", "Admin"] as const;

const DEPARTMENT_OPTIONS = [
  "Cardiology",
  "Neurology",
  "Internal Medicine",
  "Pediatrics",
  "Orthopedics",
  "Dermatology",
  "Radiology",
  "Emergency Medicine",
] as const;

const ROLE_BADGE_STYLES: Record<string, string> = {
  Doctor: "border border-primary-200 bg-primary-100 text-primary-700",
  Admin: "border border-accent-200 bg-accent-100 text-accent-700",
  Nurse: "border border-secondary-200 bg-secondary-100 text-secondary-700",
  Receptionist: "border border-border bg-muted text-muted-foreground",
  Patient: "border border-info-200 bg-info-100 text-info-700",
};

/* ── Demo data helpers ── */

/** Deterministic pseudo-random session count per user id (10-50 range) */
function getDemoSessionCount(userId: string): number {
  let hash = 0;
  for (let charIndex = 0; charIndex < userId.length; charIndex++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(charIndex)) | 0;
  }
  return 10 + (Math.abs(hash) % 41);
}

/** Deterministic 2FA status — most enabled, ~2 of first 25 disabled */
function getDemo2faEnabled(userId: string): boolean {
  let hash = 0;
  for (let charIndex = 0; charIndex < userId.length; charIndex++) {
    hash = ((hash << 7) - hash + userId.charCodeAt(charIndex)) | 0;
  }
  return Math.abs(hash) % 12 !== 0;
}

/* ── Helpers ── */

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── Invite Modal ── */

interface InviteFormState {
  readonly email: string;
  readonly role: string;
  readonly department: string;
  readonly message: string;
}

const INVITE_FORM_INITIAL: InviteFormState = {
  email: "",
  role: "Doctor",
  department: "",
  message: "",
};

function InviteUserModal({
  isOpen,
  onClose,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}) {
  const [form, setForm] = useState<InviteFormState>(INVITE_FORM_INITIAL);
  const [emailError, setEmailError] = useState("");

  function handleClose() {
    setForm(INVITE_FORM_INITIAL);
    setEmailError("");
    onClose();
  }

  function handleSendInvite() {
    if (!form.email.trim()) {
      setEmailError("Email is required");
      return;
    }
    if (!EMAIL_REGEX.test(form.email)) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError("");
    toast.success(`Invitation sent to ${form.email}`);
    handleClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>Send an invitation to join MediTrack.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="invite-email" className="mb-1 block text-sm font-medium text-foreground/80">
              Email <span className="text-error-500">*</span>
            </label>
            <input
              id="invite-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => {
                setForm({ ...form, email: event.target.value });
                if (emailError) setEmailError("");
              }}
              placeholder="doctor@hospital.org"
              className={clsxMerge(
                "h-10 w-full rounded-lg border pl-3 pr-3 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors",
                emailError ? "border-error-500" : "border-border"
              )}
            />
            {emailError && <p className="mt-1 text-xs text-error-600">{emailError}</p>}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="invite-role" className="mb-1 block text-sm font-medium text-foreground/80">Role</label>
            <div className="relative">
              <select
                id="invite-role"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
                className="h-10 w-full appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Department */}
          <div>
            <label htmlFor="invite-department" className="mb-1 block text-sm font-medium text-foreground/80">Department</label>
            <div className="relative">
              <select
                id="invite-department"
                value={form.department}
                onChange={(event) => setForm({ ...form, department: event.target.value })}
                className="h-10 w-full appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
              >
                <option value="">Select department</option>
                {DEPARTMENT_OPTIONS.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="invite-message" className="mb-1 block text-sm font-medium text-foreground/80">
              Message <span className="text-muted-foreground/70">(optional)</span>
            </label>
            <textarea
              id="invite-message"
              rows={3}
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              placeholder="Add a personal note..."
              className={clsxMerge(
                "w-full rounded-lg border border-border px-3 py-2 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors",
                "resize-none"
              )}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={handleClose}
            className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSendInvite}
            className="h-10 rounded-lg bg-primary-700 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-800"
          >
            Send Invite
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Edit User Modal ── */

interface EditUserFormState {
  readonly role: string;
  readonly department: string;
  readonly isActive: boolean;
  readonly is2faEnabled: boolean;
}

function EditUserModal({
  user,
  isOpen,
  onClose,
  onSave,
}: {
  readonly user: UserListItem | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (userId: string, changes: EditUserFormState) => void;
}) {
  const [form, setForm] = useState<EditUserFormState>({
    role: "",
    department: "",
    isActive: true,
    is2faEnabled: true,
  });

  // Sync form when user changes
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  if (user && user.id !== lastUserId) {
    setLastUserId(user.id);
    setForm({
      role: user.role,
      department: "",
      isActive: user.isActive,
      is2faEnabled: getDemo2faEnabled(user.id),
    });
  }

  if (!user) return null;

  const fullName = getUserFullName(user);

  function handleSave() {
    if (!user) return;
    onSave(user.id, form);
    toast.success(`Changes saved for ${getUserFullName(user)}`);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update settings for {fullName}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name (read-only) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">Name</label>
            <p className="h-10 flex items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground">
              {fullName}
            </p>
          </div>

          {/* Role */}
          <div>
            <label htmlFor="edit-role" className="mb-1 block text-sm font-medium text-foreground/80">Role</label>
            <div className="relative">
              <select
                id="edit-role"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
                className="h-10 w-full appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
                <option value="Patient">Patient</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Department */}
          <div>
            <label htmlFor="edit-department" className="mb-1 block text-sm font-medium text-foreground/80">Department</label>
            <div className="relative">
              <select
                id="edit-department"
                value={form.department}
                onChange={(event) => setForm({ ...form, department: event.target.value })}
                className="h-10 w-full appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
              >
                <option value="">Select department</option>
                {DEPARTMENT_OPTIONS.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Status toggle */}
          <div className="flex items-center justify-between">
            <label htmlFor="edit-status" className="text-sm font-medium text-foreground/80">Active</label>
            <button
              id="edit-status"
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={clsxMerge(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                form.isActive ? "bg-success-500" : "bg-border"
              )}
            >
              <span
                className={clsxMerge(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow transition-transform",
                  form.isActive ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* 2FA toggle */}
          <div className="flex items-center justify-between">
            <label htmlFor="edit-2fa" className="text-sm font-medium text-foreground/80">Two-Factor Auth</label>
            <button
              id="edit-2fa"
              type="button"
              role="switch"
              aria-checked={form.is2faEnabled}
              onClick={() => setForm({ ...form, is2faEnabled: !form.is2faEnabled })}
              className={clsxMerge(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                form.is2faEnabled ? "bg-success-500" : "bg-border"
              )}
            >
              <span
                className={clsxMerge(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow transition-transform",
                  form.is2faEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-10 rounded-lg bg-primary-700 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-800"
          >
            Save Changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Component ── */

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 25;

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);

  /* Local overrides for demo edits (role, status, 2fa) */
  const [userOverrides, setUserOverrides] = useState<
    Record<string, Partial<{ role: string; isActive: boolean; is2faEnabled: boolean }>>
  >({});

  const { data, isLoading, isError } = useGetUsersQuery({
    role: roleFilter || undefined,
    status: (statusFilter as "active" | "inactive") || undefined,
    search: searchQuery || undefined,
    pageNumber,
    pageSize,
  });

  const [deactivateUser, { isLoading: isDeactivating }] = useDeactivateUserMutation();
  const [activateUser, { isLoading: isActivating }] = useActivateUserMutation();
  const isToggling = isDeactivating || isActivating;

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

  function handleEditSave(userId: string, changes: EditUserFormState) {
    setUserOverrides((previous) => ({
      ...previous,
      [userId]: {
        role: changes.role,
        isActive: changes.isActive,
        is2faEnabled: changes.is2faEnabled,
      },
    }));
  }

  function getEffectiveRole(user: UserListItem): string {
    return userOverrides[user.id]?.role ?? user.role;
  }

  function getEffectiveActive(user: UserListItem): boolean {
    return userOverrides[user.id]?.isActive ?? user.isActive;
  }

  function getEffective2fa(user: UserListItem): boolean {
    return userOverrides[user.id]?.is2faEnabled ?? getDemo2faEnabled(user.id);
  }

  function handleSessionClick(doctorId: string) {
    navigate(`/admin/reports?provider=${doctorId}`);
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
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">User Management</h1>
            <p className="text-sm text-muted-foreground">{totalCount} total users</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsInviteOpen(true)}
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
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPageNumber(1);
              }}
              placeholder="Search users..."
              className={clsxMerge(
                "h-10 w-full rounded-lg border border-border pl-9 pr-3 text-sm",
                "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500",
                "transition-colors"
              )}
            />
          </div>

          {/* Role filter */}
          <div className="relative">
            <select
              value={roleFilter}
              aria-label="Filter by role"
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setPageNumber(1);
              }}
              className="h-10 appearance-none rounded-md border border-border bg-card pl-3 pr-8 text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
            >
              <option value="">All Roles</option>
              <option value="Doctor">Doctor</option>
              <option value="Admin">Admin</option>
              <option value="Nurse">Nurse</option>
              <option value="Receptionist">Receptionist</option>
              <option value="Patient">Patient</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              aria-label="Filter by status"
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPageNumber(1);
              }}
              className="h-10 appearance-none rounded-md border border-border bg-card pl-3 pr-8 text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <span className="text-sm text-muted-foreground sm:ml-auto" aria-live="polite">
            {totalCount} {totalCount === 1 ? "user" : "users"}
          </span>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-5 py-12 shadow-sm">
          <UserCog className="h-10 w-10 text-error-300" />
          <p className="mt-3 text-sm font-medium text-foreground">Failed to load users</p>
          <p className="mt-1 text-xs text-muted-foreground">Check your connection and try again</p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-5 py-12 shadow-sm">
          <UserCog className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-foreground">No users found</p>
          <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden rounded-lg border border-border bg-card shadow-sm md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">2FA</th>
                  <th className="px-5 py-3">Sessions</th>
                  <th className="px-5 py-3">Last Active</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => {
                  const fullName = getUserFullName(user);
                  const effectiveRole = getEffectiveRole(user);
                  const effectiveActive = getEffectiveActive(user);
                  const is2faEnabled = getEffective2fa(user);
                  const isDoctor = effectiveRole === "Doctor";
                  const sessionCount = isDoctor ? getDemoSessionCount(user.id) : null;

                  return (
                    <tr
                      key={user.id}
                      className={clsxMerge(
                        "transition-colors hover:bg-muted/50",
                        !is2faEnabled && "border-l-2 border-l-warning-400"
                      )}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={clsxMerge("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold", getAvatarColor(fullName))}>
                            {getInitials(fullName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{fullName}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsxMerge("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", ROLE_BADGE_STYLES[effectiveRole] ?? "border border-border bg-muted text-muted-foreground")}>
                          {effectiveRole}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsxMerge(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          effectiveActive
                            ? "border border-success-500/30 bg-success-50 text-success-700"
                            : "border border-border bg-muted text-muted-foreground"
                        )}>
                          {effectiveActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsxMerge(
                          "inline-flex items-center gap-1 text-xs font-medium",
                          is2faEnabled ? "text-success-700" : "text-muted-foreground/70"
                        )}>
                          {is2faEnabled ? (
                            <><ShieldCheck className="h-4 w-4" /> Enabled</>
                          ) : (
                            <><ShieldOff className="h-4 w-4" /> Disabled</>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {sessionCount !== null ? (
                          <button
                            type="button"
                            onClick={() => handleSessionClick(user.id)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            {sessionCount} sessions
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground/70">&mdash;</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{formatLastActive(user.lastLoginAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            aria-label={`Edit ${fullName}`}
                            onClick={() => setEditingUser(user)}
                            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground/80"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isToggling}
                            aria-label={effectiveActive ? `Deactivate ${fullName}` : `Activate ${fullName}`}
                            onClick={() => handleToggleStatus(user)}
                            className={clsxMerge(
                              "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                              isToggling && "cursor-not-allowed opacity-50",
                              effectiveActive
                                ? "text-muted-foreground/70 hover:bg-error-50 hover:text-error-600"
                                : "text-muted-foreground/70 hover:bg-success-50 hover:text-success-600"
                            )}
                          >
                            {isToggling ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : effectiveActive ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
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
              const effectiveRole = getEffectiveRole(user);
              const effectiveActive = getEffectiveActive(user);
              const is2faEnabled = getEffective2fa(user);
              const isDoctor = effectiveRole === "Doctor";
              const sessionCount = isDoctor ? getDemoSessionCount(user.id) : null;

              return (
                <div
                  key={user.id}
                  className={clsxMerge(
                    "rounded-lg border border-border bg-card p-4 shadow-sm",
                    !is2faEnabled && "border-l-2 border-l-warning-400"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={clsxMerge("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold", getAvatarColor(fullName))}>
                      {getInitials(fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Edit ${fullName}`}
                            onClick={() => setEditingUser(user)}
                            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground/80"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isToggling}
                            aria-label={effectiveActive ? `Deactivate ${fullName}` : `Activate ${fullName}`}
                            onClick={() => handleToggleStatus(user)}
                            className={clsxMerge(
                              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md transition-colors",
                              isToggling && "cursor-not-allowed opacity-50",
                              effectiveActive
                                ? "text-muted-foreground/70 hover:bg-error-50 hover:text-error-600"
                                : "text-muted-foreground/70 hover:bg-success-50 hover:text-success-600"
                            )}
                          >
                            {isToggling ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : effectiveActive ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={clsxMerge("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", ROLE_BADGE_STYLES[effectiveRole] ?? "border border-border bg-muted text-muted-foreground")}>
                          {effectiveRole}
                        </span>
                        <span className={clsxMerge(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          effectiveActive
                            ? "border border-success-500/30 bg-success-50 text-success-700"
                            : "border border-border bg-muted text-muted-foreground"
                        )}>
                          {effectiveActive ? "Active" : "Inactive"}
                        </span>
                        <span className={clsxMerge(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          is2faEnabled
                            ? "text-success-700"
                            : "border border-warning-200 bg-warning-50 text-warning-700"
                        )}>
                          {is2faEnabled ? (
                            <><ShieldCheck className="h-3.5 w-3.5" /> 2FA</>
                          ) : (
                            <><ShieldOff className="h-3.5 w-3.5" /> No 2FA</>
                          )}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Last active: {formatLastActive(user.lastLoginAt)}</p>
                        {sessionCount !== null && (
                          <button
                            type="button"
                            onClick={() => handleSessionClick(user.id)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            {sessionCount} sessions
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-3 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Page {pageNumber} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!data?.hasPreviousPage}
                  onClick={() => setPageNumber((previousPage) => previousPage - 1)}
                  className={clsxMerge(
                    "inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground/80 transition-colors",
                    data?.hasPreviousPage ? "hover:bg-muted" : "cursor-not-allowed opacity-50"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={!data?.hasNextPage}
                  onClick={() => setPageNumber((previousPage) => previousPage + 1)}
                  className={clsxMerge(
                    "inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground/80 transition-colors",
                    data?.hasNextPage ? "hover:bg-muted" : "cursor-not-allowed opacity-50"
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <InviteUserModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
      <EditUserModal
        user={editingUser}
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        onSave={handleEditSave}
      />
    </div>
  );
}
