import { BarChart3, TrendingUp, TrendingDown, Users, Clock, FileCheck, Sparkles, Loader2 } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";
import {
  useGetAnalyticsOverviewQuery,
  useGetSessionVolumeQuery,
  useGetSuggestionBreakdownQuery,
  useGetProviderLeaderboardQuery,
} from "@/features/clara/store/claraApi";
import { getInitials, getAvatarColor } from "@/shared/utils/avatarUtils";
import type { AnalyticsOverview } from "../types";

/* ── Breadcrumb ── */

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Admin", href: "/admin" },
  { label: "Reports" },
];

/* ── Helpers ── */

const SUGGESTION_TYPE_COLORS: Record<string, string> = {
  clinical: "bg-primary-600",
  medication: "bg-secondary-600",
  follow_up: "bg-accent-500",
  differential: "bg-warning-500",
};

function formatMinutes(minutes: number): string {
  const wholeMinutes = Math.floor(minutes);
  const seconds = Math.round((minutes - wholeMinutes) * 60);
  return `${wholeMinutes}m ${seconds}s`;
}

function formatDayLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function buildStatCards(overview: AnalyticsOverview) {
  return [
    {
      title: "Total Sessions",
      value: overview.totalSessions.toLocaleString(),
      trend: overview.sessionsTrend,
      icon: BarChart3,
      iconBg: "bg-primary-50",
      iconColor: "text-primary-700",
    },
    {
      title: "AI Drafts Saved",
      value: overview.aiDraftsSaved.toLocaleString(),
      trend: overview.aiDraftsTrend,
      icon: FileCheck,
      iconBg: "bg-success-50",
      iconColor: "text-success-600",
    },
    {
      title: "Active Providers",
      value: overview.activeProviders.toLocaleString(),
      trend: overview.activeProvidersTrend,
      icon: Users,
      iconBg: "bg-secondary-50",
      iconColor: "text-secondary-700",
    },
    {
      title: "Avg Session Length",
      value: formatMinutes(overview.avgSessionMinutes),
      trend: overview.avgSessionTrend,
      icon: Clock,
      iconBg: "bg-accent-50",
      iconColor: "text-accent-600",
    },
  ];
}

/* ── Component ── */

