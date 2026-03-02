import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQueryWithReauth } from "@/shared/auth/baseQueryWithReauth";
import type {
  SessionResponse,
  SessionSummary,
  StartSessionRequest,
  SuggestResponse,
  KnowledgeSearchRequest,
  KnowledgeSearchResponse,
} from "../types";
import type {
  AuditLogSearchParams,
  PagedAuditLogsResponse,
  AnalyticsOverview,
  SessionVolumeEntry,
  SuggestionBreakdownEntry,
  ProviderLeaderboardEntry,
  SystemHealthResponse,
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
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 25,
        },
      }),
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
  }),
});

export const {
  useGetSessionsQuery,
  useStartSessionMutation,
  useGetSessionQuery,
  useEndSessionMutation,
  useRequestSuggestionsMutation,
  useSearchKnowledgeMutation,
  useGetAuditLogsQuery,
  useGetAnalyticsOverviewQuery,
  useGetSessionVolumeQuery,
  useGetSuggestionBreakdownQuery,
  useGetProviderLeaderboardQuery,
  useGetSystemHealthQuery,
} = claraApi;
