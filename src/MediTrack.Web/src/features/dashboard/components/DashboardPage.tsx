import { type ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import {
  CalendarDays, UserCheck, FileText, Sparkles, CalendarPlus, UserPlus, FileSearch, Users,
  Clock, ArrowUpRight, Loader2, AlertCircle, TrendingUp, TrendingDown, X, Check,
  CalendarClock,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useClaraPanel } from "@/shared/components/clara/ClaraPanelContext";
import { NotificationCenter } from "@/shared/components/NotificationCenter";
import { claraSuggestions } from "@/features/clara/data/clara-suggestions";
import { useDashboard } from "../hooks/useDashboard";
import { useDashboardLayout } from "../hooks/useDashboardLayout";
import { DashboardCustomizer } from "./DashboardCustomizer";
import { getInitials, getAvatarColor } from "@/shared/utils/avatarUtils";
import type { AppointmentListItem } from "@/features/appointments/types";

/* ── Static data (intentional — not from backend) ── */

const quickActions = [
  { label: "New Appointment", icon: CalendarPlus, bg: "bg-primary-700 hover:bg-primary-600", text: "text-white", to: "/appointments" },
  { label: "Register Patient", icon: UserPlus, bg: "bg-secondary-700 hover:bg-secondary-600", text: "text-white", to: "/patients/new" },
  { label: "View Records", icon: FileSearch, bg: "bg-card hover:bg-muted", text: "text-foreground/80", border: true, to: "/medical-records" },
  { label: "Today's Schedule", icon: CalendarClock, bg: "bg-card hover:bg-muted", text: "text-foreground/80", border: true, to: "/appointments?view=day" },
];

const STATUS_COLORS: Record<string, string> = {
  Scheduled: "bg-primary-100 text-primary-700",
  Confirmed: "bg-accent-100 text-accent-700",
  CheckedIn: "bg-info-50 text-info-700",
  InProgress: "bg-warning-50 text-warning-700",
  Completed: "bg-success-50 text-success-700",
  Cancelled: "bg-muted text-muted-foreground",
  NoShow: "bg-error-50 text-error-700",
  Rescheduled: "bg-muted text-muted-foreground",
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

/* ── Static demo deltas for stat cards ── */

interface StatDelta {
  readonly value: number;
  readonly label: string;
}

const STAT_DELTAS: Record<string, StatDelta> = {
  "Today's Appointments": { value: 3, label: "vs yesterday" },
  "Patients Seen": { value: -1, label: "vs yesterday" },
  "Pending Records": { value: 2, label: "vs last week" },
  "Clara Sessions": { value: 5, label: "vs last week" },
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
    <div className="animate-pulse rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div className="h-10 w-10 rounded-lg bg-border" />
        <div className="h-4 w-4 rounded bg-muted" />
      </div>
      <div className="h-9 w-16 rounded bg-border" />
      <div className="mt-3 h-4 w-24 rounded bg-muted" />
      <div className="mt-2 h-3 w-20 rounded bg-muted" />
    </div>
  );
}

function DeltaIndicator({ delta }: { readonly delta: StatDelta }) {
  const isPositive = delta.value >= 0;
  const DeltaIcon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? "text-success-600" : "text-error-600";

  return (
    <p className={clsxMerge("mt-0.5 flex items-center gap-1 text-xs", colorClass)}>
      <DeltaIcon className="h-3 w-3" />
      <span>
        {isPositive ? "+" : ""}
        {delta.value} {delta.label}
      </span>
    </p>
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

/* ── Stat card navigation targets ── */

const STAT_CARD_ROUTES: Record<string, string> = {
  "Today's Appointments": "/appointments",
  "Patients Seen": "/patients",
  "Pending Records": "/medical-records?status=Active",
  "Clara Sessions": "/admin/reports",
};

/* ── Main component ── */

export function DashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { openPanel } = useClaraPanel();
  const dashboard = useDashboard();
  const { widgets, moveWidget, toggleWidgetVisibility, resetLayout } = useDashboardLayout();

  /* ── Clara suggestion dismiss state ── */
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem("meditrack-dismissed-suggestions");
    return stored ? new Set<string>(JSON.parse(stored) as string[]) : new Set<string>();
  });

  function handleDismissSuggestion(suggestionId: string) {
    setDismissedSuggestionIds((previous) => {
      const updated = new Set(previous);
      updated.add(suggestionId);
      localStorage.setItem("meditrack-dismissed-suggestions", JSON.stringify([...updated]));
      return updated;
    });
  }

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

  const visibleSuggestions = claraSuggestions.filter(
    (suggestion) => !dismissedSuggestionIds.has(suggestion.id)
  );

  /* ── Widget content lookup ── */

  const widgetContent: Record<string, ReactNode> = {
    stats: (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {dashboard.isLoading
          ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
          : statCards.map((card) => {
              const delta = STAT_DELTAS[card.title];
              const route = STAT_CARD_ROUTES[card.title];
              return (
                <button
                  key={card.title}
                  onClick={() => route && navigate(route)}
                  className="cursor-pointer rounded-lg border border-border bg-card p-5 text-left shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className={clsxMerge("flex h-10 w-10 items-center justify-center rounded-lg", card.iconBg)}>
                      <card.icon className={clsxMerge("h-5 w-5", card.iconColor)} />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  {delta && <DeltaIndicator delta={delta} />}
                  <Sparkline heights={dashboard.appointmentCountsByDay} colorClass={card.sparklineColor} />
                  <p className="mt-1 text-sm text-muted-foreground">{card.title}</p>
                  {card.trend && (
                    <p className={clsxMerge("mt-1 text-xs font-medium", card.trendColor)}>{card.trend}</p>
                  )}
                </button>
              );
            })
        }
      </div>
    ),

    schedule: (
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-5 pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary-700" />
            <h2 className="text-lg font-semibold text-foreground">Today's Schedule</h2>
          </div>
          <Link to="/appointments" className="text-sm font-medium text-primary-700 hover:underline">View All</Link>
        </div>
        {dashboard.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
          </div>
        ) : dashboard.appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No appointments scheduled for today</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {dashboard.appointments.map((appointment: AppointmentListItem, index: number) => (
              <Link
                key={appointment.id}
                to="/appointments"
                className={clsxMerge(
                  "flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted",
                  appointment.status === "InProgress" && "border-l-2 border-l-primary-200"
                )}
              >
                <div className="w-20 flex-shrink-0">
                  <p className="text-sm font-medium text-foreground">{formatTime(appointment.scheduledDateTime)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground/80">{appointment.patientName}</p>
                </div>
                {index === 0 && (
                  <span className="inline-flex items-center rounded-full bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700">Next up</span>
                )}
                <span className="hidden items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 sm:inline-flex">{appointment.type}</span>
                <span className={clsxMerge("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[appointment.status] ?? "bg-muted text-foreground/80")}>
                  {STATUS_DISPLAY[appointment.status] ?? appointment.status}
                </span>
                <span className="hidden w-14 text-right text-xs text-muted-foreground md:block">
                  <Clock className="mr-0.5 inline h-3 w-3" />{formatDuration(appointment.durationMinutes)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    ),

    "quick-actions": (
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="space-y-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className={clsxMerge(
                "flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
                action.bg, action.text,
                action.border && "border border-border"
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
    ),

    "recent-patients": (
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-5 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-foreground/80" />
            <h2 className="text-lg font-semibold text-foreground">Recent Patients</h2>
          </div>
          <Link to="/patients" className="text-sm font-medium text-primary-700 hover:underline">View All</Link>
        </div>
        {dashboard.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
          </div>
        ) : dashboard.recentPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No patients found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {dashboard.recentPatients.map((patient) => (
              <Link
                key={patient.id}
                to={`/patients/${patient.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted"
              >
                <div className={clsxMerge("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold", getAvatarColor(patient.fullName))}>
                  {getInitials(patient.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{patient.fullName}</p>
                  <p className="text-xs text-muted-foreground">{patient.medicalRecordNumber}</p>
                </div>
                <span className={clsxMerge(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  patient.isActive
                    ? "border border-success-500/30 bg-success-50 text-success-700"
                    : "border border-border bg-muted text-muted-foreground"
                )}>
                  {patient.isActive ? "Active" : "Inactive"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    ),

    "clara-suggestions": (
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border p-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className="h-5 w-5 text-accent-500" />
              <Sparkles className="absolute -right-1.5 -top-1 h-3 w-3 text-accent-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Clara's Suggestions</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Click a suggestion to ask Clara</p>
        </div>
        <div className="divide-y divide-border">
          {visibleSuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Check className="h-6 w-6 text-success-500" />
              <p className="mt-2 text-sm text-muted-foreground">All suggestions reviewed</p>
            </div>
          ) : (
            visibleSuggestions.map((suggestion) => {
              const SuggestionIcon = suggestion.icon;
              return (
                <div
                  key={suggestion.id}
                  className="group flex w-full items-start gap-0 transition-opacity"
                >
                  <button
                    onClick={() => openPanel(suggestion.prompt)}
                    className="flex min-w-0 flex-1 gap-3 px-5 py-4 text-left transition-colors hover:bg-accent-50/50"
                  >
                    <div className={clsxMerge("w-1 flex-shrink-0 rounded-full", suggestion.accentColor)} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center gap-2">
                        <SuggestionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs font-semibold text-foreground/80">{suggestion.category}</p>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/80">{suggestion.label}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDismissSuggestion(suggestion.id)}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center self-center text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={`Dismiss ${suggestion.label}`}
                    title="Mark as reviewed"
                  >
                    <X className="h-4 w-4 hover:text-muted-foreground" />
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="border-t border-border p-4">
          <button
            onClick={() => openPanel()}
            className="flex items-center gap-1 text-sm font-medium text-accent-700 hover:underline"
          >
            <Sparkles className="h-4 w-4" /> Ask Clara anything
          </button>
        </div>
      </div>
    ),
  };

  /* ── Render visible widgets in user-defined order ── */

  const visibleWidgets = widgets.filter((widget) => widget.isVisible);

  /**
   * Group adjacent widgets that originally shared a grid layout.
   * "schedule" + "quick-actions" share a 3-col grid.
   * "recent-patients" + "clara-suggestions" share a 2-col grid.
   * "stats" always renders full-width on its own.
   *
   * When one widget in a pair is hidden, the remaining one renders full-width.
   */
  function renderWidgetSections(): ReactNode[] {
    const sections: ReactNode[] = [];
    const rendered = new Set<string>();

    for (const widget of visibleWidgets) {
      if (rendered.has(widget.id)) continue;
      rendered.add(widget.id);

      if (widget.id === "stats") {
        sections.push(
          <div key="stats" className="mt-6 first:mt-0">
            {widgetContent.stats}
          </div>
        );
        continue;
      }

      // Schedule + Quick Actions pairing
      if (widget.id === "schedule" || widget.id === "quick-actions") {
        const partnerId = widget.id === "schedule" ? "quick-actions" : "schedule";
        const partnerWidget = visibleWidgets.find((visibleWidget) => visibleWidget.id === partnerId);
        const isPartnerNext = partnerWidget && !rendered.has(partnerId);

        if (isPartnerNext) {
          rendered.add(partnerId);
          // Render both in original grid layout, respecting which comes first
          const scheduleFirst = widget.id === "schedule";
          sections.push(
            <div key="schedule-quick-actions" className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
              <div className="lg:col-span-2">
                {scheduleFirst ? widgetContent.schedule : widgetContent["quick-actions"]}
              </div>
              {scheduleFirst ? widgetContent["quick-actions"] : widgetContent.schedule}
            </div>
          );
        } else {
          // Partner is hidden or already rendered — render solo full-width
          sections.push(
            <div key={widget.id} className="mt-6">
              {widgetContent[widget.id]}
            </div>
          );
        }
        continue;
      }

      // Recent Patients + Clara Suggestions pairing
      if (widget.id === "recent-patients" || widget.id === "clara-suggestions") {
        const partnerId = widget.id === "recent-patients" ? "clara-suggestions" : "recent-patients";
        const partnerWidget = visibleWidgets.find((visibleWidget) => visibleWidget.id === partnerId);
        const isPartnerNext = partnerWidget && !rendered.has(partnerId);

        if (isPartnerNext) {
          rendered.add(partnerId);
          const recentFirst = widget.id === "recent-patients";
          sections.push(
            <div key="recent-clara" className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
              {recentFirst ? widgetContent["recent-patients"] : widgetContent["clara-suggestions"]}
              {recentFirst ? widgetContent["clara-suggestions"] : widgetContent["recent-patients"]}
            </div>
          );
        } else {
          sections.push(
            <div key={widget.id} className="mt-6">
              {widgetContent[widget.id]}
            </div>
          );
        }
        continue;
      }
    }

    return sections;
  }

  return (
    <>
      {/* Desktop top bar */}
      <div className="mb-8 hidden items-center justify-between md:flex">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good morning, {firstName}</h1>
          <p className="mt-0.5 text-muted-foreground">Here's your overview for today</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{today}</span>
          <NotificationCenter />
          <DashboardCustomizer
            widgets={widgets}
            onMoveWidget={moveWidget}
            onToggleVisibility={toggleWidgetVisibility}
            onReset={resetLayout}
          />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-700 text-sm font-semibold text-white">
            {firstName[0]?.toUpperCase() ?? "D"}
          </div>
        </div>
      </div>
      <div className="mb-5 flex items-center justify-between md:hidden">
        <div>
          <h1 className="text-xl font-bold text-foreground">Good morning, {firstName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Here's your overview for today</p>
        </div>
        <DashboardCustomizer
          widgets={widgets}
          onMoveWidget={moveWidget}
          onToggleVisibility={toggleWidgetVisibility}
          onReset={resetLayout}
        />
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
        <div className="relative mb-6 overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={clsxMerge("flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold", getAvatarColor(nextAppointment.patientName))}>
                {getInitials(nextAppointment.patientName)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Up next — {formatTime(nextAppointment.scheduledDateTime)}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{nextAppointment.patientName}</p>
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
              <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <Sparkles className="relative z-10 h-4 w-4" />
              <span className="relative z-10">Start with Clara</span>
            </Link>
          </div>
        </div>
      )}

      {/* Customizable Widget Sections */}
      {renderWidgetSections()}
    </>
  );
}
