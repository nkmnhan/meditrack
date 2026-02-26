import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { X, Loader2, Save, AlertTriangle, Search } from "lucide-react";
import { useAuth } from "react-oidc-context";

/** Convert local date + time strings to a UTC ISO string for the API.
 *  The user picks a local time (e.g. 2:30 PM EST) and we must send UTC to the backend. */
function localDateTimeToUtcIso(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return localDate.toISOString();
}
import {
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useLazyCheckConflictsQuery,
  useGetAppointmentByIdQuery,
} from "../store/appointmentApi";
import { useLazySearchPatientsQuery } from "@/features/patients/store/patientApi";
import { AppointmentTypeValue } from "../types";
import type { AppointmentType } from "../types";
import { TYPE_OPTIONS, DURATION_OPTIONS } from "../constants";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useRoles } from "@/shared/auth/useRoles";
import { UserRole } from "@/shared/auth/roles";

// --- Validation ---

const appointmentFormSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  patientName: z.string().min(1, "Patient name is required"),
  patientEmail: z.string().email("Valid email is required"),
  providerId: z.string().min(1, "Provider ID is required"),
  providerName: z.string().min(1, "Provider name is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  durationMinutes: z.number().min(15, "Duration must be at least 15 minutes"),
  type: z.string().min(1, "Appointment type is required"),
  reason: z.string().min(1, "Reason is required").max(500),
  patientNotes: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

// --- Sub-components ---

interface FormFieldProps {
  readonly label: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}

function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-error-600"> *</span>}
      </label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
    </div>
  );
}

// --- Main Component ---

interface AppointmentFormProps {
  readonly onClose: () => void;
  readonly editAppointmentId?: string;
  readonly defaultDate?: Date;
}

