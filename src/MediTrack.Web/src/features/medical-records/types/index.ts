/**
 * Medical Records Feature Types
 * 
 * TypeScript types matching backend DTOs from MedicalRecords.API
 */

// ============================================================================
// Enums
// ============================================================================

export enum DiagnosisSeverity {
  Mild = "Mild",
  Moderate = "Moderate",
  Severe = "Severe",
  Critical = "Critical",
}

export enum RecordStatus {
  Active = "Active",
  RequiresFollowUp = "RequiresFollowUp",
  Resolved = "Resolved",
  Archived = "Archived",
}

export enum PrescriptionStatus {
  Active = "Active",
  Filled = "Filled",
  Completed = "Completed",
  Cancelled = "Cancelled",
  Expired = "Expired",
}

export const ClinicalNoteTypes = {
  ProgressNote: "Progress Note",
  SoapNote: "SOAP Note",
  Assessment: "Assessment",
  Plan: "Plan",
  ProcedureNote: "Procedure Note",
  ConsultationNote: "Consultation Note",
  DischargeSummary: "Discharge Summary",
} as const;

export type ClinicalNoteType = typeof ClinicalNoteTypes[keyof typeof ClinicalNoteTypes];

// ============================================================================
// Request DTOs
// ============================================================================

export interface CreateMedicalRecordRequest {
  readonly patientId: string;
  readonly chiefComplaint: string;
  readonly diagnosisCode: string;
  readonly diagnosisDescription: string;
  readonly severity: DiagnosisSeverity;
  readonly recordedByDoctorId: string;
  readonly recordedByDoctorName: string;
  readonly appointmentId?: string;
}

export interface UpdateDiagnosisRequest {
  readonly diagnosisCode: string;
  readonly diagnosisDescription: string;
  readonly severity: DiagnosisSeverity;
}

export interface AddClinicalNoteRequest {
  readonly noteType: ClinicalNoteType;
  readonly content: string;
  readonly authorId: string;
  readonly authorName: string;
}

export interface AddPrescriptionRequest {
  readonly medicationName: string;
  readonly dosage: string;
  readonly frequency: string;
  readonly durationDays: number;
  readonly instructions?: string;
  readonly prescribedById: string;
  readonly prescribedByName: string;
}

export interface RecordVitalSignsRequest {
  readonly bloodPressureSystolic?: number;
  readonly bloodPressureDiastolic?: number;
  readonly heartRate?: number;
  readonly temperature?: number;
  readonly respiratoryRate?: number;
  readonly oxygenSaturation?: number;
  readonly weight?: number;
  readonly height?: number;
  readonly recordedById: string;
  readonly recordedByName: string;
}

export interface AddAttachmentRequest {
  readonly fileName: string;
  readonly contentType: string;
  readonly fileSizeBytes: number;
  readonly storageUrl: string;
  readonly description?: string;
  readonly uploadedById: string;
  readonly uploadedByName: string;
}

// ============================================================================
// Response DTOs
// ============================================================================

export interface ClinicalNoteResponse {
  readonly id: string;
  readonly noteType: ClinicalNoteType;
  readonly content: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly createdAt: string;
  readonly updatedAt?: string;
}

export interface PrescriptionResponse {
  readonly id: string;
  readonly medicationName: string;
  readonly dosage: string;
  readonly frequency: string;
  readonly durationDays: number;
  readonly instructions?: string;
  readonly status: PrescriptionStatus;
  readonly prescribedById: string;
  readonly prescribedByName: string;
  readonly prescribedAt: string;
  readonly filledAt?: string;
  readonly expiresAt: string;
}

export interface VitalSignsResponse {
  readonly id: string;
  readonly bloodPressureSystolic?: number;
  readonly bloodPressureDiastolic?: number;
  readonly bloodPressureFormatted?: string;
  readonly heartRate?: number;
  readonly temperature?: number;
  readonly respiratoryRate?: number;
  readonly oxygenSaturation?: number;
  readonly weight?: number;
  readonly height?: number;
  readonly bmi?: number;
  readonly recordedById: string;
  readonly recordedByName: string;
  readonly recordedAt: string;
}

export interface AttachmentResponse {
  readonly id: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly fileSizeBytes: number;
  readonly fileSizeFormatted: string;
  readonly storageUrl: string;
  readonly description?: string;
  readonly uploadedById: string;
  readonly uploadedByName: string;
  readonly uploadedAt: string;
}

export interface MedicalRecordResponse {
  readonly id: string;
  readonly patientId: string;
  readonly chiefComplaint: string;
  readonly diagnosisCode: string;
  readonly diagnosisDescription: string;
  readonly severity: DiagnosisSeverity;
  readonly status: RecordStatus;
  readonly recordedByDoctorId: string;
  readonly recordedByDoctorName: string;
  readonly appointmentId?: string;
  readonly recordedAt: string;
  readonly updatedAt: string;
  readonly clinicalNotes: ClinicalNoteResponse[];
  readonly prescriptions: PrescriptionResponse[];
  readonly vitalSigns: VitalSignsResponse[];
  readonly attachments: AttachmentResponse[];
}

export interface MedicalRecordListItem {
  readonly id: string;
  readonly patientId: string;
  readonly chiefComplaint: string;
  readonly diagnosisCode: string;
  readonly diagnosisDescription: string;
  readonly severity: DiagnosisSeverity;
  readonly status: RecordStatus;
  readonly recordedByDoctorName: string;
  readonly recordedAt: string;
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface MedicalRecordSearchParams {
  readonly patientId?: string;
  readonly status?: RecordStatus;
  readonly severity?: DiagnosisSeverity;
  readonly fromDate?: string;
  readonly toDate?: string;
}

export interface MedicalRecordStatsResponse {
  readonly pendingCount: number;
  readonly urgentCount: number;
}

export interface MedicalRecordStatsParams {
  readonly providerId?: string;
}
