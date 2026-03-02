import { useState, useRef, useEffect } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table";
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
  // AI Origin Banner — show when the record has an origin field set to 'AI'
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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* AI Origin Banner */}
      {isAiGenerated && (
        <Card className="mb-4 border-info-500 bg-info-50">
          <CardHeader className="flex-row items-center gap-2">
            <Badge variant="outline" className="bg-info-100 text-info-700 border-info-300">
              AI Origin
            </Badge>
            <CardTitle className="text-info-700 text-base font-semibold">This record was generated or updated by Clara AI</CardTitle>
          </CardHeader>
        </Card>
      )}
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
      <Card className="space-y-6">
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
      </Card>

      {/* Clinical Notes */}
      {record.clinicalNotes.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <FileText className="h-5 w-5 text-primary-700" />
            <CardTitle>Clinical Notes <span className="text-sm text-neutral-500">({record.clinicalNotes.length})</span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {record.clinicalNotes.map((note) => (
                <div key={note.id} className="border-b border-neutral-200 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{note.noteType}</Badge>
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
          </CardContent>
        </Card>
      )}

      {/* Prescriptions as Table */}
      {record.prescriptions.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Pill className="h-5 w-5 text-primary-700" />
            <CardTitle>Prescriptions <span className="text-sm text-neutral-500">({record.prescriptions.length})</span></CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prescribed By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {record.prescriptions.map((prescription) => (
                  <TableRow key={prescription.id}>
                    <TableCell className="font-medium">{prescription.medicationName}</TableCell>
                    <TableCell>{prescription.dosage}</TableCell>
                    <TableCell>{prescription.frequency}</TableCell>
                    <TableCell>{prescription.durationDays} days</TableCell>
                    <TableCell><PrescriptionStatusBadge status={prescription.status} /></TableCell>
                    <TableCell>{prescription.prescribedByName}</TableCell>
                    <TableCell>{new Date(prescription.prescribedAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Vital Signs with Icons/Warnings */}
      {record.vitalSigns.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Activity className="h-5 w-5 text-primary-700" />
            <CardTitle>Vital Signs <span className="text-sm text-neutral-500">({record.vitalSigns.length})</span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {record.vitalSigns.map((vitals) => (
                <div key={vitals.id} className="border-b border-neutral-200 last:border-0 pb-4 last:pb-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {vitals.bloodPressureFormatted != null && (
                      <VitalItem label="Blood Pressure" value={vitals.bloodPressureFormatted} icon={<Activity className="h-4 w-4 text-info-700" />} warning={(vitals.bloodPressureSystolic != null && vitals.bloodPressureSystolic > 140) || (vitals.bloodPressureDiastolic != null && vitals.bloodPressureDiastolic > 90)} />
                    )}
                    {vitals.heartRate != null && (
                      <VitalItem label="Heart Rate" value={`${vitals.heartRate} bpm`} icon={<Activity className="h-4 w-4 text-info-700" />} warning={vitals.heartRate > 100 || vitals.heartRate < 60} />
                    )}
                    {vitals.temperature != null && (
                      <VitalItem label="Temperature" value={`${vitals.temperature}°F`} icon={<Activity className="h-4 w-4 text-info-700" />} warning={vitals.temperature > 100.4 || vitals.temperature < 97} />
                    )}
                    {vitals.respiratoryRate != null && (
                      <VitalItem label="Respiratory Rate" value={`${vitals.respiratoryRate} /min`} icon={<Activity className="h-4 w-4 text-info-700" />} warning={vitals.respiratoryRate > 20 || vitals.respiratoryRate < 12} />
                    )}
                    {vitals.oxygenSaturation != null && (
                      <VitalItem label="O2 Saturation" value={`${vitals.oxygenSaturation}%`} icon={<Activity className="h-4 w-4 text-info-700" />} warning={vitals.oxygenSaturation < 95} />
                    )}
                    {vitals.weight != null && (
                      <VitalItem label="Weight" value={`${vitals.weight} lbs`} icon={<Activity className="h-4 w-4 text-info-700" />} />
                    )}
                    {vitals.height != null && (
                      <VitalItem label="Height" value={`${vitals.height} in`} icon={<Activity className="h-4 w-4 text-info-700" />} />
                    )}
                    {vitals.bmi != null && (
                      <VitalItem label="BMI" value={vitals.bmi.toFixed(1)} icon={<Activity className="h-4 w-4 text-info-700" />} warning={vitals.bmi > 30 || vitals.bmi < 18.5} />
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-3">
                    Recorded by {vitals.recordedByName} on {new Date(vitals.recordedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments with Icons */}
      {record.attachments.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Paperclip className="h-5 w-5 text-primary-700" />
            <CardTitle>Attachments <span className="text-sm text-neutral-500">({record.attachments.length})</span></CardTitle>
          </CardHeader>
          <CardContent>
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
                  {/* Icon by file type */}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Sub-components ---

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
  readonly icon?: React.ReactNode;
  readonly warning?: boolean;
}

function VitalItem({ label, value, icon, warning }: VitalItemProps) {
  return (
    <div>
      <div className="flex items-center gap-1">
        {icon}
        <p className={clsxMerge("text-xs", warning ? "text-error-600 font-semibold" : "text-neutral-600")}>{label}</p>
      </div>
      <p className={clsxMerge("text-sm font-medium", warning ? "text-error-700" : "text-neutral-900")}>{value}</p>
    </div>
  );
}
