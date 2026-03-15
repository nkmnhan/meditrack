import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  MedicalRecordResponse,
  MedicalRecordListItem,
  CreateMedicalRecordRequest,
  UpdateDiagnosisRequest,
  AddClinicalNoteRequest,
  AddPrescriptionRequest,
  RecordVitalSignsRequest,
  AddAttachmentRequest,
  MedicalRecordStatsResponse,
  MedicalRecordStatsParams,
} from "../types";
import { createBaseQueryWithReauth } from "@/shared/auth/baseQueryWithReauth";

const MEDICAL_RECORDS_API_URL =
  import.meta.env.VITE_MEDICALRECORDS_API_URL || "https://localhost:5004";

export const medicalRecordsApi = createApi({
  reducerPath: "medicalRecordsApi",
  baseQuery: createBaseQueryWithReauth(`${MEDICAL_RECORDS_API_URL}/api`),
  tagTypes: ["MedicalRecord"],
  endpoints: (builder) => ({
    // --- Queries ---

    getMedicalRecordById: builder.query<MedicalRecordResponse, string>({
      query: (id) => `/medical-records/${id}`,
      providesTags: (_result, _error, id) => [{ type: "MedicalRecord", id }],
    }),

    getMedicalRecordsByPatientId: builder.query<MedicalRecordListItem[], string>({
      query: (patientId) => `/medical-records/patient/${patientId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "MedicalRecord" as const, id })),
              { type: "MedicalRecord", id: "LIST" },
            ]
          : [{ type: "MedicalRecord", id: "LIST" }],
    }),

    getMedicalRecordsByDiagnosisCode: builder.query<MedicalRecordListItem[], string>({
      query: (diagnosisCode) => `/medical-records/diagnosis/${diagnosisCode}`,
      providesTags: [{ type: "MedicalRecord", id: "LIST" }],
    }),

    getMedicalRecordStats: builder.query<MedicalRecordStatsResponse, MedicalRecordStatsParams>({
      query: (params) => ({
        url: "/medical-records/stats",
        params: {
          ...(params.providerId && { providerId: params.providerId }),
        },
      }),
    }),

    // --- Mutations - Medical Record ---

    createMedicalRecord: builder.mutation<MedicalRecordResponse, CreateMedicalRecordRequest>({
      query: (body) => ({
        url: "/medical-records",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "MedicalRecord", id: "LIST" }],
    }),

    updateDiagnosis: builder.mutation<
      MedicalRecordResponse,
      { id: string; body: UpdateDiagnosisRequest }
    >({
      query: ({ id, body }) => ({
        url: `/medical-records/${id}/diagnosis`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "MedicalRecord", id },
        { type: "MedicalRecord", id: "LIST" },
      ],
    }),

    resolveMedicalRecord: builder.mutation<void, string>({
      query: (id) => ({
        url: `/medical-records/${id}/resolve`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "MedicalRecord", id },
        { type: "MedicalRecord", id: "LIST" },
      ],
    }),

    markRequiresFollowUp: builder.mutation<void, string>({
      query: (id) => ({
        url: `/medical-records/${id}/follow-up`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "MedicalRecord", id },
        { type: "MedicalRecord", id: "LIST" },
      ],
    }),

    archiveMedicalRecord: builder.mutation<void, string>({
      query: (id) => ({
        url: `/medical-records/${id}/archive`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "MedicalRecord", id },
        { type: "MedicalRecord", id: "LIST" },
      ],
    }),

    // --- Mutations - Clinical Notes ---

    addClinicalNote: builder.mutation<
      MedicalRecordResponse,
      { id: string; body: AddClinicalNoteRequest }
    >({
      query: ({ id, body }) => ({
        url: `/medical-records/${id}/notes`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "MedicalRecord", id }],
    }),

    // --- Mutations - Prescriptions ---

    addPrescription: builder.mutation<
      MedicalRecordResponse,
      { id: string; body: AddPrescriptionRequest }
    >({
      query: ({ id, body }) => ({
        url: `/medical-records/${id}/prescriptions`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "MedicalRecord", id }],
    }),

    // --- Mutations - Vital Signs ---

    recordVitalSigns: builder.mutation<
      MedicalRecordResponse,
      { id: string; body: RecordVitalSignsRequest }
    >({
      query: ({ id, body }) => ({
        url: `/medical-records/${id}/vitals`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "MedicalRecord", id }],
    }),

    // --- Mutations - Attachments ---

    addAttachment: builder.mutation<
      MedicalRecordResponse,
      { id: string; body: AddAttachmentRequest }
    >({
      query: ({ id, body }) => ({
        url: `/medical-records/${id}/attachments`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "MedicalRecord", id }],
    }),
  }),
});

export const {
  useGetMedicalRecordByIdQuery,
  useGetMedicalRecordsByPatientIdQuery,
  useGetMedicalRecordsByDiagnosisCodeQuery,
  useCreateMedicalRecordMutation,
  useUpdateDiagnosisMutation,
  useResolveMedicalRecordMutation,
  useMarkRequiresFollowUpMutation,
  useArchiveMedicalRecordMutation,
  useAddClinicalNoteMutation,
  useAddPrescriptionMutation,
  useRecordVitalSignsMutation,
  useAddAttachmentMutation,
  useGetMedicalRecordStatsQuery,
} = medicalRecordsApi;
