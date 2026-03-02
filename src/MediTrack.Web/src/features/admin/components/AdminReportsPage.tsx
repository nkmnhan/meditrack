import { BarChart3, TrendingUp, TrendingDown, Users, Clock, FileCheck } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";

/* ── Breadcrumb ── */

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Admin", href: "/admin" },
  { label: "Reports" },
];

/* ── Mock data ── */

const statCards = [
  {
    title: "Total Sessions",
    value: "4,218",
    trend: "+12.5%",
    trendDirection: "up" as const,
    icon: BarChart3,
    iconBg: "bg-primary-50",
    iconColor: "text-primary-700",
  },
  {
    title: "AI Drafts Saved",
    value: "3,847",
    trend: "+8.2%",
    trendDirection: "up" as const,
    icon: FileCheck,
    iconBg: "bg-success-50",
    iconColor: "text-success-600",
  },
  {
    title: "Active Users",
    value: "284",
    trend: "-2.1%",
    trendDirection: "down" as const,
    icon: Users,
    iconBg: "bg-secondary-50",
    iconColor: "text-secondary-700",
  },
  {
    title: "Avg Session Length",
    value: "18m 42s",
    trend: "+1.3%",
    trendDirection: "up" as const,
    icon: Clock,
    iconBg: "bg-accent-50",
    iconColor: "text-accent-600",
  },
];

const sessionVolumeByDay = [
  { day: "Mon", sessions: 620 },
  { day: "Tue", sessions: 710 },
  { day: "Wed", sessions: 680 },
  { day: "Thu", sessions: 590 },
  { day: "Fri", sessions: 740 },
  { day: "Sat", sessions: 430 },
  { day: "Sun", sessions: 448 },
];

const maxSessions = Math.max(...sessionVolumeByDay.map((day) => day.sessions));

const suggestionBreakdown = [
  { category: "Medication", percentage: 44, color: "bg-primary-600" },
  { category: "Guideline", percentage: 30, color: "bg-secondary-600" },
  { category: "Recommendation", percentage: 18, color: "bg-accent-500" },
  { category: "Urgent", percentage: 8, color: "bg-error-500" },
];

const providerLeaderboard = [
  { rank: 1, name: "Dr. Nguyen", initials: "TN", specialty: "Internal Medicine", sessions: 412, saveRate: 94, avatarBg: "bg-primary-100 text-primary-700" },
  { rank: 2, name: "Dr. Lee", initials: "JL", specialty: "Cardiology", sessions: 387, saveRate: 91, avatarBg: "bg-secondary-100 text-secondary-700" },
  { rank: 3, name: "Dr. Smith", initials: "AS", specialty: "Family Medicine", sessions: 356, saveRate: 89, avatarBg: "bg-accent-100 text-accent-700" },
  { rank: 4, name: "Dr. Kim", initials: "SK", specialty: "Pediatrics", sessions: 334, saveRate: 87, avatarBg: "bg-warning-100 text-warning-700" },
  { rank: 5, name: "Dr. Patel", initials: "RP", specialty: "Neurology", sessions: 298, saveRate: 85, avatarBg: "bg-info-100 text-info-700" },
];

/* ── Component ── */

export function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
            <BarChart3 className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Reports & Analytics</h1>
            <p className="text-sm text-neutral-500">Performance overview and usage metrics</p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
          Last 30 days
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.title} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between">
              <div className={clsxMerge("flex h-10 w-10 items-center justify-center rounded-lg", card.iconBg)}>
                <card.icon className={clsxMerge("h-5 w-5", card.iconColor)} />
              </div>
              <div className={clsxMerge(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                card.trendDirection === "up"
                  ? "bg-success-50 text-success-700"
                  : "bg-error-50 text-error-700"
              )}>
                {card.trendDirection === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {card.trend}
              </div>
            </div>
            <p className="text-2xl font-bold text-neutral-900">{card.value}</p>
            <p className="mt-1 text-sm text-neutral-500">{card.title}</p>
          </div>
        ))}
      </div>

      {/* Session Volume + Suggestion Breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Session Volume Bar Chart */}
        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">Session Volume</h2>
          <div className="flex items-end justify-between gap-2 sm:gap-4" style={{ height: "200px" }}>
            {sessionVolumeByDay.map((day) => {
              const heightPercentage = (day.sessions / maxSessions) * 100;
              return (
                <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-medium text-neutral-700">{day.sessions}</span>
                  <div className="w-full max-w-[48px]" style={{ height: "160px" }}>
                    <div className="flex h-full items-end">
                      <div
                        className="w-full rounded-t-md bg-primary-600 transition-all duration-300 hover:bg-primary-700"
                        style={{ height: `${heightPercentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-neutral-500">{day.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Suggestion Breakdown */}
        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">Suggestion Breakdown</h2>
          <div className="space-y-4">
            {suggestionBreakdown.map((item) => (
              <div key={item.category}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-700">{item.category}</span>
                  <span className="text-sm font-semibold text-neutral-900">{item.percentage}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={clsxMerge("h-full rounded-full transition-all duration-500", item.color)}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Provider Leaderboard */}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 p-5 pb-3">
          <h2 className="text-lg font-semibold text-neutral-900">Provider Leaderboard</h2>
          <p className="mt-0.5 text-sm text-neutral-500">Top providers by session volume and save rate</p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-5 py-3">Rank</th>
                <th className="px-5 py-3">Provider</th>
                <th className="px-5 py-3">Specialty</th>
                <th className="px-5 py-3 text-right">Sessions</th>
                <th className="px-5 py-3 text-right">Save Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {providerLeaderboard.map((provider) => (
                <tr key={provider.rank} className="transition-colors hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <span className={clsxMerge(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                      provider.rank <= 3
                        ? "bg-primary-100 text-primary-700"
                        : "bg-neutral-100 text-neutral-600"
                    )}>
                      {provider.rank}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={clsxMerge("flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold", provider.avatarBg)}>
                        {provider.initials}
                      </div>
                      <span className="text-sm font-medium text-neutral-900">{provider.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-neutral-600">{provider.specialty}</td>
                  <td className="px-5 py-3 text-right text-sm font-medium text-neutral-900">{provider.sessions}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={clsxMerge(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      provider.saveRate >= 90
                        ? "bg-success-50 text-success-700"
                        : "bg-warning-50 text-warning-700"
                    )}>
                      {provider.saveRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-neutral-200 md:hidden">
          {providerLeaderboard.map((provider) => (
            <div key={provider.rank} className="flex items-center gap-3 px-5 py-4">
              <span className={clsxMerge(
                "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                provider.rank <= 3
                  ? "bg-primary-100 text-primary-700"
                  : "bg-neutral-100 text-neutral-600"
              )}>
                {provider.rank}
              </span>
              <div className={clsxMerge("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold", provider.avatarBg)}>
                {provider.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">{provider.name}</p>
                <p className="text-xs text-neutral-500">{provider.specialty}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-medium text-neutral-900">{provider.sessions} sessions</p>
                <span className={clsxMerge(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  provider.saveRate >= 90
                    ? "bg-success-50 text-success-700"
                    : "bg-warning-50 text-warning-700"
                )}>
                  {provider.saveRate}% saved
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
