import { useState } from "react";
import { BarChart3, Users, Clock, FileCheck } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  useGetAnalyticsOverviewQuery,
  useGetSessionVolumeQuery,
  useGetSuggestionBreakdownQuery,
  useGetProviderLeaderboardQuery,
  useGetPatientRegistrationTrendsQuery,
  useGetPatientDemographicsQuery,
  useGetAppointmentVolumeQuery,
  useGetAppointmentStatusDistributionQuery,
  useGetAppointmentTypeDistributionQuery,
  useGetAppointmentBusiestHoursQuery,
  useGetLoginActivityQuery,
  useGetUserStatsQuery,
} from "@/features/clara/store/claraApi";
import { getInitials, getAvatarColor } from "@/shared/utils/avatarUtils";
import {
  AreaChartCard,
  BarChartCard,
  PieChartCard,
  HeatmapCard,
  MetricCard,
  MetricCardSkeleton,
  ChartSkeleton,
  PieChartSkeleton,
  ErrorState,
} from "./charts";
import {
  PRIMARY_700,
  SECONDARY_700,
  ACCENT_500,
  SUCCESS_500,
  WARNING_500,
  ERROR_500,
  EXTENDED_STATUS_PALETTE,
  TYPE_PALETTE,
  GENDER_PALETTE,
  ROLE_PALETTE,
} from "@/shared/utils/chartColors";

/* ── Breadcrumb ── */

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/dashboard" },
  { label: "Admin", href: "/admin" },
  { label: "Reports" },
];

/* ── Helpers ── */

function formatMinutes(minutes: number): string {
  const wholeMinutes = Math.floor(minutes);
  const seconds = Math.round((minutes - wholeMinutes) * 60);
  return `${wholeMinutes}m ${seconds}s`;
}

function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDayLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

const PERIOD_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
] as const;

/* ── Period Selector ── */