export function AppointmentForm({
  onClose,
  editAppointmentId,
  defaultDate,
}: AppointmentFormProps) {
  const auth = useAuth();
  const { hasRole } = useRoles();
  const isDoctor = hasRole(UserRole.Doctor);
  const isEditMode = Boolean(editAppointmentId);

  // Patient search state
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [searchPatients, { data: patientResults, isFetching: isSearchingPatients }] =
    useLazySearchPatientsQuery();

  // Conflict check
  const [checkConflicts, { data: conflicts }] = useLazyCheckConflictsQuery();

  // Mutations
  const [createAppointment, { isLoading: isCreating }] = useCreateAppointmentMutation();
  const [updateAppointment, { isLoading: isUpdating }] = useUpdateAppointmentMutation();

  // Load existing appointment for edit
  const { data: existingAppointment } = useGetAppointmentByIdQuery(editAppointmentId!, {
    skip: !isEditMode,
  });

  // Build default time from the clicked slot
  const defaultDateStr = defaultDate
    ? `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, "0")}-${String(defaultDate.getDate()).padStart(2, "0")}`
    : "";
  const defaultTimeStr = defaultDate
    ? `${String(defaultDate.getHours()).padStart(2, "0")}:${String(defaultDate.getMinutes()).padStart(2, "0")}`
    : "09:00";

  // Auto-fill provider for doctors
  const currentUserId = auth.user?.profile?.sub ?? "";
  const currentUserName = (auth.user?.profile?.name as string) ?? "";

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: "",
      patientName: "",
      patientEmail: "",
      providerId: isDoctor ? currentUserId : "",
      providerName: isDoctor ? currentUserName : "",
      date: defaultDateStr,
      time: defaultTimeStr,
      durationMinutes: 30,
      type: "Consultation",
      reason: "",
      patientNotes: "",
      location: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingAppointment && isEditMode) {
      const scheduledDate = new Date(existingAppointment.scheduledDateTime);
      reset({
        patientId: existingAppointment.patientId,
        patientName: existingAppointment.patientName,
        patientEmail: "",
        providerId: existingAppointment.providerId,
        providerName: existingAppointment.providerName,
        date: `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, "0")}-${String(scheduledDate.getDate()).padStart(2, "0")}`,
        time: `${String(scheduledDate.getHours()).padStart(2, "0")}:${String(scheduledDate.getMinutes()).padStart(2, "0")}`,
        durationMinutes: existingAppointment.durationMinutes,
        type: existingAppointment.type,
        reason: existingAppointment.reason,
        patientNotes: existingAppointment.patientNotes ?? "",
        location: existingAppointment.location ?? "",
      });
      setPatientSearchTerm(existingAppointment.patientName);
    }
  }, [existingAppointment, isEditMode, reset]);

  // Patient search debounce
  useEffect(() => {
    if (patientSearchTerm.length < 2) return;
    const debounce = setTimeout(() => {
      searchPatients({ searchTerm: patientSearchTerm });
    }, 300);
    return () => clearTimeout(debounce);
  }, [patientSearchTerm, searchPatients]);

  // Conflict check on date/time/duration/provider change
  const watchedDate = watch("date");
  const watchedTime = watch("time");
  const watchedDuration = watch("durationMinutes");
  const watchedProviderId = watch("providerId");

  useEffect(() => {
    if (!watchedDate || !watchedTime || !watchedProviderId) return;
    // Convert local form values to UTC for the API
    const startUtc = localDateTimeToUtcIso(watchedDate, watchedTime);
    const endDate = new Date(startUtc);
    endDate.setMinutes(endDate.getMinutes() + watchedDuration);
    const endUtc = endDate.toISOString();

    const debounce = setTimeout(() => {
      checkConflicts({
        providerId: watchedProviderId,
        startTime: startUtc,
        endTime: endUtc,
        ...(editAppointmentId && { excludeAppointmentId: editAppointmentId }),
      });
    }, 500);
    return () => clearTimeout(debounce);
  }, [watchedDate, watchedTime, watchedDuration, watchedProviderId, editAppointmentId, checkConflicts]);

  async function onSubmit(formData: AppointmentFormData) {
    try {
      // Convert local date/time to UTC ISO string for the backend
      const scheduledDateTime = localDateTimeToUtcIso(formData.date, formData.time);
      const typeNumericValue = AppointmentTypeValue[formData.type as AppointmentType];

      if (isEditMode) {
        await updateAppointment({
          id: editAppointmentId!,
          data: {
            scheduledDateTime,
            durationMinutes: formData.durationMinutes,
            type: typeNumericValue,
            reason: formData.reason,
            patientNotes: formData.patientNotes || undefined,
            location: formData.location || undefined,
          },
        }).unwrap();
      } else {
        await createAppointment({
          patientId: formData.patientId,
          patientName: formData.patientName,
          patientEmail: formData.patientEmail,
          providerId: formData.providerId,
          providerName: formData.providerName,
          scheduledDateTime,
          durationMinutes: formData.durationMinutes,
          type: typeNumericValue,
          reason: formData.reason,
          patientNotes: formData.patientNotes || undefined,
          location: formData.location || undefined,
        }).unwrap();
      }
      onClose();
    } catch (error: unknown) {
      // Display backend validation errors
      let errorMessage = `Failed to ${isEditMode ? "update" : "create"} appointment.`;
      
      if (error && typeof error === "object" && "data" in error) {
        const apiError = error as { data?: { errors?: Record<string, string[]>; message?: string } };
        if (apiError.data?.errors) {
          // FluentValidation errors
          const errorList = Object.entries(apiError.data.errors)
            .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
            .join("\n");
          errorMessage += `\n\n${errorList}`;
        } else if (apiError.data?.message) {
          errorMessage += `\n\n${apiError.data.message}`;
        }
      }
      
      toast.error(errorMessage);
    }
  }

  const hasConflicts = conflicts?.hasConflict ?? false;
  const inputClassName =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8 md:items-center md:pt-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="button"
        tabIndex={-1}
        aria-label="Close form"
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-lg border border-neutral-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            {isEditMode ? "Edit Appointment" : "New Appointment"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          {/* Conflict warning */}
          {hasConflicts && (
            <div className="flex items-start gap-2 rounded-lg border border-warning-200 bg-warning-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />
              <div>
                <p className="text-sm font-medium text-warning-700">Scheduling Conflict</p>
                <p className="text-xs text-warning-600">
                  This provider has an overlapping appointment in this time slot.
                </p>
              </div>
            </div>
          )}

          {/* Patient search */}
          {!isEditMode && (
            <div className="relative">
              <FormField label="Patient" error={errors.patientId?.message} required>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={patientSearchTerm}
                    onChange={(event) => {
                      setPatientSearchTerm(event.target.value);
                      setIsPatientDropdownOpen(true);
                      // Clear selected patient if search term changes
                      setValue("patientId", "");
                      setValue("patientName", "");
                      setValue("patientEmail", "");
                    }}
                    onFocus={() => {
                      if (patientSearchTerm.length >= 2) setIsPatientDropdownOpen(true);
                    }}
                    placeholder="Search patients by name..."
                    className={clsxMerge(inputClassName, "pl-9")}
                    autoComplete="off"
                  />
                </div>
              </FormField>

              {/* Search results dropdown */}
              {isPatientDropdownOpen && patientSearchTerm.length >= 2 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg">
                  {isSearchingPatients && (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching...
                    </div>
                  )}
                  {!isSearchingPatients && patientResults?.length === 0 && (
                    <p className="px-4 py-3 text-sm text-neutral-500">No patients found</p>
                  )}
                  {patientResults?.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => {
                        setValue("patientId", patient.id, { shouldValidate: true });
                        setValue("patientName", patient.fullName);
                        setValue("patientEmail", patient.email);
                        setPatientSearchTerm(patient.fullName);
                        setIsPatientDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-neutral-50"
                    >
                      <span className="font-medium text-neutral-900">{patient.fullName}</span>
                      <span className="text-xs text-neutral-500">{patient.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isEditMode && (
            <FormField label="Patient" required>
              <input
                type="text"
                value={existingAppointment?.patientName ?? ""}
                disabled
                className={clsxMerge(inputClassName, "bg-neutral-100")}
              />
            </FormField>
          )}

          {/* Provider */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Provider Name" error={errors.providerName?.message} required>
              <input
                type="text"
                {...register("providerName")}
                className={inputClassName}
                placeholder="Dr. Smith"
                disabled={isDoctor}
              />
            </FormField>

            <FormField label="Provider ID" error={errors.providerId?.message} required>
              <input
                type="text"
                {...register("providerId")}
                className={inputClassName}
                placeholder="Provider ID"
                disabled={isDoctor}
              />
            </FormField>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Date" error={errors.date?.message} required>
              <input
                type="date"
                {...register("date")}
                className={inputClassName}
              />
            </FormField>

            <FormField label="Time" error={errors.time?.message} required>
              <input
                type="time"
                {...register("time")}
                className={inputClassName}
                step="900"
              />
            </FormField>

            <FormField label="Duration" error={errors.durationMinutes?.message} required>
              <Controller
                name="durationMinutes"
                control={control}
                render={({ field }) => (
                  <select
                    value={field.value}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                    className={inputClassName}
                  >
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </FormField>
          </div>

          {/* Type */}
          <FormField label="Appointment Type" error={errors.type?.message} required>
            <select {...register("type")} className={inputClassName}>
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          {/* Reason */}
          <FormField label="Reason for Visit" error={errors.reason?.message} required>
            <input
              type="text"
              {...register("reason")}
              className={inputClassName}
              placeholder="Chief complaint or reason for visit"
            />
          </FormField>

          {/* Location */}
          <FormField label="Location" error={errors.location?.message}>
            <input
              type="text"
              {...register("location")}
              className={inputClassName}
              placeholder="Room / Building (optional)"
            />
          </FormField>

          {/* Patient Notes */}
          <FormField label="Patient Notes" error={errors.patientNotes?.message}>
            <textarea
              {...register("patientNotes")}
              rows={2}
              className={clsxMerge(inputClassName, "resize-none")}
              placeholder="Additional notes (optional)"
            />
          </FormField>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={(!isDirty && !isEditMode) || isCreating || isUpdating}
              className={clsxMerge(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2",
                "text-sm font-medium text-white",
                "bg-primary-700 hover:bg-primary-800",
                "disabled:cursor-not-allowed disabled:bg-neutral-300",
              )}
            >
              {isCreating || isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditMode ? "Update" : "Create Appointment"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
