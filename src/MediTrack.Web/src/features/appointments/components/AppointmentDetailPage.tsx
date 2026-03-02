import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2, AlertCircle, Calendar, Clock, User,
  Sparkles, Hash, Stethoscope, Video, MessageSquare,
} from "lucide-react";
import { useGetAppointmentByIdQuery } from "../store/appointmentApi";
import { useStartSessionMutation } from "@/features/clara";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useRoles } from "@/shared/auth/useRoles";
import { UserRole } from "@/shared/auth/roles";
import { Breadcrumb } from "@/shared/components";
import type { AppointmentStatus } from "../types";

/* ── Status config ── */

const STATUS_CONFIG: Record<AppointmentStatus, { badge: string }> = {
  Scheduled:   { badge: "bg-primary-100 text-primary-700" },
  Confirmed:   { badge: "bg-accent-100 text-accent-700" },
  CheckedIn:   { badge: "bg-info-50 text-info-700" },
  InProgress:  { badge: "bg-warning-50 text-warning-700" },
  Completed:   { badge: "bg-success-50 text-success-700" },
  Cancelled:   { badge: "bg-neutral-100 text-neutral-500" },
  NoShow:      { badge: "bg-error-50 text-error-700" },
  Rescheduled: { badge: "bg-neutral-100 text-neutral-600" },
};

/* ── Sub-components ── */

function DetailCard({
  icon: Icon,
  title,
  children,
}: {
  readonly icon: React.ElementType;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b border-neutral-200 pb-3">
        <Icon className="h-5 w-5 text-primary-700" />
        <h3 className="font-semibold text-neutral-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-sm font-medium text-neutral-900">{value || "\u2014"}</p>
    </div>
  );
}

/* ── Main component ── */

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: appointment, isLoading, error } = useGetAppointmentByIdQuery(id!);
  const [startSession, { isLoading: isStartingSession }] = useStartSessionMutation();
  const { hasAnyRole } = useRoles();
  const canStartClaraSession = hasAnyRole([UserRole.Doctor, UserRole.Admin]);

  const handleStartClaraSession = async () => {
    if (!appointment) return;
    try {
      const result = await startSession({ patientId: appointment.patientId }).unwrap();
      navigate(`/clara/session/${result.id}`);
    } catch {
      toast.error("Failed to start Clara session. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-3 h-12 w-12 text-neutral-300" />
        <p className="text-lg font-semibold text-neutral-700">Appointment not found</p>
        <Link to="/appointments" className="mt-2 text-sm text-primary-700 hover:underline">
          &larr; Back to Appointments
        </Link>
      </div>
    );
  }

  const scheduledDate = new Date(appointment.scheduledDateTime);
  const formattedDate = scheduledDate.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });
  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.Scheduled;

  const patientInitials = appointment.patientName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Appointments", href: "/appointments" },
          { label: `Appointment ${appointment.id.slice(0, 8)}` },
        ]}
      />

      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-secondary-100 text-lg font-semibold text-secondary-700">
            {patientInitials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-neutral-900">{appointment.patientName}</h1>
              <span className={clsxMerge("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusConfig.badge)}>
                {appointment.status}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-sm text-neutral-500">{appointment.id.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            to={`/patients/${appointment.patientId}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <User className="h-4 w-4" /> View Patient
          </Link>
          {canStartClaraSession && (
            <button
              type="button"
              onClick={handleStartClaraSession}
              disabled={isStartingSession}
              className={clsxMerge(
                "relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg px-4",
                "bg-gradient-to-r from-accent-500 to-accent-700",
                "text-sm font-medium text-white shadow-md",
                "transition-all hover:shadow-lg disabled:opacity-50"
              )}
            >
              {isStartingSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Start with Clara
            </button>
          )}
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DetailCard icon={Calendar} title="Appointment Details">
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="Date" value={formattedDate} />
            <InfoField label="Time" value={formattedTime} />
            <InfoField label="Duration" value={`${appointment.durationMinutes} minutes`} />
            <InfoField label="Type" value={appointment.type} />
          </div>
        </DetailCard>

        <DetailCard icon={Stethoscope} title="Provider & Location">
          <div className="space-y-3">
            <InfoField label="Provider" value={appointment.providerName} />
            <InfoField label="Location" value={appointment.location || "Not specified"} />
            {appointment.telehealthLink && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Telehealth Link</p>
                <a
                  href={appointment.telehealthLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"
                >
                  <Video className="h-4 w-4" /> Join Meeting
                </a>
              </div>
            )}
          </div>
        </DetailCard>

        <DetailCard icon={Hash} title="Reason for Visit">
          <p className="text-sm text-neutral-700">{appointment.reason || "No reason specified"}</p>
        </DetailCard>

        {(appointment.patientNotes || appointment.internalNotes) && (
          <DetailCard icon={MessageSquare} title="Notes">
            <div className="space-y-3">
              {appointment.patientNotes && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Patient Notes</p>
                  <p className="text-sm text-neutral-700">{appointment.patientNotes}</p>
                </div>
              )}
              {appointment.internalNotes && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Internal Notes</p>
                  <p className="text-sm text-neutral-700">{appointment.internalNotes}</p>
                </div>
              )}
            </div>
          </DetailCard>
        )}

        {appointment.cancellationReason && (
          <DetailCard icon={AlertCircle} title="Cancellation">
            <div className="space-y-3">
              <InfoField label="Reason" value={appointment.cancellationReason} />
              {appointment.cancelledAt && (
                <InfoField
                  label="Cancelled At"
                  value={new Date(appointment.cancelledAt).toLocaleString("en-US", {
                    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                />
              )}
            </div>
          </DetailCard>
        )}

        <DetailCard icon={Clock} title="Metadata">
          <div className="space-y-3">
            <InfoField
              label="Created"
              value={new Date(appointment.createdAt).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
              })}
            />
            <InfoField
              label="Last Updated"
              value={new Date(appointment.updatedAt).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
              })}
            />
          </div>
        </DetailCard>
      </div>
    </>
  );
}
