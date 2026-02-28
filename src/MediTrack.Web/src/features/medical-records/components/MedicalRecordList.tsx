import { Link } from "react-router-dom";
import { FileText, AlertCircle, CheckCircle, Clock, Archive } from "lucide-react";
import type { MedicalRecordListItem } from "../types";
import { DiagnosisSeverity, RecordStatus } from "../types";
import { SeverityBadge, StatusBadge } from "./MedicalRecordBadges";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface MedicalRecordListProps {
  readonly records: MedicalRecordListItem[];
  readonly isLoading?: boolean;
}

export function MedicalRecordList({ records, isLoading }: MedicalRecordListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-700 border-r-transparent"></div>
          <p className="mt-4 text-neutral-600">Loading medical records...</p>
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FileText className="h-12 w-12 text-neutral-400" />
        <p className="mt-4 text-neutral-600">No medical records found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record) => (
        <MedicalRecordCard key={record.id} record={record} />
      ))}
    </div>
  );
}

interface MedicalRecordCardProps {
  readonly record: MedicalRecordListItem;
}

const SEVERITY_LEFT_BORDER: Record<string, string> = {
  [DiagnosisSeverity.Critical]: "border-l-error-500",
  [DiagnosisSeverity.Severe]: "border-l-error-300",
  [DiagnosisSeverity.Moderate]: "border-l-warning-500",
  [DiagnosisSeverity.Mild]: "border-l-success-500",
};

function MedicalRecordCard({ record }: MedicalRecordCardProps) {
  return (
    <Link
      to={`/medical-records/${record.id}`}
      className={clsxMerge(
        "block",
        "p-4 sm:p-6",
        "rounded-lg border border-neutral-200 border-l-4",
        SEVERITY_LEFT_BORDER[record.severity] ?? "border-l-neutral-300",
        "bg-white",
        "transition-all duration-200",
        "hover:shadow-md"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left side - main info */}
        <div className="flex-1 space-y-2">
          <div className="flex items-start gap-3">
            <StatusIcon status={record.status} />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-neutral-900 truncate">
                {record.chiefComplaint}
              </h3>
              <p className="text-sm text-neutral-600 mt-1">
                {record.diagnosisCode} - {record.diagnosisDescription}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
            <span>
              Provider: <span className="font-medium">{record.recordedByDoctorName}</span>
            </span>
            <span>
              {new Date(record.recordedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Right side - badges */}
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
          <SeverityBadge severity={record.severity} />
          <StatusBadge status={record.status} />
        </div>
      </div>
    </Link>
  );
}

function StatusIcon({ status }: { readonly status: RecordStatus }) {
  switch (status) {
    case RecordStatus.Active:
      return <AlertCircle className="h-5 w-5 text-info-600 flex-shrink-0" />;
    case RecordStatus.RequiresFollowUp:
      return <Clock className="h-5 w-5 text-warning-600 flex-shrink-0" />;
    case RecordStatus.Resolved:
      return <CheckCircle className="h-5 w-5 text-success-600 flex-shrink-0" />;
    case RecordStatus.Archived:
      return <Archive className="h-5 w-5 text-neutral-500 flex-shrink-0" />;
  }
}