export function AdminReportsPage() {
  const { data: overview, isLoading: isLoadingOverview } = useGetAnalyticsOverviewQuery({ period: "30d" });
  const { data: sessionVolume, isLoading: isLoadingVolume } = useGetSessionVolumeQuery({ days: 7 });
  const { data: suggestionBreakdown, isLoading: isLoadingBreakdown } = useGetSuggestionBreakdownQuery({ period: "30d" });
  const { data: providerLeaderboard, isLoading: isLoadingLeaderboard } = useGetProviderLeaderboardQuery({ period: "30d", limit: 5 });

  const isLoading = isLoadingOverview || isLoadingVolume || isLoadingBreakdown || isLoadingLeaderboard;

  const statCards = overview ? buildStatCards(overview) : [];
  const volumeEntries = sessionVolume ?? [];
  const maxSessions = volumeEntries.length > 0 ? Math.max(...volumeEntries.map((entry) => entry.sessionCount)) : 1;
  const totalVolume = volumeEntries.reduce((sum, entry) => sum + entry.sessionCount, 0);
  const breakdownEntries = suggestionBreakdown ?? [];
  const leaderboardEntries = providerLeaderboard ?? [];

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

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => {
              const isPositiveTrend = card.trend >= 0;
              return (
                <div key={card.title} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-start justify-between">
                    <div className={clsxMerge("flex h-10 w-10 items-center justify-center rounded-lg", card.iconBg)}>
                      <card.icon className={clsxMerge("h-5 w-5", card.iconColor)} />
                    </div>
                    <div className={clsxMerge(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      isPositiveTrend
                        ? "bg-success-50 text-success-700"
                        : "bg-error-50 text-error-700"
                    )}>
                      {isPositiveTrend ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {isPositiveTrend ? "+" : ""}{card.trend}%
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-neutral-900">{card.value}</p>
                  <p className="mt-1 text-sm text-neutral-500">{card.title}</p>
                </div>
              );
            })}
          </div>

          {/* Session Volume + Suggestion Breakdown */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
            {/* Session Volume Bar Chart */}
            <div className="rounded-lg border border-neutral-200 bg-white shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-neutral-200 px-6 pb-3 pt-5">
                <BarChart3 className="h-5 w-5 text-primary-700" />
                <div>
                  <h2 className="font-semibold text-neutral-900">Session Volume</h2>
                  <p className="text-xs text-neutral-500">Last 7 days</p>
                </div>
              </div>
              <div className="p-5">
                {volumeEntries.length === 0 ? (
                  <p className="py-8 text-center text-sm text-neutral-500">No session data available</p>
                ) : (
                  <div className="flex items-end justify-between gap-2 sm:gap-4" style={{ height: "200px" }}>
                    {volumeEntries.map((entry) => {
                      const heightPercentage = maxSessions > 0 ? (entry.sessionCount / maxSessions) * 100 : 0;
                      return (
                        <div key={entry.date} className="flex flex-1 flex-col items-center gap-2">
                          <span className="text-xs font-medium text-neutral-700">{entry.sessionCount}</span>
                          <div className="w-full max-w-[48px]" style={{ height: "160px" }}>
                            <div className="flex h-full items-end">
                              <div
                                className="w-full rounded-t-md bg-primary-600 transition-all duration-300 hover:bg-primary-700"
                                style={{ height: `${heightPercentage}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-neutral-500">{formatDayLabel(entry.date)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {volumeEntries.length > 0 && (
                <div className="flex items-center justify-around border-t border-neutral-200 px-5 py-3 text-xs text-neutral-500">
                  <span>{totalVolume.toLocaleString()} total</span>
                  <div className="h-3 w-px bg-neutral-200" />
                  <span>{Math.round(totalVolume / (volumeEntries.length || 1))} avg/day</span>
                  <div className="h-3 w-px bg-neutral-200" />
                  <span>{maxSessions} peak ({formatDayLabel(volumeEntries.find((entry) => entry.sessionCount === maxSessions)?.date ?? "")})</span>
                </div>
              )}
            </div>

            {/* Suggestion Breakdown */}
            <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-neutral-200 px-6 pb-3 pt-5">
                <Sparkles className="h-5 w-5 text-accent-500" />
                <div>
                  <h2 className="font-semibold text-neutral-900">Suggestion Breakdown</h2>
                  <p className="text-xs text-neutral-500">By Clara suggestion type</p>
                </div>
              </div>
              <div className="space-y-4 p-5">
                {breakdownEntries.length === 0 ? (
                  <p className="py-4 text-center text-sm text-neutral-500">No suggestion data available</p>
                ) : (
                  breakdownEntries.map((entry) => (
                    <div key={entry.type}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium capitalize text-neutral-700">{entry.type.replace("_", " ")}</span>
                        <span className="text-sm font-semibold text-neutral-900">
                          {entry.count.toLocaleString()} &middot; {entry.percentage}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className={clsxMerge("h-full rounded-full transition-all duration-500", SUGGESTION_TYPE_COLORS[entry.type] ?? "bg-neutral-400")}
                          style={{ width: `${entry.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Provider Leaderboard */}
          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-neutral-200 px-5 pb-3 pt-5">
              <Users className="h-5 w-5 text-primary-700" />
              <div>
                <h2 className="font-semibold text-neutral-900">Top Providers by Clara Usage</h2>
                <p className="mt-0.5 text-xs text-neutral-500">Session volume and save rate</p>
              </div>
            </div>

            {leaderboardEntries.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-500">No provider data available</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                        <th className="px-5 py-3">#</th>
                        <th className="px-5 py-3">Provider</th>
                        <th className="px-5 py-3 text-right">Sessions</th>
                        <th className="px-5 py-3 text-right">Suggestions Saved</th>
                        <th className="px-5 py-3 text-right">Save Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {leaderboardEntries.map((provider, index) => {
                        const rank = index + 1;
                        return (
                          <tr key={provider.doctorId} className="transition-colors hover:bg-neutral-50">
                            <td className="px-5 py-3">
                              <span className={clsxMerge(
                                "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                                rank <= 3
                                  ? "bg-primary-100 text-primary-700"
                                  : "bg-neutral-100 text-neutral-600"
                              )}>
                                {rank}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className={clsxMerge("flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold", getAvatarColor(provider.doctorName))}>
                                  {getInitials(provider.doctorName)}
                                </div>
                                <span className="text-sm font-medium text-neutral-900">{provider.doctorName}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-medium text-neutral-900">{provider.sessionCount}</td>
                            <td className="px-5 py-3 text-right text-sm text-neutral-600">{provider.suggestionsSaved}</td>
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="divide-y divide-neutral-200 md:hidden">
                  {leaderboardEntries.map((provider, index) => {
                    const rank = index + 1;
                    return (
                      <div key={provider.doctorId} className="flex items-center gap-3 px-5 py-4">
                        <span className={clsxMerge(
                          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          rank <= 3
                            ? "bg-primary-100 text-primary-700"
                            : "bg-neutral-100 text-neutral-600"
                        )}>
                          {rank}
                        </span>
                        <div className={clsxMerge("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold", getAvatarColor(provider.doctorName))}>
                          {getInitials(provider.doctorName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-neutral-900">{provider.doctorName}</p>
                          <p className="text-xs text-neutral-500">{provider.suggestionsSaved} suggestions saved</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-medium text-neutral-900">{provider.sessionCount} sessions</p>
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
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
