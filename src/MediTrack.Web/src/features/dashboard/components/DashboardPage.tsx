import { Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import {
  CalendarDays, UserCheck, FileText, Sparkles, CalendarPlus, UserPlus, FileSearch, Users,
  Clock, ArrowUpRight,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useClaraPanel } from "@/shared/components/clara/ClaraPanelContext";
import { claraSuggestions } from "@/features/clara/data/clara-suggestions";

/* ── Mock data (will be replaced by RTK Query when APIs are ready) ── */

const statCards = [
  { title: "Today's Appointments", value: "12", icon: CalendarDays, iconBg: "bg-primary-50", iconColor: "text-primary-700", trend: "+3 from yesterday", trendColor: "text-success-500" },
  { title: "Patients Seen", value: "8", icon: UserCheck, iconBg: "bg-secondary-50", iconColor: "text-secondary-700", trend: "On track", trendColor: "text-success-500" },
  { title: "Pending Records", value: "5", icon: FileText, iconBg: "bg-warning-50", iconColor: "text-warning-500", trend: "2 urgent", trendColor: "text-warning-500" },
  { title: "Clara Sessions", value: "3", icon: Sparkles, iconBg: "bg-accent-50", iconColor: "text-accent-500", trend: "1 active", trendColor: "text-accent-500" },
];

const SPARKLINE_HEIGHTS = [
  [50, 70, 40, 90, 60, 80, 45],
  [30, 60, 85, 55, 70, 40, 90],
  [80, 45, 65, 35, 75, 55, 60],
  [60, 90, 50, 70, 35, 85, 40],
];

const appointments = [
  { time: "09:00 AM", patient: "Sarah Johnson", type: "Follow-up", status: "Confirmed", statusColor: "bg-accent-100 text-accent-700", duration: "30 min" },
  { time: "09:30 AM", patient: "Michael Chen", type: "New Visit", status: "Checked In", statusColor: "bg-info-50 text-info-700", duration: "45 min" },
  { time: "10:15 AM", patient: "Emily Rivera", type: "Lab Review", status: "Scheduled", statusColor: "bg-primary-100 text-primary-700", duration: "20 min" },
  { time: "11:00 AM", patient: "James O'Brien", type: "Follow-up", status: "In Progress", statusColor: "bg-warning-50 text-warning-700", duration: "30 min" },
  { time: "11:30 AM", patient: "Aisha Patel", type: "Urgent", status: "Scheduled", statusColor: "bg-primary-100 text-primary-700", duration: "30 min" },
];

const quickActions = [
  { label: "New Appointment", icon: CalendarPlus, bg: "bg-primary-700 hover:bg-primary-600", text: "text-white", to: "/appointments" },
  { label: "Register Patient", icon: UserPlus, bg: "bg-secondary-700 hover:bg-secondary-600", text: "text-white", to: "/patients/new" },
  { label: "View Records", icon: FileSearch, bg: "bg-white hover:bg-neutral-50", text: "text-neutral-700", border: true, to: "/medical-records" },
];

const recentPatients = [
  { initials: "SJ", name: "Sarah Johnson", mrn: "MRN-2847", lastVisit: "Today", color: "bg-primary-100 text-primary-700", isActive: true, id: "1" },
  { initials: "MC", name: "Michael Chen", mrn: "MRN-1923", lastVisit: "Today", color: "bg-secondary-100 text-secondary-700", isActive: true, id: "2" },
  { initials: "ER", name: "Emily Rivera", mrn: "MRN-3312", lastVisit: "Feb 25", color: "bg-accent-100 text-accent-700", isActive: true, id: "3" },
  { initials: "JO", name: "James O'Brien", mrn: "MRN-0847", lastVisit: "Feb 20", color: "bg-warning-50 text-warning-700", isActive: false, id: "4" },
];

/* ── Sub-components ── */

function Sparkline({ heights, colorClass }: { readonly heights: number[]; readonly colorClass: string }) {
  return (
    <div className="mt-1.5 flex h-5 items-end gap-0.5">
      {heights.map((height, index) => (
        <div
          key={index}
          className={clsxMerge("w-1 rounded-full opacity-30", colorClass)}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

/* ── Main component ── */

export function DashboardPage() {
  const auth = useAuth();
  const { openPanel } = useClaraPanel();

  const userName = auth.user?.profile?.name ?? auth.user?.profile?.email ?? "Doctor";
  const firstName = String(userName).split(" ")[0];
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

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
        </div>
      </div>
      <div className="mb-5 md:hidden">
        <h1 className="text-xl font-bold text-neutral-900">Good morning, {firstName}</h1>
        <p className="mt-0.5 text-sm text-neutral-500">Here's your overview for today</p>
      </div>

      {/* Next Patient Banner */}
      <div className="relative mb-6 overflow-hidden rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-secondary-100 text-sm font-bold text-secondary-700">
              MC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-neutral-500" />
                <span className="text-xs text-neutral-500">Up next in 8 min</span>
              </div>
              <p className="text-lg font-bold text-neutral-900">Michael Chen</p>
              <span className="mt-0.5 inline-flex items-center rounded-full bg-info-50 px-2.5 py-0.5 text-xs font-medium text-info-700">
                New Visit
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {statCards.map((card, index) => (
          <div key={card.title} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 flex items-start justify-between">
              <div className={clsxMerge("flex h-10 w-10 items-center justify-center rounded-lg", card.iconBg)}>
                <card.icon className={clsxMerge("h-5 w-5", card.iconColor)} />
              </div>
              <ArrowUpRight className="h-4 w-4 text-neutral-300" />
            </div>
            <p className="text-3xl font-bold text-neutral-900">{card.value}</p>
            <Sparkline heights={SPARKLINE_HEIGHTS[index]} colorClass={card.iconColor.replace("text-", "bg-")} />
            <p className="mt-1 text-sm text-neutral-500">{card.title}</p>
            <p className={clsxMerge("mt-1 text-xs font-medium", card.trendColor)}>{card.trend}</p>
          </div>
        ))}
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
          <div className="divide-y divide-neutral-200">
            {appointments.map((appointment, index) => (
              <Link
                key={index}
                to="/appointments"
                className={clsxMerge(
                  "flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-neutral-50",
                  appointment.status === "In Progress" && "border-l-2 border-l-primary-200"
                )}
              >
                <div className="w-20 flex-shrink-0">
                  <p className="text-sm font-medium text-neutral-900">{appointment.time}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-700">{appointment.patient}</p>
                </div>
                {index === 0 && (
                  <span className="inline-flex items-center rounded-full bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700">Next up</span>
                )}
                <span className="hidden items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 sm:inline-flex">{appointment.type}</span>
                <span className={clsxMerge("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", appointment.statusColor)}>{appointment.status}</span>
                <span className="hidden w-14 text-right text-xs text-neutral-500 md:block">
                  <Clock className="mr-0.5 inline h-3 w-3" />{appointment.duration}
                </span>
              </Link>
            ))}
          </div>
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
          <div className="divide-y divide-neutral-200">
            {recentPatients.map((patient) => (
              <Link
                key={patient.id}
                to={`/patients/${patient.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-neutral-50"
              >
                <div className={clsxMerge("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold", patient.color)}>
                  {patient.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{patient.name}</p>
                  <p className="text-xs text-neutral-500">{patient.mrn}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs text-neutral-500">{patient.lastVisit}</p>
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
