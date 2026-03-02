import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Pencil,
  UserCheck as UserCheckIcon,
  Loader2,
  AlertCircle,
  Phone,
  User,
  FileText,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  Shield,
  Hash,
  Clock,
  Ban,
} from "lucide-react";
import {
  useGetPatientByIdQuery,
  useDeactivatePatientMutation,
  useActivatePatientMutation,
} from "../store/patientApi";
import { useStartSessionMutation } from "@/features/clara";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useRoles } from "@/shared/auth/useRoles";
import { UserRole } from "@/shared/auth/roles";
import { Breadcrumb } from "@/shared/components";

/* ── Avatar color rotation ── */

const AVATAR_COLORS = [
  "bg-primary-100 text-primary-700",
  "bg-success-100 text-success-700",
  "bg-error-100 text-error-700",
  "bg-warning-100 text-warning-700",
  "bg-accent-100 text-accent-700",
  "bg-info-100 text-info-700",
  "bg-secondary-100 text-secondary-700",
] as const;

function getAvatarColor(patientId: string): string {
  let hash = 0;
  for (let index = 0; index < patientId.length; index++) {
    hash = ((hash << 5) - hash + patientId.charCodeAt(index)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ── Sub-components ── */

function InfoField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-sm font-medium text-neutral-900">{value || "\u2014"}</p>
    </div>
  );
}

function DetailCard({
  icon: Icon,
  title,
  children,
  accent,
}: {
  readonly icon: React.ElementType;
  readonly title: string;
  readonly children: React.ReactNode;
  readonly accent?: string;
}) {
  return (
    <div className={clsxMerge(
      "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm",
      accent && `border-l-4 ${accent}`
    )}>
      <div className="mb-4 flex items-center gap-2 border-b border-neutral-200 pb-3">
        <Icon className="h-5 w-5 text-primary-700" />
        <h3 className="font-semibold text-neutral-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ── Main component ── */

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: patient, isLoading, error } = useGetPatientByIdQuery(id!);
  const [deactivatePatient, { isLoading: isDeactivating }] = useDeactivatePatientMutation();
  const [activatePatient, { isLoading: isActivating }] = useActivatePatientMutation();
  const [startSession, { isLoading: isStartingSession }] = useStartSessionMutation();
  const { hasAnyRole } = useRoles();
  const canManagePatientStatus = hasAnyRole([UserRole.Admin, UserRole.Receptionist]);
  const canStartClaraSession = hasAnyRole([UserRole.Doctor, UserRole.Admin]);
  const [isMrnCopied, setIsMrnCopied] = useState(false);

  const handleStartClaraSession = async () => {
    if (!patient) return;
    try {
      const result = await startSession({ patientId: patient.id }).unwrap();
      navigate(`/clara/session/${result.id}`);
    } catch {
      toast.error("Failed to start Clara session. Please try again.");
    }
  };

  const handleCopyMrn = () => {
    if (!patient) return;
    navigator.clipboard.writeText(patient.medicalRecordNumber);
    setIsMrnCopied(true);
    setTimeout(() => setIsMrnCopied(false), 2000);
  };

  const handleDeactivate = async () => {
    if (
      confirm(
        "Are you sure you want to deactivate this patient? They won't appear in default searches."
      )
    ) {
      try {
        await deactivatePatient(id!).unwrap();
        toast.success("Patient deactivated successfully.");
      } catch {
        toast.error("Failed to deactivate patient. Please try again.");
      }
    }
  };

  const handleActivate = async () => {
    try {
      await activatePatient(id!).unwrap();
      toast.success("Patient activated successfully.");
    } catch {
      toast.error("Failed to activate patient. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-3 h-12 w-12 text-neutral-300" />
        <p className="text-lg font-semibold text-neutral-700">Patient not found</p>
        <Link to="/patients" className="mt-2 text-sm text-primary-700 hover:underline">
          &larr; Back to Patients
        </Link>
      </div>
    );
  }

  const fullName = `${patient.firstName} ${patient.lastName}`;
  const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase();

  const formattedDOB = new Date(patient.dateOfBirth).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const age = Math.floor(
    (Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const formattedCreatedAt = new Date(patient.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
  const formattedUpdatedAt = patient.updatedAt
    ? new Date(patient.updatedAt).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      })
    : "\u2014";

  const addressString = typeof patient.address === "string"
    ? patient.address
    : (() => {
        const street2Part = patient.address.street2 ? `, ${patient.address.street2}` : "";
        return `${patient.address.street}${street2Part}, ${patient.address.city}, ${patient.address.state} ${patient.address.zipCode}`;
      })();

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Patients", href: "/patients" },
          { label: fullName },
        ]}
      />

      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-center gap-4">
          <div className={clsxMerge("flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-semibold", getAvatarColor(patient.id))}>
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-neutral-900">{fullName}</h1>
              <span
                className={clsxMerge(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  patient.isActive
                    ? "border border-success-500/30 bg-success-50 text-success-700"
                    : "bg-neutral-100 text-neutral-500"
                )}
              >
                {patient.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-sm text-neutral-500">{patient.medicalRecordNumber}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            to={`/patients/${patient.id}/edit`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <Pencil className="h-4 w-4" /> Edit
          </Link>
          <Link
            to={`/patients/${patient.id}/medical-records`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <FileText className="h-4 w-4" /> View Medical Records
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
              {isStartingSession ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Start with Clara
            </button>
          )}
          {canManagePatientStatus && (
            patient.isActive ? (
              <button
                onClick={handleDeactivate}
                disabled={isDeactivating}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-error-500 px-4 text-sm font-medium text-error-700 transition-colors hover:bg-error-50 disabled:opacity-50"
              >
                {isDeactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Deactivate
              </button>
            ) : (
              <button
                onClick={handleActivate}
                disabled={isActivating}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-success-300 px-4 text-sm font-medium text-success-700 transition-colors hover:bg-success-50 disabled:opacity-50"
              >
                {isActivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheckIcon className="h-4 w-4" />}
                Activate
              </button>
            )
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DetailCard icon={User} title="Basic Information">
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="Full Name" value={fullName} />
            <InfoField label="Date of Birth" value={`${formattedDOB} (${age} years)`} />
            <InfoField label="Gender" value={patient.gender || "\u2014"} />
            <InfoField label="Blood Type" value={patient.bloodType || "\u2014"} />
          </div>
        </DetailCard>

        <DetailCard icon={Phone} title="Contact Information">
          <div className="space-y-3">
            <InfoField label="Phone" value={patient.phoneNumber} />
            <InfoField label="Email" value={patient.email} />
            <InfoField label="Address" value={addressString} />
          </div>
        </DetailCard>

        {patient.emergencyContact && typeof patient.emergencyContact !== "string" && (
          <DetailCard icon={AlertTriangle} title="Emergency Contact" accent="border-l-warning-500">
            <div className="space-y-3">
              <InfoField label="Name" value={patient.emergencyContact.name} />
              <InfoField label="Relationship" value={patient.emergencyContact.relationship} />
              <InfoField label="Phone" value={patient.emergencyContact.phoneNumber} />
              {patient.emergencyContact.email && (
                <InfoField label="Email" value={patient.emergencyContact.email} />
              )}
            </div>
          </DetailCard>
        )}

        <DetailCard icon={Hash} title="Medical Record Number">
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-md bg-neutral-50 p-3 font-mono text-lg font-semibold text-neutral-900">
              {patient.medicalRecordNumber}
            </div>
            <button
              onClick={handleCopyMrn}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50"
              aria-label="Copy MRN to clipboard"
            >
              {isMrnCopied ? <Check className="h-4 w-4 text-success-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </DetailCard>

        {patient.insurance && typeof patient.insurance !== "string" && (
          <DetailCard icon={Shield} title="Insurance Information">
            <div className="space-y-3">
              <InfoField label="Provider" value={patient.insurance.provider} />
              <InfoField label="Policy Number" value={patient.insurance.policyNumber} />
              <InfoField label="Group Number" value={patient.insurance.groupNumber} />
              {patient.insurance.planName && (
                <InfoField label="Plan Name" value={patient.insurance.planName} />
              )}
            </div>
          </DetailCard>
        )}

        <DetailCard icon={Clock} title="Metadata">
          <div className="space-y-3">
            <InfoField label="Created" value={formattedCreatedAt} />
            <InfoField label="Last Updated" value={formattedUpdatedAt} />
          </div>
        </DetailCard>
      </div>
    </>
  );
}
