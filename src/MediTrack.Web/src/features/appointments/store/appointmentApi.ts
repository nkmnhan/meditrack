import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  AppointmentResponse,
  AppointmentListItem,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  RescheduleAppointmentRequest,
  CancelAppointmentRequest,
  CompleteAppointmentRequest,
  AddNotesRequest,
  SetTelehealthLinkRequest,
  AppointmentSearchParams,
  ConflictCheckParams,
  ProviderSummary,
  DashboardStatsResponse,
  DashboardStatsParams,
} from "../types";
import { createBaseQueryWithReauth } from "@/shared/auth/baseQueryWithReauth";

const APPOINTMENT_API_URL =
  import.meta.env.VITE_APPOINTMENT_API_URL || "https://localhost:5003";

export const appointmentApi = createApi({
  reducerPath: "appointmentApi",
  baseQuery: createBaseQueryWithReauth(`${APPOINTMENT_API_URL}/api`),
  tagTypes: ["Appointment", "Provider"],
  endpoints: (builder) => ({
    // --- Queries ---

    getAppointments: builder.query<AppointmentListItem[], AppointmentSearchParams>({
      query: (params) => ({
        url: "/appointments",
        params: {
          ...(params.patientId && { patientId: params.patientId }),
          ...(params.providerId && { providerId: params.providerId }),
          ...(params.fromDate && { fromDate: params.fromDate }),
          ...(params.toDate && { toDate: params.toDate }),
          ...(params.status && { status: params.status }),
          ...(params.type && { type: params.type }),
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Appointment" as const, id })),
              { type: "Appointment", id: "LIST" },
            ]
          : [{ type: "Appointment", id: "LIST" }],
    }),

    getAppointmentById: builder.query<AppointmentResponse, string>({
      query: (id) => `/appointments/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Appointment", id }],
    }),

    getAppointmentsByPatient: builder.query<AppointmentListItem[], string>({
      query: (patientId) => `/appointments/patient/${patientId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Appointment" as const, id })),
              { type: "Appointment", id: "LIST" },
            ]
          : [{ type: "Appointment", id: "LIST" }],
    }),

    getUpcomingByPatient: builder.query<AppointmentListItem[], string>({
      query: (patientId) => `/appointments/patient/${patientId}/upcoming`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Appointment" as const, id })),
              { type: "Appointment", id: "LIST" },
            ]
          : [{ type: "Appointment", id: "LIST" }],
    }),

    getAppointmentsByProvider: builder.query<AppointmentListItem[], string>({
      query: (providerId) => `/appointments/provider/${providerId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Appointment" as const, id })),
              { type: "Appointment", id: "LIST" },
            ]
          : [{ type: "Appointment", id: "LIST" }],
    }),

    checkConflicts: builder.query<{ hasConflict: boolean }, ConflictCheckParams>({
      query: (params) => ({
        url: "/appointments/conflicts",
        params: {
          providerId: params.providerId,
          startTime: params.startTime,
          endTime: params.endTime,
          ...(params.excludeAppointmentId && {
            excludeAppointmentId: params.excludeAppointmentId,
          }),
        },
      }),
    }),

    getDistinctProviders: builder.query<ProviderSummary[], void>({
      query: () => "/appointments/providers",
      providesTags: [{ type: "Provider", id: "LIST" }],
    }),

    getDashboardStats: builder.query<DashboardStatsResponse, DashboardStatsParams>({
      query: (params) => ({
        url: "/appointments/dashboard-stats",
        params: {
          ...(params.providerId && { providerId: params.providerId }),
          ...(params.date && { date: params.date }),
        },
      }),
    }),

    // --- Mutations ---

    createAppointment: builder.mutation<AppointmentResponse, CreateAppointmentRequest>({
      query: (body) => ({
        url: "/appointments",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Appointment", id: "LIST" }],
    }),

    updateAppointment: builder.mutation<
      AppointmentResponse,
      { id: string; data: UpdateAppointmentRequest }
    >({
      query: ({ id, data }) => ({
        url: `/appointments/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
      ],
    }),

    rescheduleAppointment: builder.mutation<
      AppointmentResponse,
      { id: string; data: RescheduleAppointmentRequest }
    >({
      query: ({ id, data }) => ({
        url: `/appointments/${id}/reschedule`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
      ],
    }),

    confirmAppointment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/appointments/${id}/confirm`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
      ],
    }),

    checkInAppointment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/appointments/${id}/check-in`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
      ],
    }),

    startAppointment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/appointments/${id}/start`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
      ],
    }),

    completeAppointment: builder.mutation<void, { id: string; data: CompleteAppointmentRequest }>({
      query: ({ id, data }) => ({
        url: `/appointments/${id}/complete`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
      ],
    }),

    cancelAppointment: builder.mutation<void, { id: string; data: CancelAppointmentRequest }>({
      query: ({ id, data }) => ({
        url: `/appointments/${id}/cancel`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
      ],
    }),

    markNoShow: builder.mutation<void, string>({
      query: (id) => ({
        url: `/appointments/${id}/no-show`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
      ],
    }),

    setTelehealthLink: builder.mutation<
      void,
      { id: string; data: SetTelehealthLinkRequest }
    >({
      query: ({ id, data }) => ({
        url: `/appointments/${id}/telehealth-link`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Appointment", id },
      ],
    }),

    addNotes: builder.mutation<void, { id: string; data: AddNotesRequest }>({
      query: ({ id, data }) => ({
        url: `/appointments/${id}/notes`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Appointment", id },
      ],
    }),
  }),
});

export const {
  useGetAppointmentsQuery,
  useGetAppointmentByIdQuery,
  useGetAppointmentsByPatientQuery,
  useGetUpcomingByPatientQuery,
  useGetAppointmentsByProviderQuery,
  useLazyCheckConflictsQuery,
  useGetDistinctProvidersQuery,
  useGetDashboardStatsQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useRescheduleAppointmentMutation,
  useConfirmAppointmentMutation,
  useCheckInAppointmentMutation,
  useStartAppointmentMutation,
  useCompleteAppointmentMutation,
  useCancelAppointmentMutation,
  useMarkNoShowMutation,
  useSetTelehealthLinkMutation,
  useAddNotesMutation,
} = appointmentApi;
