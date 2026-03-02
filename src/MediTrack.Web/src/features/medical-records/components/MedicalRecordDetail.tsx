import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Stethoscope,
  Activity,
  StickyNote,
  Pill,
  Paperclip,
  ArrowLeft,
  MoreVertical,
  CheckCircle,
  Clock,
  Archive,
  Loader2,
  Sparkles,
  CalendarDays,
  AlertTriangle,
  Heart,
  HeartPulse,
  Thermometer,
  Wind,
  Scale,
  Ruler,
  Calculator,
  FileImage,
  FileText,
  Download,
  Plus,
} from "lucide-react";
import type { MedicalRecordResponse, ClinicalNoteType } from "../types";
import { RecordStatus } from "../types";
import { SeverityBadge, StatusBadge, PrescriptionStatusBadge } from "./MedicalRecordBadges";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import {
  useResolveMedicalRecordMutation,
  useMarkRequiresFollowUpMutation,
  useArchiveMedicalRecordMutation,
} from "../store/medicalRecordsApi";
import { useRoles } from "@/shared/auth/useRoles";
import { UserRole } from "@/shared/auth/roles";

/* ── Vital sign config ── */

const VITAL_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  "Blood Pressure": { icon: Heart, color: "text-warning-500" },
  "Heart Rate": { icon: HeartPulse, color: "text-success-500" },
  "Temperature": { icon: Thermometer, color: "text-neutral-700" },
  "Respiratory Rate": { icon: Wind, color: "text-success-500" },
  "O2 Saturation": { icon: Wind, color: "text-success-500" },
  "Weight": { icon: Scale, color: "text-neutral-700" },
  "Height": { icon: Ruler, color: "text-neutral-700" },
  "BMI": { icon: Calculator, color: "text-success-500" },
};

const DEFAULT_VITAL_CONFIG = { icon: Activity, color: "text-info-700" };

/* ── Note type colors ── */

const NOTE_TYPE_COLORS: Record<string, string> = {
  "Progress Note": "bg-primary-100 text-primary-700",
  "SOAP Note": "bg-secondary-100 text-secondary-700",
  "Assessment": "bg-accent-100 text-accent-700",
  "Plan": "bg-info-100 text-info-700",
  "Procedure Note": "bg-warning-100 text-warning-700",
  "Consultation Note": "bg-primary-100 text-primary-700",
  "Discharge Summary": "bg-neutral-100 text-neutral-700",
};

/* ── Sub-components ── */

function SectionCard({
  icon: Icon,
  title,
  iconColor = "text-primary-700",
  right,
  children,
}: {
  readonly icon: React.ElementType;
  readonly title: string;
  readonly iconColor?: string;
  readonly right?: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-200 px-6 pb-3 pt-5">
        <div className="flex items-center gap-2">
          <Icon className={clsxMerge("h-5 w-5", iconColor)} />
          <h2 className="font-semibold text-neutral-900">{title}</h2>
        </div>
        {right}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <div className="text-sm font-medium leading-relaxed text-neutral-900">{children}</div>
    </div>
  );
}

interface VitalCardProps {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly warning?: boolean;
  readonly warningText?: string;
  readonly vitalKey: string;
}

function VitalCard({ label, value, unit, warning, warningText, vitalKey }: VitalCardProps) {
  const config = VITAL_CONFIG[vitalKey] || DEFAULT_VITAL_CONFIG;
  const VitalIcon = config.icon;
  const colorClass = warning ? "text-warning-500" : config.color;

  return (
    <div className="rounded-lg bg-neutral-50 p-4">
      <VitalIcon className={clsxMerge("mb-2 h-4 w-4", colorClass)} />
      <p className={clsxMerge("text-2xl font-bold", colorClass)}>{value}</p>
      <p className="mt-0.5 text-xs text-neutral-500">
        {label}
        {unit ? ` (${unit})` : ""}
      </p>
      {warning && warningText && (
        <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-warning-600">
          <AlertTriangle className="h-3 w-3" />
          <span>{warningText}</span>
        </div>
      )}
    </div>
  );
}

