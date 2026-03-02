import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  FileText,
  Calendar,
  User,
  Activity,
  Pill,
  FileBarChart,
  Paperclip,
  ArrowLeft,
  MoreVertical,
  CheckCircle,
  Clock,
  Archive,
  Loader2,
} from "lucide-react";
import type { MedicalRecordResponse } from "../types";
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

interface MedicalRecordDetailProps {
  readonly record: MedicalRecordResponse;
}

export function MedicalRecordDetail({ record }: MedicalRecordDetailProps) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className={clsxMerge(
              "h-10 w-10 rounded-lg",
              "flex items-center justify-center",
              "border border-neutral-200",
              "hover:bg-neutral-50",
              "transition-colors duration-200"
            )}
          >
            <ArrowLeft className="h-5 w-5 text-neutral-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Medical Record</h1>
            <p className="text-sm text-neutral-600 mt-1">
              {new Date(record.recordedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {isMedicalStaff && record.status !== RecordStatus.Archived && (
          <div className="relative" ref={actionsRef}>
            <button
              onClick={() => setShowActions(!showActions)}
              className={clsxMerge(
                "h-10 px-4 rounded-lg",
                "flex items-center gap-2",
                "border border-neutral-200 bg-white",
                "hover:bg-neutral-50",
                "transition-colors duration-200"
              )}
            >
              <MoreVertical className="h-5 w-5" />
              <span className="text-sm font-medium">Actions</span>
            </button>

            {showActions && (
              <div
                className={clsxMerge(
                  "absolute right-0 mt-2 w-48",
                  "bg-white rounded-lg border border-neutral-200 shadow-lg",
                  "z-10"
                )}
              >
                {record.status !== RecordStatus.Resolved && (
                  <button
                    onClick={handleResolve}
                    disabled={isResolving}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-50 flex items-center gap-2"
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
                    className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-50 flex items-center gap-2"
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
                  className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-50 flex items-center gap-2 border-t border-neutral-200"
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

      {/* Main Info Card */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Chief Complaint</h2>
              <p className="text-neutral-700 mt-1">{record.chiefComplaint}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Diagnosis</h2>
              <p className="text-neutral-700 mt-1">
                <span className="font-medium">{record.diagnosisCode}</span> -{" "}
                {record.diagnosisDescription}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <SeverityBadge severity={record.severity} size="md" />
            <StatusBadge status={record.status} size="md" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
          <InfoItem
            icon={<User className="h-5 w-5" />}
            label="Provider"
            value={record.recordedByDoctorName}
          />
          <InfoItem
            icon={<Calendar className="h-5 w-5" />}
            label="Recorded"
            value={new Date(record.recordedAt).toLocaleString()}
          />
        </div>
      </div>

      {/* Clinical Notes */}
      {record.clinicalNotes.length > 0 && (
        <SectionCard
          title="Clinical Notes"
          icon={<FileText className="h-5 w-5" />}
          count={record.clinicalNotes.length}
        >
          <div className="space-y-4">
            {record.clinicalNotes.map((note) => (
              <div key={note.id} className="border-b border-neutral-200 last:border-0 pb-4 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary-700">{note.noteType}</span>
                      <span className="text-sm text-neutral-500">•</span>
                      <span className="text-sm text-neutral-600">{note.authorName}</span>
                    </div>
                    <p className="text-neutral-700 mt-2 whitespace-pre-wrap">{note.content}</p>
                  </div>
                  <span className="text-xs text-neutral-500 whitespace-nowrap">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Prescriptions */}
      {record.prescriptions.length > 0 && (
        <SectionCard
          title="Prescriptions"
          icon={<Pill className="h-5 w-5" />}
          count={record.prescriptions.length}
        >
          <div className="space-y-4">
            {record.prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="border-b border-neutral-200 last:border-0 pb-4 last:pb-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-neutral-900">{prescription.medicationName}</h4>
                    <p className="text-sm text-neutral-600 mt-1">
                      {prescription.dosage} - {prescription.frequency} for {prescription.durationDays}{" "}
                      days
                    </p>
                    {prescription.instructions && (
                      <p className="text-sm text-neutral-600 mt-1 italic">{prescription.instructions}</p>
                    )}
                    <p className="text-xs text-neutral-500 mt-2">
                      Prescribed by {prescription.prescribedByName} on{" "}
                      {new Date(prescription.prescribedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <PrescriptionStatusBadge status={prescription.status} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Vital Signs */}
      {record.vitalSigns.length > 0 && (
        <SectionCard
          title="Vital Signs"
          icon={<Activity className="h-5 w-5" />}
          count={record.vitalSigns.length}
        >
          <div className="space-y-4">
            {record.vitalSigns.map((vitals) => (
              <div key={vitals.id} className="border-b border-neutral-200 last:border-0 pb-4 last:pb-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {vitals.bloodPressureFormatted != null && (
                    <VitalItem label="Blood Pressure" value={vitals.bloodPressureFormatted} />
                  )}
                  {vitals.heartRate != null && (
                    <VitalItem label="Heart Rate" value={`${vitals.heartRate} bpm`} />
                  )}
                  {vitals.temperature != null && (
                    <VitalItem label="Temperature" value={`${vitals.temperature}°F`} />
                  )}
                  {vitals.respiratoryRate != null && (
                    <VitalItem label="Respiratory Rate" value={`${vitals.respiratoryRate} /min`} />
                  )}
                  {vitals.oxygenSaturation != null && (
                    <VitalItem label="O2 Saturation" value={`${vitals.oxygenSaturation}%`} />
                  )}
                  {vitals.weight != null && (
                    <VitalItem label="Weight" value={`${vitals.weight} lbs`} />
                  )}
                  {vitals.height != null && (
                    <VitalItem label="Height" value={`${vitals.height} in`} />
                  )}
                  {vitals.bmi != null && (
                    <VitalItem label="BMI" value={vitals.bmi.toFixed(1)} />
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-3">
                  Recorded by {vitals.recordedByName} on{" "}
                  {new Date(vitals.recordedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Attachments */}
      {record.attachments.length > 0 && (
        <SectionCard
          title="Attachments"
          icon={<Paperclip className="h-5 w-5" />}
          count={record.attachments.length}
        >
          <div className="space-y-3">
            {record.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.storageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={clsxMerge(
                  "flex items-center gap-3 p-3",
                  "rounded-lg border border-neutral-200",
                  "hover:bg-neutral-50 hover:border-primary-300",
                  "transition-all duration-200"
                )}
              >
                <FileBarChart className="h-5 w-5 text-neutral-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">{attachment.fileName}</p>
                  <p className="text-sm text-neutral-600">
                    {attachment.fileSizeFormatted} • {attachment.contentType}
                  </p>
                  {attachment.description && (
                    <p className="text-sm text-neutral-600 mt-1">{attachment.description}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// --- Sub-components ---

interface SectionCardProps {
  readonly title: string;
  readonly icon: React.ReactNode;
  readonly count: number;
  readonly children: React.ReactNode;
}

function SectionCard({ title, icon, count, children }: SectionCardProps) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      <div className="flex items-center gap-2 mb-4 border-b border-neutral-200 pb-3">
        <div className="text-primary-700">{icon}</div>
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        <span className="text-xs text-neutral-500">({count})</span>
      </div>
      {children}
    </div>
  );
}

interface InfoItemProps {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-neutral-600 mt-0.5">{icon}</div>
      <div>
        <p className="text-sm text-neutral-600">{label}</p>
        <p className="font-medium text-neutral-900">{value}</p>
      </div>
    </div>
  );
}

interface VitalItemProps {
  readonly label: string;
  readonly value: string;
}

function VitalItem({ label, value }: VitalItemProps) {
  return (
    <div className="rounded-lg bg-neutral-50 p-3">
      <p className="text-lg font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}
