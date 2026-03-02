// Appointment API response types matching backend DTOs

export type AppointmentStatus =
  | "Scheduled"
  | "Confirmed"
  | "CheckedIn"
  | "InProgress"
  | "Completed"
  | "Cancelled"
  | "NoShow"
  | "Rescheduled";

export type AppointmentType =
  | "Consultation"
  | "FollowUp"
  | "AnnualPhysical"
  | "UrgentCare"
  | "Specialist"
  | "LabWork"
  | "Imaging"
  | "Vaccination"
  | "Telehealth"
  | "Procedure";

/** Numeric values matching the backend enum (used in POST/PUT requests) */
export const AppointmentTypeValue: Record<AppointmentType, number> = {
  Consultation: 0,
  FollowUp: 1,
  AnnualPhysical: 2,
  UrgentCare: 3,
  Specialist: 4,
  LabWork: 5,
  Imaging: 6,
  Vaccination: 7,
  Telehealth: 8,
  Procedure: 9,
};

export interface AppointmentResponse {
  readonly id: string;
  readonly patientId: string;
  readonly patientName: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly scheduledDateTime: string;
  readonly scheduledEndDateTime: string;
  readonly durationMinutes: number;
  readonly status: AppointmentStatus;
  readonly type: AppointmentType;
  readonly reason: string;
  readonly patientNotes: string | null;
  readonly internalNotes: string | null;
  readonly location: string | null;
  readonly telehealthLink: string | null;
  readonly cancellationReason: string | null;
  readonly cancelledAt: string | null;
  readonly rescheduledFromId: string | null;
  readonly canBeModified: boolean;
  readonly canBeCancelled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AppointmentListItem {
  readonly id: string;
  readonly patientId: string;
  readonly patientName: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly scheduledDateTime: string;
  readonly durationMinutes: number;
  readonly status: AppointmentStatus;
  readonly type: AppointmentType;
  readonly reason: string;
  readonly location: string | null;
}

export interface CreateAppointmentRequest {
  readonly patientId: string;
  readonly patientName: string;
  readonly patientEmail: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly scheduledDateTime: string;
  readonly durationMinutes: number;
  readonly type: number;
  readonly reason: string;
  readonly patientNotes?: string;
  readonly location?: string;
}

export interface UpdateAppointmentRequest {
  readonly scheduledDateTime?: string;
  readonly durationMinutes?: number;
  readonly type?: number;
  readonly reason?: string;
  readonly patientNotes?: string;
  readonly location?: string;
}

export interface RescheduleAppointmentRequest {
  readonly newDateTime: string;
  readonly newLocation?: string;
}

export interface CancelAppointmentRequest {
  readonly reason: string;
}

export interface CompleteAppointmentRequest {
  readonly notes?: string;
}

export interface AddNotesRequest {
  readonly notes: string;
}

export interface SetTelehealthLinkRequest {
  readonly link: string;
}

export interface ProviderSummary {
  readonly providerId: string;
  readonly providerName: string;
}

export interface AppointmentSearchParams {
  readonly patientId?: string;
  readonly providerId?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly status?: AppointmentStatus;
  readonly type?: AppointmentType;
}

export interface ConflictCheckParams {
  readonly providerId: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly excludeAppointmentId?: string;
}

export interface DashboardStatsResponse {
  readonly todayAppointmentCount: number;
  readonly patientsSeen: number;
  readonly appointmentCountsByDay: number[];
}

export interface DashboardStatsParams {
  readonly providerId?: string;
  readonly date?: string;
}
