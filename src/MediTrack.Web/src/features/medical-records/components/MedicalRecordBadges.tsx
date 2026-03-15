import { clsxMerge } from "@/shared/utils/clsxMerge";
import { DiagnosisSeverity, PrescriptionStatus, RecordStatus } from "../types";

interface SeverityBadgeProps {
  readonly severity: DiagnosisSeverity;
  readonly size?: "sm" | "md";
}

export function SeverityBadge({ severity, size = "sm" }: SeverityBadgeProps) {
  const colorStyles = {
    [DiagnosisSeverity.Mild]: "bg-success-50 text-success-700 border-success-200",
    [DiagnosisSeverity.Moderate]: "bg-warning-50 text-warning-700 border-warning-200",
    [DiagnosisSeverity.Severe]: "bg-error-50 text-error-700 border-error-200",
    [DiagnosisSeverity.Critical]: "bg-error-100 text-error-900 border-error-300",
  };

  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={clsxMerge(
        "inline-flex items-center font-medium rounded-full border",
        sizeStyles[size],
        colorStyles[severity]
      )}
    >
      {severity}
    </span>
  );
}

interface StatusBadgeProps {
  readonly status: RecordStatus;
  readonly size?: "sm" | "md";
}

const STATUS_LABELS: Record<RecordStatus, string> = {
  [RecordStatus.Active]: "Active",
  [RecordStatus.RequiresFollowUp]: "Follow-up",
  [RecordStatus.Resolved]: "Resolved",
  [RecordStatus.Archived]: "Archived",
};

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const colorStyles = {
    [RecordStatus.Active]: "bg-info-50 text-info-700 border-info-200",
    [RecordStatus.RequiresFollowUp]: "bg-warning-50 text-warning-700 border-warning-200",
    [RecordStatus.Resolved]: "bg-success-50 text-success-700 border-success-200",
    [RecordStatus.Archived]: "bg-neutral-50 text-neutral-700 border-neutral-200",
  };

  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={clsxMerge(
        "inline-flex items-center font-medium rounded-full border",
        sizeStyles[size],
        colorStyles[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

interface PrescriptionStatusBadgeProps {
  readonly status: PrescriptionStatus;
}

const PRESCRIPTION_COLOR_STYLES: Record<PrescriptionStatus, string> = {
  [PrescriptionStatus.Active]: "bg-info-50 text-info-700 border-info-200",
  [PrescriptionStatus.Filled]: "bg-success-50 text-success-700 border-success-200",
  [PrescriptionStatus.Completed]: "bg-neutral-50 text-neutral-700 border-neutral-200",
  [PrescriptionStatus.Cancelled]: "bg-error-50 text-error-700 border-error-200",
  [PrescriptionStatus.Expired]: "bg-warning-50 text-warning-700 border-warning-200",
};

export function PrescriptionStatusBadge({ status }: PrescriptionStatusBadgeProps) {
  return (
    <span
      className={clsxMerge(
        "inline-flex items-center px-2.5 py-0.5",
        "text-xs font-medium rounded-full border",
        PRESCRIPTION_COLOR_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}
