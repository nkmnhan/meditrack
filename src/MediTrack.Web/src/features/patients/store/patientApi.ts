import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  Patient,
  PatientListItem,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientSearchParams,
} from "../types";
import { getOidcAccessToken } from "@/shared/auth/getOidcAccessToken";

// Base URL from environment variable
const PATIENT_API_URL = import.meta.env.VITE_PATIENT_API_URL || "https://localhost:5002";

export const patientApi = createApi({
  reducerPath: "patientApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${PATIENT_API_URL}/api`,
    prepareHeaders: (headers) => {
      // Get token from centralized auth utility
      // Note: RTK Query uses fetch, not the axios instance, so we can't reuse
      // the axios interceptor directly. This utility centralizes the storage key logic.
      const token = getOidcAccessToken();
      
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      
      return headers;
    },
  }),
  tagTypes: ["Patient"],
  endpoints: (builder) => ({
    // Get all patients
    getPatients: builder.query<PatientListItem[], { includeInactive?: boolean }>({
      query: ({ includeInactive = false }) => ({
        url: "/patients",
        params: { includeInactive },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Patient" as const, id })),
              { type: "Patient", id: "LIST" },
            ]
          : [{ type: "Patient", id: "LIST" }],
    }),

    // Search patients
    searchPatients: builder.query<PatientListItem[], PatientSearchParams>({
      query: ({ searchTerm }) => ({
        url: "/patients/search",
        params: { searchTerm },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Patient" as const, id })),
              { type: "Patient", id: "LIST" },
            ]
          : [{ type: "Patient", id: "LIST" }],
    }),

    // Get patient by ID
    getPatientById: builder.query<Patient, string>({
      query: (id) => `/patients/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Patient", id }],
    }),

    // Create patient
    createPatient: builder.mutation<Patient, CreatePatientRequest>({
      query: (newPatient) => ({
        url: "/patients",
        method: "POST",
        body: newPatient,
      }),
      invalidatesTags: [{ type: "Patient", id: "LIST" }],
    }),

    // Update patient
    updatePatient: builder.mutation<Patient, { id: string; data: UpdatePatientRequest }>({
      query: ({ id, data }) => ({
        url: `/patients/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Patient", id },
        { type: "Patient", id: "LIST" },
      ],
    }),

    // Deactivate patient (soft delete)
    deactivatePatient: builder.mutation<void, string>({
      query: (id) => ({
        url: `/patients/${id}/deactivate`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Patient", id },
        { type: "Patient", id: "LIST" },
      ],
    }),

    // Activate patient
    activatePatient: builder.mutation<void, string>({
      query: (id) => ({
        url: `/patients/${id}/activate`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Patient", id },
        { type: "Patient", id: "LIST" },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetPatientsQuery,
  useSearchPatientsQuery,
  useLazySearchPatientsQuery,
  useGetPatientByIdQuery,
  useCreatePatientMutation,
  useUpdatePatientMutation,
  useDeactivatePatientMutation,
  useActivatePatientMutation,
} = patientApi;
