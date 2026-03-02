import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Archive,
  Stethoscope,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import type { MedicalRecordListItem } from "../types";
import { DiagnosisSeverity, RecordStatus } from "../types";
import { SeverityBadge, StatusBadge } from "./MedicalRecordBadges";
import { clsxMerge } from "@/shared/utils/clsxMerge";

/* ── Severity left border colors ── */

const SEVERITY_LEFT_BORDER: Record<string, string> = {
  [DiagnosisSeverity.Critical]: "border-l-error-500",
  [DiagnosisSeverity.Severe]: "border-l-warning-700",
  [DiagnosisSeverity.Moderate]: "border-l-warning-500",
  [DiagnosisSeverity.Mild]: "border-l-primary-700",
};

/* ── Pagination ── */

const PAGE_SIZE = 6;

interface PaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly totalItems: number;
  readonly startIndex: number;
  readonly endIndex: number;
}

function Pagination({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  totalItems,
  startIndex,
  endIndex,
}: PaginationProps) {
  return (
    <div className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4">
      <p className="text-sm text-neutral-500">
        Showing {startIndex + 1}&ndash;{endIndex} of {totalItems}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage === 1}
          className={clsxMerge(
            "inline-flex h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 text-sm font-medium text-neutral-700",
            "transition-colors hover:bg-neutral-50",
            "disabled:cursor-not-allowed disabled:opacity-40"
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={currentPage === totalPages}
          className={clsxMerge(
            "inline-flex h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 text-sm font-medium text-neutral-700",
            "transition-colors hover:bg-neutral-50",
            "disabled:cursor-not-allowed disabled:opacity-40"
          )}
          aria-label="Next page"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Status Icon ── */

function StatusIcon({ status }: { readonly status: RecordStatus }) {
  switch (status) {
    case RecordStatus.Active:
      return <AlertCircle className="h-5 w-5 flex-shrink-0 text-info-600" />;
    case RecordStatus.RequiresFollowUp:
      return <Clock className="h-5 w-5 flex-shrink-0 text-warning-600" />;
    case RecordStatus.Resolved:
      return <CheckCircle className="h-5 w-5 flex-shrink-0 text-success-600" />;
    case RecordStatus.Archived:
      return <Archive className="h-5 w-5 flex-shrink-0 text-neutral-500" />;
  }
}

/* ── Record Card ── */

interface MedicalRecordCardProps {
  readonly record: MedicalRecordListItem;
}

function MedicalRecordCard({ record }: MedicalRecordCardProps) {
  const isAiGenerated = Boolean("origin" in record && (record as Record<string, unknown>).origin === "AI");

  return (
    <Link
      to={`/medical-records/${record.id}`}
      className={clsxMerge(
        "block rounded-lg border border-neutral-200 border-l-4 bg-white p-5",
        SEVERITY_LEFT_BORDER[record.severity] ?? "border-l-neutral-300",
        "transition-all hover:-translate-y-0.5 hover:shadow-md"
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        {/* Left: Record Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={record.status} />
            <span className="text-base font-semibold text-neutral-900">
              {record.chiefComplaint}
            </span>
            {record.diagnosisCode && (
              <span className="inline-flex items-center rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-xs text-neutral-500">
                {record.diagnosisCode}
              </span>
            )}
            {isAiGenerated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700">
                <Sparkles className="h-3 w-3" /> Clara AI
              </span>
            )}
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Stethoscope className="h-4 w-4 flex-shrink-0 text-neutral-500" />
              <span>{record.recordedByDoctorName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Calendar className="h-4 w-4 flex-shrink-0 text-neutral-500" />
              <span>
                {new Date(record.recordedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Badges + Chevron */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <StatusBadge status={record.status} />
          <SeverityBadge severity={record.severity} />
          <ChevronRight className="h-5 w-5 text-neutral-300" />
        </div>
      </div>
    </Link>
  );
}

/* ── MedicalRecordList ── */

interface MedicalRecordListProps {
  readonly records: MedicalRecordListItem[];
  readonly isLoading?: boolean;
}

export function MedicalRecordList({ records, isLoading }: MedicalRecordListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-700 border-r-transparent" />
          <p className="mt-4 text-neutral-600">Loading medical records...</p>
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <FileText className="h-12 w-12 text-neutral-400" />
        <p className="mt-4 text-neutral-600">No medical records found</p>
      </div>
    );
  }

  const totalItems = records.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const visibleRecords = records.slice(startIndex, endIndex);

  return (
    <>
      <div className="space-y-3">
        {visibleRecords.map((record) => (
          <MedicalRecordCard key={record.id} record={record} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
          onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
        />
      )}
    </>
  );
}