function PeriodSelector({
  value,
  onChange,
}: {
  readonly value: number;
  readonly onChange: (days: number) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-0.5 shadow-sm">
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={clsxMerge(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-primary-700 text-white"
              : "text-neutral-600 hover:bg-neutral-50"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ── Clara AI Tab ── */

function ClaraAITab() {
  const {
    data: overview,
    isLoading: isLoadingOverview,
    isError: isOverviewError,
    refetch: refetchOverview,
  } = useGetAnalyticsOverviewQuery({ period: "30d" });
  const {
    data: sessionVolume,
    isLoading: isLoadingVolume,
    isError: isVolumeError,
    refetch: refetchVolume,
  } = useGetSessionVolumeQuery({ days: 7 });
  const {
    data: suggestionBreakdown,
    isLoading: isLoadingBreakdown,
    isError: isBreakdownError,
    refetch: refetchBreakdown,
  } = useGetSuggestionBreakdownQuery({ period: "30d" });
  const { data: providerLeaderboard } = useGetProviderLeaderboardQuery({ period: "30d", limit: 5 });

  const statCards = overview ? [
    { title: "Total Sessions", value: overview.totalSessions.toLocaleString(), trend: overview.sessionsTrend, icon: BarChart3, iconClassName: "bg-primary-50 text-primary-700" },
    { title: "AI Drafts Saved", value: overview.aiDraftsSaved.toLocaleString(), trend: overview.aiDraftsTrend, icon: FileCheck, iconClassName: "bg-success-50 text-success-600" },
    { title: "Active Providers", value: overview.activeProviders.toLocaleString(), trend: overview.activeProvidersTrend, icon: Users, iconClassName: "bg-secondary-50 text-secondary-700" },
    { title: "Avg Session Length", value: formatMinutes(overview.avgSessionMinutes), trend: overview.avgSessionTrend, icon: Clock, iconClassName: "bg-accent-50 text-accent-600" },
  ] : [];

  const volumeChartData = (sessionVolume ?? []) as unknown as Record<string, unknown>[];
  const leaderboardEntries = providerLeaderboard ?? [];

  const suggestionPieData = (suggestionBreakdown ?? []).map((entry) => ({
    name: entry.type.replace("_", " "),
    value: entry.count,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {isLoadingOverview ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <MetricCardSkeleton key={index} />
          ))}
        </div>
      ) : isOverviewError ? (
        <ErrorState
          title="Clara overview unavailable"
          message="Could not load Clara AI analytics."
          onRetry={refetchOverview}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <MetricCard
              key={card.title}
              title={card.title}
              value={card.value}
              trend={card.trend}
              trendLabel="vs prev period"
              icon={card.icon}
              iconClassName={card.iconClassName}
            />
          ))}
        </div>
      )}

      {/* Volume + Breakdown Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          {isLoadingVolume ? (
            <ChartSkeleton />
          ) : isVolumeError ? (
            <ErrorState
              title="Session volume unavailable"
              onRetry={refetchVolume}
            />
          ) : (
            <BarChartCard
              title="Session Volume"
              description="Last 7 days"
              data={volumeChartData}
              xAxisKey="date"
              series={[{ dataKey: "sessionCount", label: "Sessions", color: PRIMARY_700 }]}
              formatXAxis={formatDayLabel}
              showLegend={false}
            />
          )}
        </div>
        {isLoadingBreakdown ? (
          <PieChartSkeleton />
        ) : isBreakdownError ? (
          <ErrorState title="Suggestion data unavailable" compact onRetry={refetchBreakdown} />
        ) : (
          <PieChartCard
            title="Suggestion Breakdown"
            description="By Clara suggestion type"
            data={suggestionPieData}
            colors={[PRIMARY_700, SECONDARY_700, ACCENT_500, WARNING_500]}
            innerRadius={40}
          />
        )}
      </div>

      {/* Provider Leaderboard */}
      {leaderboardEntries.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-neutral-200 px-5 pb-3 pt-5">
            <Users className="h-5 w-5 text-primary-700" />
            <h2 className="font-semibold text-neutral-900">Top Providers by Clara Usage</h2>
          </div>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Provider</th>
                  <th className="px-5 py-3 text-right">Sessions</th>
                  <th className="px-5 py-3 text-right">Saved</th>
                  <th className="px-5 py-3 text-right">Save Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {leaderboardEntries.map((provider, index) => (
                  <tr key={provider.doctorId} className="transition-colors hover:bg-neutral-50">
                    <td className="px-5 py-3">
                      <span className={clsxMerge("inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold", index < 3 ? "bg-primary-100 text-primary-700" : "bg-neutral-100 text-neutral-600")}>
                        {index + 1}
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
                      <span className={clsxMerge("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", provider.saveRate >= 90 ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700")}>
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
            {leaderboardEntries.map((provider, index) => (
              <div key={provider.doctorId} className="flex items-center gap-3 px-5 py-4">
                <span className={clsxMerge("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold", index < 3 ? "bg-primary-100 text-primary-700" : "bg-neutral-100 text-neutral-600")}>
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{provider.doctorName}</p>
                  <p className="text-xs text-neutral-500">{provider.sessionCount} sessions &middot; {provider.saveRate}% saved</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Appointments Tab ── */

function AppointmentsTab() {
  const [days, setDays] = useState(30);
  const {
    data: volume,
    isLoading: isVolumeLoading,
    isError: isVolumeError,
    refetch: refetchVolume,
  } = useGetAppointmentVolumeQuery({ days });
  const {
    data: statusDistribution,
    isLoading: isStatusLoading,
    isError: isStatusError,
    refetch: refetchStatus,
  } = useGetAppointmentStatusDistributionQuery({ days });
  const {
    data: typeDistribution,
    isLoading: isTypeLoading,
    isError: isTypeError,
    refetch: refetchType,
  } = useGetAppointmentTypeDistributionQuery({ days });
  const {
    data: busiestHours,
    isLoading: isHoursLoading,
    isError: isHoursError,
    refetch: refetchHours,
  } = useGetAppointmentBusiestHoursQuery({ days });

  const statusPieData = (statusDistribution ?? []).map((entry) => ({ name: entry.status, value: entry.count }));
  const typePieData = (typeDistribution ?? []).map((entry) => ({ name: entry.type, value: entry.count }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <PeriodSelector value={days} onChange={setDays} />
      </div>

      {isVolumeLoading ? (
        <ChartSkeleton />
      ) : isVolumeError ? (
        <ErrorState
          title="Appointment volume unavailable"
          message="Could not load appointment data."
          onRetry={refetchVolume}
        />
      ) : (
        <BarChartCard
          title="Appointment Volume"
          description="Daily counts by status"
          data={(volume ?? []) as unknown as Record<string, unknown>[]}
          xAxisKey="date"
          series={[
            { dataKey: "completed", label: "Completed", color: SUCCESS_500, stackId: "a" },
            { dataKey: "confirmed", label: "Confirmed", color: SECONDARY_700, stackId: "a" },
            { dataKey: "scheduled", label: "Scheduled", color: PRIMARY_700, stackId: "a" },
            { dataKey: "cancelled", label: "Cancelled", color: ERROR_500, stackId: "a" },
            { dataKey: "noShow", label: "No Show", color: WARNING_500, stackId: "a" },
          ]}
          formatXAxis={formatShortDate}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {isStatusLoading ? (
          <PieChartSkeleton />
        ) : isStatusError ? (
          <ErrorState title="Status data unavailable" compact onRetry={refetchStatus} />
        ) : (
          <PieChartCard
            title="Status Distribution"
            data={statusPieData}
            colors={[...EXTENDED_STATUS_PALETTE]}
            innerRadius={40}
          />
        )}
        {isTypeLoading ? (
          <PieChartSkeleton />
        ) : isTypeError ? (
          <ErrorState title="Type data unavailable" compact onRetry={refetchType} />
        ) : (
          <PieChartCard
            title="Type Distribution"
            data={typePieData}
            colors={[...TYPE_PALETTE]}
            innerRadius={40}
          />
        )}
      </div>

      {isHoursLoading ? (
        <ChartSkeleton height={200} />
      ) : isHoursError ? (
        <ErrorState title="Busiest hours unavailable" compact onRetry={refetchHours} />
      ) : (
        <HeatmapCard
          title="Busiest Hours"
          description="Appointment count by hour of day"
          data={busiestHours ?? []}
        />
      )}
    </div>
  );
}

/* ── Patients Tab ── */

function PatientsTab() {
  const [days, setDays] = useState(30);
  const {
    data: trends,
    isLoading: isTrendsLoading,
    isError: isTrendsError,
    refetch: refetchTrends,
  } = useGetPatientRegistrationTrendsQuery({ days });
  const {
    data: demographics,
    isLoading: isDemographicsLoading,
    isError: isDemographicsError,
    refetch: refetchDemographics,
  } = useGetPatientDemographicsQuery();

  const genderPieData = (demographics?.genderDistribution ?? []).map((entry) => ({
    name: entry.label,
    value: entry.count,
  }));

  const ageBarData = (demographics?.ageBrackets ?? []) as unknown as Record<string, unknown>[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          {isDemographicsLoading ? (
            <div className="flex gap-4 animate-pulse">
              <div className="h-5 w-20 rounded bg-neutral-200" />
              <div className="h-5 w-16 rounded bg-neutral-200" />
              <div className="h-5 w-16 rounded bg-neutral-200" />
            </div>
          ) : demographics ? (
            <>
              <div className="text-sm">
                <span className="font-semibold text-neutral-900">{demographics.totalPatients.toLocaleString()}</span>
                <span className="ml-1 text-neutral-500">total</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-success-700">{demographics.activePatients.toLocaleString()}</span>
                <span className="ml-1 text-neutral-500">active</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-neutral-500">{demographics.inactivePatients.toLocaleString()}</span>
                <span className="ml-1 text-neutral-500">inactive</span>
              </div>
            </>
          ) : null}
        </div>
        <PeriodSelector value={days} onChange={setDays} />
      </div>

      {isTrendsLoading ? (
        <ChartSkeleton />
      ) : isTrendsError ? (
        <ErrorState
          title="Registration trends unavailable"
          message="Could not load patient registration data."
          onRetry={refetchTrends}
        />
      ) : (
        <AreaChartCard
          title="Registration Trend"
          description="New patient registrations"
          data={(trends ?? []) as unknown as Record<string, unknown>[]}
          xAxisKey="date"
          series={[{ dataKey: "count", label: "Registrations", color: PRIMARY_700 }]}
          formatXAxis={formatShortDate}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {isDemographicsLoading ? (
          <>
            <PieChartSkeleton />
            <ChartSkeleton />
          </>
        ) : isDemographicsError ? (
          <div className="lg:col-span-2">
            <ErrorState
              title="Demographics unavailable"
              message="Could not load patient demographics."
              onRetry={refetchDemographics}
            />
          </div>
        ) : (
          <>
            <PieChartCard
              title="Gender Distribution"
              data={genderPieData}
              colors={[...GENDER_PALETTE]}
              innerRadius={50}
            />
            <BarChartCard
              title="Age Brackets"
              data={ageBarData}
              xAxisKey="label"
              series={[{ dataKey: "count", label: "Patients", color: PRIMARY_700 }]}
              showLegend={false}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ── User Activity Tab ── */

function UserActivityTab() {
  const [days, setDays] = useState(30);
  const {
    data: loginActivity,
    isLoading: isLoginLoading,
    isError: isLoginError,
    refetch: refetchLogin,
  } = useGetLoginActivityQuery({ days });
  const {
    data: userStats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  } = useGetUserStatsQuery();

  const rolePieData = (userStats?.usersByRole ?? []).map((entry) => ({
    name: entry.role,
    value: entry.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          {isStatsLoading ? (
            <div className="flex gap-4 animate-pulse">
              <div className="h-5 w-28 rounded bg-neutral-200" />
              <div className="h-5 w-24 rounded bg-neutral-200" />
            </div>
          ) : userStats ? (
            <>
              <div className="text-sm">
                <span className="font-semibold text-neutral-900">{userStats.totalUsers.toLocaleString()}</span>
                <span className="ml-1 text-neutral-500">total users</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-success-700">{userStats.activeUsersLast30Days.toLocaleString()}</span>
                <span className="ml-1 text-neutral-500">active (30d)</span>
              </div>
            </>
          ) : null}
        </div>
        <PeriodSelector value={days} onChange={setDays} />
      </div>

      {isLoginLoading ? (
        <ChartSkeleton />
      ) : isLoginError ? (
        <ErrorState
          title="Login activity unavailable"
          message="Could not load login data."
          onRetry={refetchLogin}
        />
      ) : (
        <AreaChartCard
          title="Login Activity"
          description="Unique users who logged in per day"
          data={(loginActivity ?? []) as unknown as Record<string, unknown>[]}
          xAxisKey="date"
          series={[{ dataKey: "uniqueUsers", label: "Unique Users", color: PRIMARY_700 }]}
          formatXAxis={formatShortDate}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {isStatsLoading ? (
          <>
            <PieChartSkeleton />
            <ChartSkeleton />
          </>
        ) : isStatsError ? (
          <div className="lg:col-span-2">
            <ErrorState
              title="User statistics unavailable"
              message="Could not load user data."
              onRetry={refetchStats}
            />
          </div>
        ) : (
          <>
            <PieChartCard
              title="Users by Role"
              data={rolePieData}
              colors={[...ROLE_PALETTE]}
              innerRadius={50}
            />
            {userStats && (
              <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">User Statistics</h3>
                <div className="mt-4 space-y-3">
                  {userStats.usersByRole.map((entry) => (
                    <div key={entry.role} className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600">{entry.role}</span>
                      <span className="text-sm font-semibold text-neutral-900">{entry.count.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t border-neutral-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-700">Engagement Rate</span>
                      <span className="text-sm font-bold text-primary-700">
                        {userStats.totalUsers > 0
                          ? `${Math.round((userStats.activeUsersLast30Days / userStats.totalUsers) * 100)}%`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ── */

export function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
          <BarChart3 className="h-5 w-5 text-primary-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Reports & Analytics</h1>
          <p className="text-sm text-neutral-500">Business performance and usage metrics</p>
        </div>
      </div>

      {/* Tabbed Navigation */}
      <Tabs defaultValue="clara" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="clara">Clara AI</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="clara" className="mt-6">
          <ClaraAITab />
        </TabsContent>

        <TabsContent value="appointments" className="mt-6">
          <AppointmentsTab />
        </TabsContent>

        <TabsContent value="patients" className="mt-6">
          <PatientsTab />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserActivityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
