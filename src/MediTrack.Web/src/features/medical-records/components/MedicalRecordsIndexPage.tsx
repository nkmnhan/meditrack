import { useId, useState } from "react";
import { Search, X, FileX, Loader2, ChevronDown } from "lucide-react";
import { useMedicalRecordsSearch } from "../hooks/useMedicalRecordsSearch";
import { MedicalRecordList } from "./MedicalRecordList";
import { DiagnosisSeverity, RecordStatus } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";

const STATUS_LABELS: Record<RecordStatus, string> = {
  [RecordStatus.Active]: "Active",
  [RecordStatus.RequiresFollowUp]: "Requires Follow-up",
  [RecordStatus.Resolved]: "Resolved",
  [RecordStatus.Archived]: "Archived",
};

const SEVERITY_LABELS: Record<DiagnosisSeverity, string> = {
  [DiagnosisSeverity.Critical]: "Critical",
  [DiagnosisSeverity.Severe]: "Severe",
  [DiagnosisSeverity.Moderate]: "Moderate",
  [DiagnosisSeverity.Mild]: "Mild",
};

export function MedicalRecordsIndexPage() {
  const {
    patientSearchTerm,
    selectedPatient,
    isPatientDropdownOpen,
    setIsPatientDropdownOpen,
    highlightedIndex,
    patientResults,
    isSearchingPatients,
    records,
    isLoadingRecords,
    handleSearchTermChange,
    handlePatientSelect,
    handleClearSelection,
    handleKeyDown,
  } = useMedicalRecordsSearch();

  const [statusFilter, setStatusFilter] = useState<RecordStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<DiagnosisSeverity | "all">("all");

  const listboxId = useId();
  const isDropdownVisible = isPatientDropdownOpen && patientSearchTerm.length >= 2 && !selectedPatient;
  const hasResults = !isSearchingPatients && patientResults.length > 0;

  const activeDescendantId =
    isDropdownVisible && hasResults && highlightedIndex >= 0 && highlightedIndex < patientResults.length
      ? `${listboxId}-option-${highlightedIndex}`
      : undefined;

  const filteredRecords = records.filter((record) => {
    const isMatchingStatus = statusFilter === "all" || record.status === statusFilter;
    const isMatchingSeverity = severityFilter === "all" || record.severity === severityFilter;
    return isMatchingStatus && isMatchingSeverity;
  });

  const activeFilters: { label: string; onClear: () => void }[] = [];
  if (statusFilter !== "all") {
    activeFilters.push({
      label: `Status: ${STATUS_LABELS[statusFilter]}`,
      onClear: () => setStatusFilter("all"),
    });
  }
  if (severityFilter !== "all") {
    activeFilters.push({
      label: `Severity: ${SEVERITY_LABELS[severityFilter]}`,
      onClear: () => setSeverityFilter("all"),
    });
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Medical Records" },
        ]}
      />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Medical Records</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Search for a patient to view their medical records
          </p>
        </div>
      </div>

      {/* Patient search */}
      <div className="relative w-full sm:max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            role="combobox"
            aria-expanded={isDropdownVisible}
            aria-controls={isDropdownVisible && hasResults ? listboxId : undefined}
            aria-activedescendant={activeDescendantId}
            aria-autocomplete="list"
            aria-label="Search patients by name"
            value={patientSearchTerm}
            onChange={(event) => handleSearchTermChange(event.target.value)}
            onFocus={() => {
              if (patientSearchTerm.length >= 2 && !selectedPatient) {
                setIsPatientDropdownOpen(true);
              }
            }}
            onBlur={() => {
              setTimeout(() => setIsPatientDropdownOpen(false), 200);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search patients by name..."
            className={clsxMerge(
              "w-full h-10 rounded-lg border border-neutral-200 pl-9 pr-9 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              "transition-colors"
            )}
          />
          {patientSearchTerm && (
            <button
              type="button"
              onClick={handleClearSelection}
              aria-label="Clear patient search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Patient search dropdown */}
        {isDropdownVisible && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg">
            {isSearchingPatients && (
              <div role="status" className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}

            {!isSearchingPatients && patientResults.length === 0 && (
              <div role="status" className="px-4 py-3 text-sm text-neutral-500">
                No patients found
              </div>
            )}

            {!isSearchingPatients && patientResults.length > 0 && (
              <ul
                id={listboxId}
                role="listbox"
                aria-label="Patient search results"
                className="max-h-60 overflow-y-auto py-1"
              >
                {patientResults.map((patient, index) => (
                  <li
                    key={patient.id}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={index === highlightedIndex}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handlePatientSelect(patient);
                    }}
                    className={clsxMerge(
                      "flex cursor-pointer items-center gap-3 px-4 py-2 text-sm",
                      "hover:bg-neutral-50",
                      index === highlightedIndex && "bg-neutral-100"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-900 truncate">
                        {patient.fullName}
                      </p>
                      <p className="text-neutral-500 truncate">
                        MRN: {patient.medicalRecordNumber}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Selected patient info chip */}
      {selectedPatient && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
            {selectedPatient.fullName}
            <span className="text-primary-500">MRN: {selectedPatient.medicalRecordNumber}</span>
          </span>
        </div>
      )}

      {/* Records filter bar (only shown once patient is selected and has records) */}
      {selectedPatient && records.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as RecordStatus | "all")}
                className="h-10 pl-3 pr-8 rounded-md border border-neutral-200 text-sm text-neutral-700 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
              >
                <option value="all">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            </div>

            {/* Severity filter */}
            <div className="relative">
              <select
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value as DiagnosisSeverity | "all")}
                className="h-10 pl-3 pr-8 rounded-md border border-neutral-200 text-sm text-neutral-700 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
              >
                <option value="all">All Severities</option>
                {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            </div>

            <p className="self-center sm:ml-auto text-sm text-neutral-500">
              {filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"}
            </p>
          </div>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <span
                  key={filter.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700"
                >
                  {filter.label}
                  <button
                    onClick={filter.onClear}
                    className="rounded-full p-0.5 hover:bg-neutral-200 transition-colors"
                    aria-label={`Remove filter: ${filter.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Records list or empty state */}
      {selectedPatient ? (
        <MedicalRecordList records={filteredRecords} isLoading={isLoadingRecords} />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] rounded-lg border border-neutral-200 bg-white p-6">
          <FileX className="h-12 w-12 text-neutral-300" />
          <h2 className="mt-4 text-lg font-semibold text-neutral-700">Search for a Patient</h2>
          <p className="mt-2 text-sm text-neutral-500 text-center max-w-md">
            Type a patient's name above to search and view their medical records.
          </p>
        </div>
      )}
    </div>
  );
}
