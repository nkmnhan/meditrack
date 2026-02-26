import { useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Filter } from "lucide-react";
import { useGetMedicalRecordsByPatientIdQuery } from "../store/medicalRecordsApi";
import { MedicalRecordList } from "../components/MedicalRecordList";
import { RecordStatus, DiagnosisSeverity } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useRoles } from "@/shared/auth/useRoles";
import { UserRole } from "@/shared/auth/roles";

export function PatientMedicalRecordsPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { hasAnyRole } = useRoles();
  const isMedicalStaff = hasAnyRole([UserRole.Doctor, UserRole.Nurse]);

  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RecordStatus | "">("");
  const [severityFilter, setSeverityFilter] = useState<DiagnosisSeverity | "">("");

  const { data: records = [], isLoading } = useGetMedicalRecordsByPatientIdQuery(patientId!);

  // Apply filters
  const filteredRecords = records.filter((record) => {
    if (statusFilter && record.status !== statusFilter) return false;
    if (severityFilter && record.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Medical Records</h1>
          <p className="text-sm text-neutral-600 mt-1">
            {filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"} found
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsxMerge(
              "h-10 px-4 rounded-lg",
              "flex items-center gap-2",
              "border border-neutral-200 bg-white",
              "hover:bg-neutral-50",
              "transition-colors duration-200",
              showFilters && "bg-neutral-50"
            )}
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters</span>
          </button>

          {isMedicalStaff && (
            <button
              disabled
              title="Record creation form coming soon"
              className={clsxMerge(
                "h-10 px-4 rounded-lg",
                "flex items-center gap-2",
                "bg-primary-700 text-white",
                "hover:bg-primary-800",
                "transition-colors duration-200",
                "disabled:cursor-not-allowed disabled:bg-neutral-300"
              )}
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">New Record</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-neutral-200 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Filter */}
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-neutral-700 mb-2">
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RecordStatus | "")}
                className={clsxMerge(
                  "w-full h-10 px-3 rounded-lg",
                  "border border-neutral-200",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500"
                )}
              >
                <option value="">All Statuses</option>
                <option value={RecordStatus.Active}>Active</option>
                <option value={RecordStatus.RequiresFollowUp}>Follow-up Required</option>
                <option value={RecordStatus.Resolved}>Resolved</option>
                <option value={RecordStatus.Archived}>Archived</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <label htmlFor="severity-filter" className="block text-sm font-medium text-neutral-700 mb-2">
                Severity
              </label>
              <select
                id="severity-filter"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as DiagnosisSeverity | "")}
                className={clsxMerge(
                  "w-full h-10 px-3 rounded-lg",
                  "border border-neutral-200",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500"
                )}
              >
                <option value="">All Severities</option>
                <option value={DiagnosisSeverity.Mild}>Mild</option>
                <option value={DiagnosisSeverity.Moderate}>Moderate</option>
                <option value={DiagnosisSeverity.Severe}>Severe</option>
                <option value={DiagnosisSeverity.Critical}>Critical</option>
              </select>
            </div>
          </div>

          {(statusFilter || severityFilter) && (
            <button
              onClick={() => {
                setStatusFilter("");
                setSeverityFilter("");
              }}
              className="text-sm text-primary-700 hover:text-primary-800 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* List */}
      <MedicalRecordList records={filteredRecords} isLoading={isLoading} />
    </div>
  );
}
