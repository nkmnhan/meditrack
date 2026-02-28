import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  UserMinus,
  UserCheck,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  FileText,
  Copy,
  Sparkles,
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

function InfoRow({ icon: Icon, label, value }: Readonly<{ icon: typeof Mail; label: string; value: string }>) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 shrink-0 text-neutral-500" />
      <div>
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <p className="mt-1 text-neutral-900">{value || "—"}</p>
      </div>
    </div>
  );
}

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
    toast.success("MRN copied to clipboard");
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
      <div className="space-y-4">
        <Link
          to="/patients"
          className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patients
        </Link>
        <div className="flex items-center gap-3 rounded-lg border border-error-200 bg-error-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-error-600" />
          <div>
            <p className="text-sm font-medium text-error-800">Patient not found</p>
            <p className="text-sm text-error-700">
              The patient you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formattedDOB = new Date(patient.dateOfBirth).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const age = Math.floor(
    (Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Patients", href: "/patients" },
          { label: `${patient.firstName} ${patient.lastName}` },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/patients"
            className="rounded-lg border border-neutral-300 p-2 text-neutral-700 hover:bg-neutral-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="mt-1 text-neutral-500">Patient ID: {patient.id.substring(0, 8)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {canStartClaraSession && (
            <button
              type="button"
              onClick={handleStartClaraSession}
              disabled={isStartingSession}
              className="inline-flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
            >
              {isStartingSession ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Start with Clara
            </button>
          )}
          <Link
            to={`/patients/${patient.id}/medical-records`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
          >
            <FileText className="h-4 w-4" />
            Medical Records
          </Link>
          <Link
            to={`/patients/${patient.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          {canManagePatientStatus && (
            patient.isActive ? (
              <button
                onClick={handleDeactivate}
                disabled={isDeactivating}
                className="inline-flex items-center gap-2 rounded-lg border border-error-300 px-4 py-2 text-error-700 hover:bg-error-50 disabled:opacity-50"
              >
                {isDeactivating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserMinus className="h-4 w-4" />
                )}
                Deactivate
              </button>
            ) : (
              <button
                onClick={handleActivate}
                disabled={isActivating}
                className="inline-flex items-center gap-2 rounded-lg border border-success-300 px-4 py-2 text-success-700 hover:bg-success-50 disabled:opacity-50"
              >
                {isActivating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                Activate
              </button>
            )
          )}
        </div>
      </div>

      {/* Status Badge */}
      <span
        className={clsxMerge(
          "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
          patient.isActive
            ? "bg-success-50 text-success-700"
            : "bg-neutral-100 text-neutral-500"
        )}
      >
        {patient.isActive ? "Active" : "Inactive"}
      </span>

      {/* Patient Information */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">Basic Information</h2>
          <div className="space-y-4">
            <InfoRow icon={User} label="Full Name" value={`${patient.firstName} ${patient.lastName}`} />
            <InfoRow
              icon={Calendar}
              label="Date of Birth"
              value={`${formattedDOB} (${age} years old)`}
            />
            {patient.gender && <InfoRow icon={User} label="Gender" value={patient.gender} />}
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">Contact Information</h2>
          <div className="space-y-4">
            <InfoRow icon={Mail} label="Email" value={patient.email} />
            <InfoRow icon={Phone} label="Phone" value={patient.phoneNumber} />
            <InfoRow
              icon={MapPin}
              label="Address"
              value={
                typeof patient.address === "string"
                  ? patient.address
                  : (() => {
                      const street2Part = patient.address.street2
                        ? `, ${patient.address.street2}`
                        : "";
                      return `${patient.address.street}${street2Part}, ${patient.address.city}, ${patient.address.state} ${patient.address.zipCode}`;
                    })()
              }
            />
          </div>
        </div>

        {/* Emergency Contact */}
        {patient.emergencyContact && (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">Emergency Contact</h2>
            {typeof patient.emergencyContact === "string" ? (
              <div className="whitespace-pre-line text-neutral-900">{patient.emergencyContact}</div>
            ) : (
              <div className="space-y-2 text-neutral-900">
                <p><strong>Name:</strong> {patient.emergencyContact.name}</p>
                <p><strong>Relationship:</strong> {patient.emergencyContact.relationship}</p>
                <p><strong>Phone:</strong> {patient.emergencyContact.phoneNumber}</p>
                {patient.emergencyContact.email && (
                  <p><strong>Email:</strong> {patient.emergencyContact.email}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Medical Record Number */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">Medical Record</h2>
          <p className="text-sm font-medium text-neutral-500">MRN</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-mono text-lg text-neutral-900">{patient.medicalRecordNumber}</p>
            <button
              type="button"
              onClick={handleCopyMrn}
              aria-label="Copy MRN to clipboard"
              className="h-7 w-7 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Insurance Information */}
        {patient.insurance && (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">Insurance Information</h2>
            {typeof patient.insurance === "string" ? (
              <div className="whitespace-pre-line text-neutral-900">{patient.insurance}</div>
            ) : (
              <div className="space-y-2 text-neutral-900">
                <p><strong>Provider:</strong> {patient.insurance.provider}</p>
                <p><strong>Policy Number:</strong> {patient.insurance.policyNumber}</p>
                <p><strong>Group Number:</strong> {patient.insurance.groupNumber}</p>
                {patient.insurance.planName && (
                  <p><strong>Plan Name:</strong> {patient.insurance.planName}</p>
                )}
                {patient.insurance.effectiveDate && (
                  <p><strong>Effective Date:</strong> {new Date(patient.insurance.effectiveDate).toLocaleDateString()}</p>
                )}
                {patient.insurance.expirationDate && (
                  <p><strong>Expiration Date:</strong> {new Date(patient.insurance.expirationDate).toLocaleDateString()}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>
            Created: {new Date(patient.createdAt).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {patient.updatedAt && (
            <span>
              Last Updated: {new Date(patient.updatedAt).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