/* ── Main component ── */

interface MedicalRecordDetailProps {
  readonly record: MedicalRecordResponse;
}

export function MedicalRecordDetail({ record }: MedicalRecordDetailProps) {
  const isAiGenerated = Boolean("origin" in record && (record as Record<string, unknown>).origin === "AI");
  const navigate = useNavigate();
  const { hasAnyRole } = useRoles();
  const isMedicalStaff = hasAnyRole([UserRole.Doctor, UserRole.Nurse]);

  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showActions) return;
    function handleClickOutside(event: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActions]);

  const [resolveRecord, { isLoading: isResolving }] = useResolveMedicalRecordMutation();
  const [markFollowUp, { isLoading: isMarkingFollowUp }] = useMarkRequiresFollowUpMutation();
  const [archiveRecord, { isLoading: isArchiving }] = useArchiveMedicalRecordMutation();

  async function handleResolve() {
    try {
      await resolveRecord(record.id).unwrap();
      setShowActions(false);
      toast.success("Record marked as resolved.");
    } catch {
      toast.error("Failed to resolve record. Please try again.");
    }
  }

  async function handleMarkFollowUp() {
    try {
      await markFollowUp(record.id).unwrap();
      setShowActions(false);
      toast.success("Record marked for follow-up.");
    } catch {
      toast.error("Failed to mark for follow-up. Please try again.");
    }
  }

  async function handleArchive() {
    try {
      await archiveRecord(record.id).unwrap();
      setShowActions(false);
      toast.success("Record archived.");
    } catch {
      toast.error("Failed to archive record. Please try again.");
    }
  }

  const formattedDate = new Date(record.recordedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  function getAttachmentIcon(contentType: string) {
    if (contentType.startsWith("image/")) {
      return <FileImage className="h-5 w-5 flex-shrink-0 text-primary-700" />;
    }
    return <FileText className="h-5 w-5 flex-shrink-0 text-primary-700" />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className={clsxMerge(
                "flex h-10 w-10 items-center justify-center",
                "rounded-lg border border-neutral-200",
                "transition-colors hover:bg-neutral-50"
              )}
            >
              <ArrowLeft className="h-5 w-5 text-neutral-700" />
            </button>
            <h1 className="text-2xl font-bold text-neutral-900">{record.chiefComplaint}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 pl-[52px]">
            <StatusBadge status={record.status} size="md" />
            <SeverityBadge severity={record.severity} size="md" />
          </div>
          <p className="mt-2 pl-[52px] text-sm text-neutral-500">
            {record.recordedByDoctorName} — Created {formattedDate}
          </p>
        </div>

        {isMedicalStaff && record.status !== RecordStatus.Archived && (
          <div className="relative" ref={actionsRef}>
            <button
              onClick={() => setShowActions(!showActions)}
              className={clsxMerge(
                "flex h-10 w-10 items-center justify-center",
                "rounded-lg border border-neutral-200 bg-white",
                "transition-colors hover:bg-neutral-50"
              )}
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showActions && (
              <div
                className={clsxMerge(
                  "absolute right-0 z-10 mt-2 w-48",
                  "rounded-lg border border-neutral-200 bg-white shadow-lg"
                )}
              >
                {record.status !== RecordStatus.Resolved && (
                  <button
                    onClick={handleResolve}
                    disabled={isResolving}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {isResolving ? (
                      <Loader2 className="h-4 w-4 animate-spin text-success-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-success-600" />
                    )}
                    Mark as Resolved
                  </button>
                )}

                {record.status !== RecordStatus.RequiresFollowUp && (
                  <button
                    onClick={handleMarkFollowUp}
                    disabled={isMarkingFollowUp}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {isMarkingFollowUp ? (
                      <Loader2 className="h-4 w-4 animate-spin text-warning-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-warning-600" />
                    )}
                    Requires Follow-up
                  </button>
                )}

                <button
                  onClick={handleArchive}
                  disabled={isArchiving}
                  className="flex w-full items-center gap-2 border-t border-neutral-200 px-4 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  {isArchiving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-600" />
                  ) : (
                    <Archive className="h-4 w-4 text-neutral-600" />
                  )}
                  Archive Record
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Origin Banner */}
      {isAiGenerated && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-accent-100 bg-accent-50 px-4 py-3">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-accent-700" />
          <span className="text-sm text-accent-700">
            This record was generated by Clara AI on {formattedDate}.
          </span>
          <Link
            to={`/clara/session/${record.appointmentId || ""}`}
            className="text-sm font-medium text-accent-700 hover:underline"
          >
            View session &rarr;
          </Link>
        </div>
      )}

      <div className="space-y-6">
        {/* Diagnosis & Chief Complaint */}
        <SectionCard icon={Stethoscope} title="Diagnosis & Chief Complaint">
          <div className="space-y-4">
            <Field label="Chief Complaint">{record.chiefComplaint}</Field>
            <Field label="Primary Diagnosis">
              {record.diagnosisDescription}{" "}
              <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-xs">
                {record.diagnosisCode}
              </span>
            </Field>
          </div>
        </SectionCard>

        {/* Vital Signs */}
        {record.vitalSigns.length > 0 && (
          <SectionCard
            icon={Activity}
            title="Vital Signs"
            right={
              <span className="hidden text-xs text-neutral-500 sm:block">
                Recorded {new Date(record.vitalSigns[0].recordedAt).toLocaleString()}
              </span>
            }
          >
            {record.vitalSigns.map((vitals) => (
              <div key={vitals.id} className="mb-4 last:mb-0">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {vitals.bloodPressureFormatted != null && (
                    <VitalCard
                      vitalKey="Blood Pressure"
                      label="Blood Pressure"
                      value={vitals.bloodPressureFormatted}
                      unit="mmHg"
                      warning={
                        (vitals.bloodPressureSystolic != null && vitals.bloodPressureSystolic > 140) ||
                        (vitals.bloodPressureDiastolic != null && vitals.bloodPressureDiastolic > 90)
                      }
                      warningText="Monitor closely"
                    />
                  )}
                  {vitals.heartRate != null && (
                    <VitalCard
                      vitalKey="Heart Rate"
                      label="Heart Rate"
                      value={String(vitals.heartRate)}
                      unit="bpm"
                      warning={vitals.heartRate > 100 || vitals.heartRate < 60}
                      warningText="Abnormal range"
                    />
                  )}
                  {vitals.temperature != null && (
                    <VitalCard
                      vitalKey="Temperature"
                      label="Temperature"
                      value={String(vitals.temperature)}
                      unit="°F"
                      warning={vitals.temperature > 100.4 || vitals.temperature < 97}
                      warningText="Outside normal"
                    />
                  )}
                  {vitals.respiratoryRate != null && (
                    <VitalCard
                      vitalKey="Respiratory Rate"
                      label="Respiratory Rate"
                      value={String(vitals.respiratoryRate)}
                      unit="/min"
                      warning={vitals.respiratoryRate > 20 || vitals.respiratoryRate < 12}
                      warningText="Abnormal range"
                    />
                  )}
                  {vitals.oxygenSaturation != null && (
                    <VitalCard
                      vitalKey="O2 Saturation"
                      label="O₂ Saturation"
                      value={String(vitals.oxygenSaturation)}
                      unit="%"
                      warning={vitals.oxygenSaturation < 95}
                      warningText="Low oxygen"
                    />
                  )}
                  {vitals.weight != null && (
                    <VitalCard
                      vitalKey="Weight"
                      label="Weight"
                      value={String(vitals.weight)}
                      unit="lbs"
                    />
                  )}
                  {vitals.height != null && (
                    <VitalCard
                      vitalKey="Height"
                      label="Height"
                      value={String(vitals.height)}
                      unit="in"
                    />
                  )}
                  {vitals.bmi != null && (
                    <VitalCard
                      vitalKey="BMI"
                      label="BMI"
                      value={vitals.bmi.toFixed(1)}
                      warning={vitals.bmi > 30 || vitals.bmi < 18.5}
                      warningText={vitals.bmi > 30 ? "Obese range" : "Underweight"}
                    />
                  )}
                </div>
                <p className="mt-3 text-xs text-neutral-500">
                  Recorded by {vitals.recordedByName} on{" "}
                  {new Date(vitals.recordedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </SectionCard>
        )}

        {/* Clinical Notes */}
        {record.clinicalNotes.length > 0 && (
          <SectionCard
            icon={StickyNote}
            title="Clinical Notes"
            right={
              <button className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50">
                <Plus className="h-3.5 w-3.5" />
                Add Note
              </button>
            }
          >
            <div className="divide-y divide-neutral-200">
              {record.clinicalNotes.map((note, noteIndex) => (
                <div key={note.id} className={noteIndex === 0 ? "pb-5" : "py-5"}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={clsxMerge(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        NOTE_TYPE_COLORS[note.noteType as ClinicalNoteType] || "bg-neutral-100 text-neutral-700"
                      )}
                    >
                      {note.noteType}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {note.authorName} · {new Date(note.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Prescriptions */}
        {record.prescriptions.length > 0 && (
          <SectionCard icon={Pill} title="Prescriptions" iconColor="text-secondary-700">
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left">
                    <th className="pb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Medication</th>
                    <th className="pb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Dosage</th>
                    <th className="pb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Frequency</th>
                    <th className="pb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Prescribed By</th>
                    <th className="pb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Start Date</th>
                    <th className="pb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {record.prescriptions.map((prescription) => (
                    <tr key={prescription.id} className="transition-colors hover:bg-neutral-50">
                      <td className="py-3 font-medium text-neutral-900">{prescription.medicationName}</td>
                      <td className="py-3 text-neutral-700">{prescription.dosage}</td>
                      <td className="py-3 text-neutral-700">{prescription.frequency}</td>
                      <td className="py-3 text-neutral-700">{prescription.prescribedByName}</td>
                      <td className="py-3 text-neutral-500">
                        {new Date(prescription.prescribedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3">
                        <PrescriptionStatusBadge status={prescription.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {record.prescriptions.map((prescription) => (
                <div key={prescription.id} className="space-y-1.5 rounded-lg bg-neutral-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-900">{prescription.medicationName}</p>
                    <PrescriptionStatusBadge status={prescription.status} />
                  </div>
                  <p className="text-xs text-neutral-500">
                    {prescription.dosage} · {prescription.frequency}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {prescription.prescribedByName} ·{" "}
                    {new Date(prescription.prescribedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Recommended Follow-up */}
        {record.status === RecordStatus.RequiresFollowUp && (
          <SectionCard
            icon={CalendarDays}
            title="Recommended Follow-up"
            iconColor="text-secondary-700"
            right={
              <Link
                to="/appointments"
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                Book Appointment &rarr;
              </Link>
            }
          >
            <p className="text-sm text-neutral-700">
              This record requires follow-up. Please schedule a follow-up appointment with the patient.
            </p>
          </SectionCard>
        )}

        {/* Attachments */}
        {record.attachments.length > 0 && (
          <SectionCard
            icon={Paperclip}
            title="Attachments"
            right={
              <button className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50">
                <Download className="h-3.5 w-3.5" />
                Upload
              </button>
            }
          >
            <div className="space-y-2">
              {record.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.storageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={clsxMerge(
                    "flex items-center gap-3 rounded-lg p-3",
                    "transition-colors hover:bg-neutral-50"
                  )}
                >
                  {getAttachmentIcon(attachment.contentType)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">{attachment.fileName}</p>
                    <p className="text-xs text-neutral-500">
                      {attachment.fileSizeFormatted} · {new Date(attachment.uploadedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="h-9 w-9 flex-shrink-0 rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Download className="mx-auto h-4 w-4" />
                  </button>
                </a>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
