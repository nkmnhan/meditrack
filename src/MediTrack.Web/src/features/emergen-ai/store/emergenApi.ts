import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQueryWithReauth } from "@/shared/auth/baseQueryWithReauth";
import type {
  SessionResponse,
  StartSessionRequest,
  SuggestResponse,
  KnowledgeSearchRequest,
  KnowledgeSearchResponse,
} from "../types";

import { EMERGEN_API_URL } from "../config";

export const emergenApi = createApi({
  reducerPath: "emergenApi",
  baseQuery: createBaseQueryWithReauth(EMERGEN_API_URL),
  tagTypes: ["Session"],
  endpoints: (builder) => ({
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
  }),
});

export const {
  useStartSessionMutation,
  useGetSessionQuery,
  useEndSessionMutation,
  useRequestSuggestionsMutation,
  useSearchKnowledgeMutation,
} = emergenApi;
