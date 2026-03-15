import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQueryWithReauth } from "@/shared/auth/baseQueryWithReauth";
import type {
  SessionResponse,
  SessionSummary,
  StartSessionRequest,
  SuggestResponse,
  KnowledgeSearchRequest,
  KnowledgeSearchResponse,
  GetSessionsParams,
} from "../types";
import type {
  AuditLogSearchParams,
  PagedAuditLogsResponse,
  PagedArchivedAuditLogsResponse,
  AuditStatsResponse,
  AnalyticsOverview,
  SessionVolumeEntry,
  SuggestionBreakdownEntry,
  ProviderLeaderboardEntry,
  SystemHealthResponse,
  DashboardOverview,
  InfrastructureMetrics,
  TimeSeriesResponse,
  RegistrationTrendEntry,
  PatientDemographics,
  AppointmentVolumeEntry,
  StatusDistributionEntry,
  TypeDistributionEntry,
  BusiestHourEntry,
  LoginActivityEntry,
  UserStats,
} from "@/features/admin/types";

import { CLARA_API_URL } from "../config";

export const claraApi = createApi({
  reducerPath: "claraApi",
  baseQuery: createBaseQueryWithReauth(CLARA_API_URL),
  tagTypes: ["Session", "AuditLog"],
  endpoints: (builder) => ({
    /**
     * List recent sessions for the current doctor
     */
    getSessions: builder.query<SessionSummary[], void>({
      query: () => "/api/sessions",
      providesTags: ["Session"],
    }),

    /**
     * Start a new session for the current doctor
     */
    startSession: builder.mutation<SessionResponse, StartSessionRequest>({
      query: (body) => ({
        url: "/api/sessions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Session"],
    }),

    /**
     * Get session by ID
     */
    getSession: builder.query<SessionResponse, string>({
      query: (sessionId) => `/api/sessions/${sessionId}`,
      providesTags: (_result, _error, sessionId) => [
        { type: "Session", id: sessionId },
      ],
    }),

    /**
     * End the current session
     */
    endSession: builder.mutation<SessionResponse, string>({
      query: (sessionId) => ({
        url: `/api/sessions/${sessionId}/end`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, sessionId) => [
        { type: "Session", id: sessionId },
      ],
    }),

    /**
     * Request suggestions for the current session
     */
    requestSuggestions: builder.mutation<SuggestResponse, string>({
      query: (sessionId) => ({
        url: `/api/sessions/${sessionId}/suggest`,
        method: "POST",
      }),
    }),

    /**
     * List sessions for a specific patient
     */
    getSessionsByPatient: builder.query<SessionSummary[], GetSessionsParams>({
      query: (params) => ({
        url: "/api/sessions",
        params: { patientId: params.patientId },
      }),
      providesTags: ["Session"],
    }),

    /**
     * Search knowledge base for relevant clinical information
     */
    searchKnowledge: builder.mutation<
      KnowledgeSearchResponse,
      KnowledgeSearchRequest
    >({
      query: (body) => ({
        url: "/api/knowledge/search",
        method: "POST",
        body,
      }),
    }),

    // --- Admin: Audit Logs ---

    getAuditLogs: builder.query<PagedAuditLogsResponse, AuditLogSearchParams>({
      query: (params) => ({
        url: "/api/audit/logs",
        params: {
          ...(params.action && { action: params.action }),
          ...(params.user && { user: params.user }),
          ...(params.search && { search: params.search }),
          ...(params.severity && { severity: params.severity }),
          ...(params.dateFrom && { dateFrom: params.dateFrom }),
          ...(params.dateTo && { dateTo: params.dateTo }),
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 25,
        },
      }),
      providesTags: ["AuditLog"],
    }),

    getArchivedAuditLogs: builder.query<PagedArchivedAuditLogsResponse, AuditLogSearchParams>({
      query: (params) => ({
        url: "/api/audit/archived",
        params: {
          ...(params.action && { action: params.action }),
          ...(params.user && { user: params.user }),
          ...(params.search && { search: params.search }),
          ...(params.severity && { severity: params.severity }),
          ...(params.dateFrom && { dateFrom: params.dateFrom }),
          ...(params.dateTo && { dateTo: params.dateTo }),
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 25,
        },
      }),
      providesTags: ["AuditLog"],
    }),

    getAuditStats: builder.query<AuditStatsResponse, void>({
      query: () => "/api/audit/stats",
      providesTags: ["AuditLog"],
    }),

    // --- Admin: Analytics ---

    getAnalyticsOverview: builder.query<AnalyticsOverview, { period?: string }>({
      query: (params) => ({
        url: "/api/analytics/overview",
        params: { period: params.period ?? "30d" },
      }),
    }),

    getSessionVolume: builder.query<SessionVolumeEntry[], { days?: number }>({
      query: (params) => ({
        url: "/api/analytics/session-volume",
        params: { days: params.days ?? 7 },
      }),
    }),

    getSuggestionBreakdown: builder.query<SuggestionBreakdownEntry[], { period?: string }>({
      query: (params) => ({
        url: "/api/analytics/suggestion-breakdown",
        params: { period: params.period ?? "30d" },
      }),
    }),

    getProviderLeaderboard: builder.query<ProviderLeaderboardEntry[], { period?: string; limit?: number }>({
      query: (params) => ({
        url: "/api/analytics/provider-leaderboard",
        params: {
          period: params.period ?? "30d",
          limit: params.limit ?? 5,
        },
      }),
    }),

    // --- Admin: System Health ---

    getSystemHealth: builder.query<SystemHealthResponse, void>({
      query: () => "/api/system/health",
    }),

    // --- Admin: Dashboard ---

    getDashboardOverview: builder.query<DashboardOverview, void>({
      query: () => "/api/dashboard/overview",
    }),

    // --- Admin: Infrastructure Monitoring ---

    getInfrastructureMetrics: builder.query<InfrastructureMetrics, void>({
      query: () => "/api/infrastructure/metrics",
    }),

    getMetricsTimeseries: builder.query<TimeSeriesResponse, { metric: string; range: string }>({
      query: (params) => ({
        url: "/api/infrastructure/timeseries",
        params,
      }),
    }),

    // --- Admin: Patient Analytics (proxied via Clara.API) ---

    getPatientRegistrationTrends: builder.query<RegistrationTrendEntry[], { days?: number }>({
      query: (params) => ({
        url: "/api/admin/patient/registration-trends",
        params: { days: params.days ?? 30 },
      }),
    }),

    getPatientDemographics: builder.query<PatientDemographics, void>({
      query: () => "/api/admin/patient/demographics",
    }),

    // --- Admin: Appointment Analytics (proxied via Clara.API) ---

    getAppointmentVolume: builder.query<AppointmentVolumeEntry[], { days?: number }>({
      query: (params) => ({
        url: "/api/admin/appointment/volume",
        params: { days: params.days ?? 30 },
      }),
    }),

    getAppointmentStatusDistribution: builder.query<StatusDistributionEntry[], { days?: number }>({
      query: (params) => ({
        url: "/api/admin/appointment/status-distribution",
        params: { days: params.days ?? 30 },
      }),
    }),

    getAppointmentTypeDistribution: builder.query<TypeDistributionEntry[], { days?: number }>({
      query: (params) => ({
        url: "/api/admin/appointment/type-distribution",
        params: { days: params.days ?? 30 },
      }),
    }),

    getAppointmentBusiestHours: builder.query<BusiestHourEntry[], { days?: number }>({
      query: (params) => ({
        url: "/api/admin/appointment/busiest-hours",
        params: { days: params.days ?? 30 },
      }),
    }),

    // --- Admin: Identity Analytics (proxied via Clara.API) ---

    getLoginActivity: builder.query<LoginActivityEntry[], { days?: number }>({
      query: (params) => ({
        url: "/api/admin/identity/login-activity",
        params: { days: params.days ?? 30 },
      }),
    }),

    getUserStats: builder.query<UserStats, void>({
      query: () => "/api/admin/identity/user-stats",
    }),
  }),
});

export const {
  useGetSessionsQuery,
  useGetSessionsByPatientQuery,
  useStartSessionMutation,
  useGetSessionQuery,
  useEndSessionMutation,
  useRequestSuggestionsMutation,
  useSearchKnowledgeMutation,
  useGetAuditLogsQuery,
  useGetArchivedAuditLogsQuery,
  useGetAuditStatsQuery,
  useGetAnalyticsOverviewQuery,
  useGetSessionVolumeQuery,
  useGetSuggestionBreakdownQuery,
  useGetProviderLeaderboardQuery,
  useGetSystemHealthQuery,
  useGetDashboardOverviewQuery,
  useGetInfrastructureMetricsQuery,
  useGetMetricsTimeseriesQuery,
  useGetPatientRegistrationTrendsQuery,
  useGetPatientDemographicsQuery,
  useGetAppointmentVolumeQuery,
  useGetAppointmentStatusDistributionQuery,
  useGetAppointmentTypeDistributionQuery,
  useGetAppointmentBusiestHoursQuery,
  useGetLoginActivityQuery,
  useGetUserStatsQuery,
} = claraApi;
