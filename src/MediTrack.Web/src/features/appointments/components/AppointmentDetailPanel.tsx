import { Link } from "react-router-dom";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Stethoscope,
  FileText,
  Video,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useGetAppointmentByIdQuery } from "../store/appointmentApi";
import { STATUS_CONFIG, TYPE_LABELS } from "../constants";
import { AppointmentStatusActions } from "./AppointmentStatusActions";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import type { AppointmentStatus } from "../types";

interface AppointmentDetailPanelProps {
  readonly appointmentId: string;
  readonly onClose: () => void;
  readonly isStaff: boolean;
  readonly isPatient: boolean;
}

function StatusBadge({ status }: { readonly status: AppointmentStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        backgroundColor: config.lightColors.container,
        color: config.lightColors.onContainer,
      }}
    >
      {config.label}
    </span>
  );
}

interface InfoRowProps {
  readonly icon: React.ElementType;
  readonly label: string;
  readonly value: string | null | undefined;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
      <div>
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        <p className="text-sm text-neutral-900">{value}</p>
      </div>
    </div>
  );
}

export function AppointmentDetailPanel({
  appointmentId,
  onClose,
  isStaff,
  isPatient,
}: AppointmentDetailPanelProps) {
  const {
    data: appointment,
    isLoading,
    error,
  } = useGetAppointmentByIdQuery(appointmentId);

  function formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close panel"
      />

      {/* Panel — full screen on mobile, side panel on desktop */}
      <div
        className={clsxMerge(
          "fixed z-50 bg-white shadow-xl",
          // Mobile: full screen modal
          "inset-0",
          // Desktop: right side panel
          "md:inset-y-0 md:left-auto md:right-0 md:w-96",
          "flex flex-col",
          "overflow-y-auto",
        )}
        role="dialog"
        aria-label="Appointment details"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">Appointment Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-700" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-2 py-12 text-error-600">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm">Failed to load appointment details</p>
            </div>
          )}

          {appointment && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <StatusBadge status={appointment.status} />
                <span className="text-sm text-neutral-500">
                  {TYPE_LABELS[appointment.type]}
                </span>
              </div>

              {/* Key info */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                  <Link
                    to={`/patients/${appointment.patientId}`}
                    className="inline-flex items-center gap-1 text-sm text-primary-700 hover:text-primary-800 hover:underline transition-colors"
                  >
                    {appointment.patientName}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <p className="text-xs font-medium text-neutral-500">Patient</p>
                </div>
                <InfoRow
                  icon={Stethoscope}
                  label="Provider"
                  value={appointment.providerName}
                />
                <InfoRow
                  icon={Calendar}
                  label="Date"
                  value={formatDateTime(appointment.scheduledDateTime)}
                />
                <InfoRow
                  icon={Clock}
                  label="Time"
                  value={`${formatTime(appointment.scheduledDateTime)} — ${formatTime(appointment.scheduledEndDateTime)} (${appointment.durationMinutes} min)`}
                />
                <InfoRow
                  icon={MapPin}
                  label="Location"
                  value={appointment.location}
                />
                <InfoRow
                  icon={Video}
                  label="Telehealth Link"
                  value={appointment.telehealthLink}
                />
              </div>

              {/* Reason */}
              <div>
                <p className="text-xs font-medium text-neutral-500">Reason for Visit</p>
                <p className="mt-1 text-sm text-neutral-900">{appointment.reason}</p>
              </div>

              {/* Notes */}
              {appointment.patientNotes && (
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-neutral-500" />
                    <p className="text-xs font-medium text-neutral-500">Patient Notes</p>
                  </div>
                  <p className="mt-1 text-sm text-neutral-700">{appointment.patientNotes}</p>
                </div>
              )}

              {isStaff && appointment.internalNotes && (
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-neutral-500" />
                    <p className="text-xs font-medium text-neutral-500">Internal Notes</p>
                  </div>
                  <p className="mt-1 text-sm text-neutral-700">{appointment.internalNotes}</p>
                </div>
              )}

              {/* Cancellation info */}
              {appointment.cancellationReason && (
                <div className="rounded-lg border border-error-200 bg-error-50 p-3">
                  <p className="text-xs font-medium text-error-700">Cancellation Reason</p>
                  <p className="mt-1 text-sm text-error-600">{appointment.cancellationReason}</p>
                </div>
              )}

              {/* Workflow actions */}
              <AppointmentStatusActions
                appointmentId={appointment.id}
                currentStatus={appointment.status}
                canBeCancelled={appointment.canBeCancelled}
                isStaff={isStaff}
                isPatient={isPatient}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
