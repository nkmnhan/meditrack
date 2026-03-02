import { Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import {
  CalendarDays, UserCheck, FileText, Sparkles, CalendarPlus, UserPlus, FileSearch, Users,
  Clock, ArrowUpRight, Bell, Loader2, AlertCircle,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useClaraPanel } from "@/shared/components/clara/ClaraPanelContext";
import { claraSuggestions } from "@/features/clara/data/clara-suggestions";
import { useDashboard } from "../hooks/useDashboard";
import { getInitials, getAvatarColor } from "@/shared/utils/avatarUtils";
import type { AppointmentListItem } from "@/features/appointments/types";

/* ── Static data (intentional — not from backend) ── */

const quickActions = [
  { label: "New Appointment", icon: CalendarPlus, bg: "bg-primary-700 hover:bg-primary-600", text: "text-white", to: "/appointments" },
  { label: "Register Patient", icon: UserPlus, bg: "bg-secondary-700 hover:bg-secondary-600", text: "text-white", to: "/patients/new" },
  { label: "View Records", icon: FileSearch, bg: "bg-white hover:bg-neutral-50", text: "text-neutral-700", border: true, to: "/medical-records" },
];

const STATUS_COLORS: Record<string, string> = {
  Scheduled: "bg-primary-100 text-primary-700",
  Confirmed: "bg-accent-100 text-accent-700",
  CheckedIn: "bg-info-50 text-info-700",
  InProgress: "bg-warning-50 text-warning-700",
  Completed: "bg-success-50 text-success-700",
  Cancelled: "bg-neutral-100 text-neutral-500",
  NoShow: "bg-error-50 text-error-700",
  Rescheduled: "bg-neutral-100 text-neutral-500",
};

const STATUS_DISPLAY: Record<string, string> = {
  Scheduled: "Scheduled",
  Confirmed: "Confirmed",
  CheckedIn: "Checked In",
  InProgress: "In Progress",
  Completed: "Completed",
  Cancelled: "Cancelled",
  NoShow: "No Show",
  Rescheduled: "Rescheduled",
};

/* ── Sub-components ── */

function Sparkline({ heights, colorClass }: { readonly heights: number[]; readonly colorClass: string }) {
  const maxHeight = Math.max(...heights, 1);
  return (
    <div className="mt-1.5 flex h-5 items-end gap-0.5">
      {heights.map((height, index) => (
        <div
          key={index}
          className={clsxMerge("w-1 rounded-full opacity-30", colorClass)}
          style={{ height: `${Math.max((height / maxHeight) * 100, 5)}%` }}
        />
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div className="h-10 w-10 rounded-lg bg-neutral-200" />
        <div className="h-4 w-4 rounded bg-neutral-100" />
      </div>
      <div className="h-9 w-16 rounded bg-neutral-200" />
      <div className="mt-3 h-4 w-24 rounded bg-neutral-100" />
      <div className="mt-2 h-3 w-20 rounded bg-neutral-100" />
    </div>
  );
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

/* ── Main component ── */

export function DashboardPage() {
  const auth = useAuth();
  const { openPanel } = useClaraPanel();
  const dashboard = useDashboard();

  const userName = auth.user?.profile?.name ?? auth.user?.profile?.email ?? "Doctor";
  const firstName = String(userName).split(" ")[0];
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const statCards = [
    {
      title: "Today's Appointments",
      value: String(dashboard.todayAppointmentCount),
      icon: CalendarDays,
      iconBg: "bg-primary-50",
      iconColor: "text-primary-700",
      sparklineColor: "bg-primary-700",
    },
    {
      title: "Patients Seen",
      value: String(dashboard.patientsSeen),
      icon: UserCheck,
      iconBg: "bg-secondary-50",
      iconColor: "text-secondary-700",
      sparklineColor: "bg-secondary-700",
    },
    {
      title: "Pending Records",
      value: String(dashboard.pendingRecords),
      icon: FileText,
      iconBg: "bg-warning-50",
      iconColor: "text-warning-500",
      sparklineColor: "bg-warning-500",
      trend: dashboard.urgentRecords > 0 ? `${dashboard.urgentRecords} urgent` : undefined,
      trendColor: "text-warning-500",
    },
    {
      title: "Clara Sessions",
      value: String(dashboard.claraSessionCount),
      icon: Sparkles,
      iconBg: "bg-accent-50",
      iconColor: "text-accent-500",
      sparklineColor: "bg-accent-500",
      trend: dashboard.activeSessionCount > 0 ? `${dashboard.activeSessionCount} active` : undefined,
      trendColor: "text-accent-500",
    },
  ];

  const nextAppointment = dashboard.appointments.find(
    (appointment: AppointmentListItem) =>
      appointment.status === "CheckedIn" || appointment.status === "Confirmed" || appointment.status === "Scheduled"
  );

  return (
    <>
      {/* Desktop top bar */}
      <div className="mb-8 hidden items-center justify-between md:flex">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Good morning, {firstName}</h1>
          <p className="mt-0.5 text-neutral-500">Here's your overview for today</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-500">{today}</span>
          <button className="relative rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error-500 ring-2 ring-white" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-700 text-sm font-semibold text-white">
            {firstName[0]?.toUpperCase() ?? "D"}
          </div>
        </div>
      </div>
      <div className="mb-5 md:hidden">
        <h1 className="text-xl font-bold text-neutral-900">Good morning, {firstName}</h1>
        <p className="mt-0.5 text-sm text-neutral-500">Here's your overview for today</p>
      </div>

      {/* Error Banner */}
      {dashboard.isError && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-error-200 bg-error-50 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-error-500" />
          <p className="text-sm text-error-700">Some dashboard data couldn't be loaded. Showing available data below.</p>
        </div>
      )}

      {/* Next Patient Banner */}
      {nextAppointment && (
        <div className="relative mb-6 overflow-hidden rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={clsxMerge("flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold", getAvatarColor(nextAppointment.patientName))}>
                {getInitials(nextAppointment.patientName)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-neutral-500" />
                  <span className="text-xs text-neutral-500">Up next — {formatTime(nextAppointment.scheduledDateTime)}</span>
                </div>
                <p className="text-lg font-bold text-neutral-900">{nextAppointment.patientName}</p>
                <span className="mt-0.5 inline-flex items-center rounded-full bg-info-50 px-2.5 py-0.5 text-xs font-medium text-info-700">
                  {nextAppointment.type}
                </span>
              </div>
            </div>
            <Link
              to="/clara"
              className={clsxMerge(
                "relative flex flex-shrink-0 items-center justify-center gap-2",
                "h-10 overflow-hidden rounded-xl px-5",
                "bg-gradient-to-r from-accent-500 to-accent-700",
                "text-sm font-semibold text-white shadow-md",
                "transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
              )}
            >
              <span className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <Sparkles className="relative z-10 h-4 w-4" />
              <span className="relative z-10">Start with Clara</span>
            </Link>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {dashboard.isLoading
          ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
          : statCards.map((card) => (
              <div key={card.title} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-3 flex items-start justify-between">
                  <div className={clsxMerge("flex h-10 w-10 items-center justify-center rounded-lg", card.iconBg)}>
                    <card.icon className={clsxMerge("h-5 w-5", card.iconColor)} />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-neutral-300" />
                </div>
                <p className="text-3xl font-bold text-neutral-900">{card.value}</p>
                <Sparkline heights={dashboard.appointmentCountsByDay} colorClass={card.sparklineColor} />
                <p className="mt-1 text-sm text-neutral-500">{card.title}</p>
                {card.trend && (
                  <p className={clsxMerge("mt-1 text-xs font-medium", card.trendColor)}>{card.trend}</p>
                )}
              </div>
            ))
        }
      </div>

      {/* Schedule + Quick Actions */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-neutral-200 p-5 pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary-700" />
              <h2 className="text-lg font-semibold text-neutral-900">Today's Schedule</h2>
            </div>
            <Link to="/appointments" className="text-sm font-medium text-primary-700 hover:underline">View All</Link>
          </div>
          {dashboard.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : dashboard.appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CalendarDays className="h-8 w-8 text-neutral-300" />
              <p className="mt-2 text-sm text-neutral-500">No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {dashboard.appointments.map((appointment: AppointmentListItem, index: number) => (
                <Link
                  key={appointment.id}
                  to="/appointments"
                  className={clsxMerge(
                    "flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-neutral-50",
                    appointment.status === "InProgress" && "border-l-2 border-l-primary-200"
                  )}
                >
                  <div className="w-20 flex-shrink-0">
                    <p className="text-sm font-medium text-neutral-900">{formatTime(appointment.scheduledDateTime)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-700">{appointment.patientName}</p>
                  </div>
                  {index === 0 && (
                    <span className="inline-flex items-center rounded-full bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700">Next up</span>
                  )}
                  <span className="hidden items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 sm:inline-flex">{appointment.type}</span>
                  <span className={clsxMerge("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[appointment.status] ?? "bg-neutral-100 text-neutral-700")}>
                    {STATUS_DISPLAY[appointment.status] ?? appointment.status}
                  </span>
                  <span className="hidden w-14 text-right text-xs text-neutral-500 md:block">
                    <Clock className="mr-0.5 inline h-3 w-3" />{formatDuration(appointment.durationMinutes)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className={clsxMerge(
                  "flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
                  action.bg, action.text,
                  action.border && "border border-neutral-200"
                )}
              >
                <action.icon className="h-4 w-4" /> {action.label}
              </Link>
            ))}
            <button
              onClick={() => openPanel()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-500 text-sm font-medium text-white transition-colors hover:bg-accent-700"
            >
              <Sparkles className="h-4 w-4" /> Ask Clara
            </button>
          </div>
        </div>
      </div>

      {/* Recent Patients + Clara's Suggestions */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 p-5 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-neutral-700" />
              <h2 className="text-lg font-semibold text-neutral-900">Recent Patients</h2>
            </div>
            <Link to="/patients" className="text-sm font-medium text-primary-700 hover:underline">View All</Link>
          </div>
          {dashboard.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : dashboard.recentPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-8 w-8 text-neutral-300" />
              <p className="mt-2 text-sm text-neutral-500">No patients found</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {dashboard.recentPatients.map((patient) => (
                <Link
                  key={patient.id}
                  to={`/patients/${patient.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-neutral-50"
                >
                  <div className={clsxMerge("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold", getAvatarColor(patient.fullName))}>
                    {getInitials(patient.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">{patient.fullName}</p>
                    <p className="text-xs text-neutral-500">{patient.medicalRecordNumber}</p>
                  </div>
                  <span className={clsxMerge(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    patient.isActive
                      ? "border border-success-500/30 bg-success-50 text-success-700"
                      : "border border-neutral-200 bg-neutral-100 text-neutral-500"
                  )}>
                    {patient.isActive ? "Active" : "Inactive"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 p-5 pb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Sparkles className="h-5 w-5 text-accent-500" />
                <Sparkles className="absolute -right-1.5 -top-1 h-3 w-3 text-accent-500" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Clara's Suggestions</h2>
            </div>
            <p className="mt-1 text-xs text-neutral-500">Click a suggestion to ask Clara</p>
          </div>
          <div className="divide-y divide-neutral-100">
            {claraSuggestions.map((suggestion) => {
              const SuggestionIcon = suggestion.icon;
              return (
                <button
                  key={suggestion.id}
                  onClick={() => openPanel(suggestion.prompt)}
                  className="flex w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-accent-50/50"
                >
                  <div className={clsxMerge("w-1 flex-shrink-0 rounded-full", suggestion.accentColor)} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <SuggestionIcon className="h-3.5 w-3.5 text-neutral-500" />
                      <p className="text-xs font-semibold text-neutral-700">{suggestion.category}</p>
                    </div>
                    <p className="text-sm leading-relaxed text-neutral-700">{suggestion.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="border-t border-neutral-200 p-4">
            <button
              onClick={() => openPanel()}
              className="flex items-center gap-1 text-sm font-medium text-accent-700 hover:underline"
            >
              <Sparkles className="h-4 w-4" /> Ask Clara anything
            </button>
          </div>
        </div>
      </div>

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  );
}
