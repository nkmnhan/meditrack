import { useId, useRef, useState } from "react";
import {
  Search,
  X,
  FileX,
  Loader2,
  ChevronDown,
  FilePlus,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useMedicalRecordsSearch } from "../hooks/useMedicalRecordsSearch";
import { MedicalRecordList } from "./MedicalRecordList";
import { DiagnosisSeverity, RecordStatus } from "../types";
import type { MedicalRecordListItem } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";

/* ── Constants ── */

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

interface Icd10Entry {
  readonly code: string;
  readonly description: string;
}

const COMMON_ICD10_CODES: Icd10Entry[] = [
  { code: "R51.9", description: "Headache, unspecified" },
  { code: "J06.9", description: "Acute upper respiratory infection, unspecified" },
  { code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
  { code: "I10", description: "Essential (primary) hypertension" },
  { code: "M54.5", description: "Low back pain" },
  { code: "J45.909", description: "Unspecified asthma, uncomplicated" },
  { code: "F41.1", description: "Generalized anxiety disorder" },
  { code: "F32.9", description: "Major depressive disorder, single episode, unspecified" },
  { code: "K21.0", description: "Gastro-esophageal reflux disease with esophagitis" },
  { code: "N39.0", description: "Urinary tract infection, site not specified" },
  { code: "J02.9", description: "Acute pharyngitis, unspecified" },
  { code: "R10.9", description: "Unspecified abdominal pain" },
  { code: "R05.9", description: "Cough, unspecified" },
  { code: "B34.9", description: "Viral infection, unspecified" },
  { code: "R50.9", description: "Fever, unspecified" },
  { code: "G43.909", description: "Migraine, unspecified, not intractable" },
  { code: "J18.9", description: "Pneumonia, unspecified organism" },
  { code: "L30.9", description: "Dermatitis, unspecified" },
  { code: "R11.2", description: "Nausea with vomiting, unspecified" },
  { code: "M25.50", description: "Pain in unspecified joint" },
  { code: "R07.9", description: "Chest pain, unspecified" },
  { code: "E78.5", description: "Hyperlipidemia, unspecified" },
  { code: "K59.00", description: "Constipation, unspecified" },
  { code: "H66.90", description: "Otitis media, unspecified" },
  { code: "R42", description: "Dizziness and giddiness" },
  { code: "J20.9", description: "Acute bronchitis, unspecified" },
  { code: "L50.9", description: "Urticaria, unspecified" },
  { code: "R53.83", description: "Other fatigue" },
  { code: "S93.40", description: "Sprain of unspecified ligament of ankle" },
];

const MAX_ICD10_VISIBLE = 8;

interface DatePreset {
  readonly label: string;
  readonly days: number | null;
}

const DATE_PRESETS: DatePreset[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: null },
];

/* ── Helpers ── */

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getPresetDateRange(days: number | null): { fromDate: string; toDate: string } {
  if (days === null) {
    return { fromDate: "", toDate: "" };
  }
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  return {
    fromDate: formatDateForInput(fromDate),
    toDate: formatDateForInput(toDate),
  };
}

function isRecordMatchingFullTextSearch(record: MedicalRecordListItem, query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return (
    record.chiefComplaint.toLowerCase().includes(lowerQuery) ||
    record.diagnosisDescription.toLowerCase().includes(lowerQuery) ||
    record.diagnosisCode.toLowerCase().includes(lowerQuery)
  );
}

function isRecordMatchingDateRange(
  record: MedicalRecordListItem,
  fromDate: string,
  toDate: string
): boolean {
  if (!fromDate && !toDate) return true;
  const recordDate = new Date(record.recordedAt);
  if (fromDate) {
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    if (recordDate < from) return false;
  }
  if (toDate) {
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    if (recordDate > to) return false;
  }
  return true;
}

function simulateExport(format: "csv" | "pdf", recordCount: number) {
  const formatLabel = format === "csv" ? "CSV" : "PDF";
  toast.info(`Exporting ${recordCount} record${recordCount === 1 ? "" : "s"} as ${formatLabel}...`);
  setTimeout(() => {
    toast.success(`Export complete - ${recordCount} record${recordCount === 1 ? "" : "s"} exported as ${formatLabel}`);
  }, 1500);
}

/* ── Component ── */

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

  // Date range filter state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Full-text search state
  const [fullTextSearchTerm, setFullTextSearchTerm] = useState("");

  // ICD-10 filter state
  const [selectedIcd10, setSelectedIcd10] = useState<Icd10Entry | null>(null);
  const [icd10SearchQuery, setIcd10SearchQuery] = useState("");
  const [isIcd10DropdownOpen, setIsIcd10DropdownOpen] = useState(false);
  const icd10ContainerRef = useRef<HTMLDivElement>(null);

  // Export dropdown state
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportContainerRef = useRef<HTMLDivElement>(null);

  const listboxId = useId();
  const icd10ListboxId = useId();
  const isDropdownVisible = isPatientDropdownOpen && patientSearchTerm.length >= 2 && !selectedPatient;
  const hasResults = !isSearchingPatients && patientResults.length > 0;

  const activeDescendantId =
    isDropdownVisible && hasResults && highlightedIndex >= 0 && highlightedIndex < patientResults.length
      ? `${listboxId}-option-${highlightedIndex}`
      : undefined;

  // ICD-10 filtered results
  const filteredIcd10Codes =
    icd10SearchQuery.length >= 1
      ? COMMON_ICD10_CODES.filter((entry) => {
          const lowerQuery = icd10SearchQuery.toLowerCase();
          return (
            entry.code.toLowerCase().includes(lowerQuery) ||
            entry.description.toLowerCase().includes(lowerQuery)
          );
        }).slice(0, MAX_ICD10_VISIBLE)
      : COMMON_ICD10_CODES.slice(0, MAX_ICD10_VISIBLE);

  // Client-side filtering: status + severity + date range + full-text + ICD-10
  const filteredRecords = records.filter((record) => {
    const isMatchingStatus = statusFilter === "all" || record.status === statusFilter;
    const isMatchingSeverity = severityFilter === "all" || record.severity === severityFilter;
    const isMatchingDateRange = isRecordMatchingDateRange(record, fromDate, toDate);
    const isMatchingFullText =
      fullTextSearchTerm.trim() === "" || isRecordMatchingFullTextSearch(record, fullTextSearchTerm);
    const isMatchingIcd10 = !selectedIcd10 || record.diagnosisCode === selectedIcd10.code;
    return isMatchingStatus && isMatchingSeverity && isMatchingDateRange && isMatchingFullText && isMatchingIcd10;
  });

  // Active filter chips
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
  if (fromDate || toDate) {
    const dateLabel = fromDate && toDate
      ? `Date: ${fromDate} - ${toDate}`
      : fromDate
        ? `Date: from ${fromDate}`
        : `Date: until ${toDate}`;
    activeFilters.push({
      label: dateLabel,
      onClear: () => {
        setFromDate("");
        setToDate("");
      },
    });
  }
  if (fullTextSearchTerm.trim()) {
    activeFilters.push({
      label: `Search: "${fullTextSearchTerm}"`,
      onClear: () => setFullTextSearchTerm(""),
    });
  }
  if (selectedIcd10) {
    activeFilters.push({
      label: `ICD-10: ${selectedIcd10.code} - ${selectedIcd10.description}`,
      onClear: () => {
        setSelectedIcd10(null);
        setIcd10SearchQuery("");
      },
    });
  }

  function handleDatePresetClick(preset: DatePreset) {
    const { fromDate: presetFrom, toDate: presetTo } = getPresetDateRange(preset.days);
    setFromDate(presetFrom);
    setToDate(presetTo);
  }

  function handleIcd10Select(entry: Icd10Entry) {
    setSelectedIcd10(entry);
    setIcd10SearchQuery("");
    setIsIcd10DropdownOpen(false);
  }

  function handleClearIcd10() {
    setSelectedIcd10(null);
    setIcd10SearchQuery("");
    setIsIcd10DropdownOpen(false);
  }

  function handleExportClick(format: "csv" | "pdf") {
    setIsExportDropdownOpen(false);
    simulateExport(format, filteredRecords.length);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Medical Records" },
        ]}
      />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Medical Records</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search for a patient to view their medical records
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export button */}
          {selectedPatient && records.length > 0 && (
            <div className="relative" ref={exportContainerRef}>
              <button
                type="button"
                onClick={() => setIsExportDropdownOpen((previous) => !previous)}
                disabled={filteredRecords.length === 0}
                title={`Export ${filteredRecords.length} record${filteredRecords.length === 1 ? "" : "s"}`}
                className={clsxMerge(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground/80",
                  "transition-colors hover:bg-muted",
                  "disabled:cursor-not-allowed disabled:opacity-40"
                )}
              >
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {isExportDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsExportDropdownOpen(false)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setIsExportDropdownOpen(false);
                    }}
                    role="presentation"
                  />
                  <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-border bg-card py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => handleExportClick("csv")}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-foreground/80 hover:bg-muted"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-success-600" />
                      Export as CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportClick("pdf")}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-foreground/80 hover:bg-muted"
                    >
                      <FileText className="h-4 w-4 text-error-600" />
                      Export as PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <FilePlus className="h-4 w-4" /> New Record
          </button>
        </div>
      </div>

      {/* Patient search */}
      <div className="relative w-full sm:max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
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
              "w-full h-10 rounded-lg border border-border pl-9 pr-9 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              "transition-colors"
            )}
          />
          {patientSearchTerm && (
            <button
              type="button"
              onClick={handleClearSelection}
              aria-label="Clear patient search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Patient search dropdown */}
        {isDropdownVisible && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
            {isSearchingPatients && (
              <div role="status" className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}

            {!isSearchingPatients && patientResults.length === 0 && (
              <div role="status" className="px-4 py-3 text-sm text-muted-foreground">
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
                      "hover:bg-muted",
                      index === highlightedIndex && "bg-muted"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">
                        {patient.fullName}
                      </p>
                      <p className="text-muted-foreground truncate">
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
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
          {/* Full-text search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="text"
              value={fullTextSearchTerm}
              onChange={(event) => setFullTextSearchTerm(event.target.value)}
              placeholder="Search by diagnosis, ICD code, chief complaint..."
              aria-label="Search records by diagnosis, ICD code, or chief complaint"
              className={clsxMerge(
                "w-full h-10 rounded-lg border border-border pl-9 pr-9 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                "transition-colors"
              )}
            />
            {fullTextSearchTerm && (
              <button
                type="button"
                onClick={() => setFullTextSearchTerm("")}
                aria-label="Clear record search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter row: status, severity, ICD-10 */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as RecordStatus | "all")}
                className="h-10 pl-3 pr-8 rounded-md border border-border text-sm text-foreground/80 appearance-none bg-card focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
              >
                <option value="all">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* Severity filter */}
            <div className="relative">
              <select
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value as DiagnosisSeverity | "all")}
                className="h-10 pl-3 pr-8 rounded-md border border-border text-sm text-foreground/80 appearance-none bg-card focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
              >
                <option value="all">All Severities</option>
                {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* ICD-10 filter */}
            <div className="relative" ref={icd10ContainerRef}>
              {selectedIcd10 ? (
                <span className="inline-flex h-10 items-center gap-1.5 rounded-md border border-primary-200 bg-primary-50 px-3 text-sm font-medium text-primary-700">
                  <span className="font-mono">{selectedIcd10.code}</span>
                  <span className="hidden sm:inline text-primary-600">- {selectedIcd10.description}</span>
                  <button
                    type="button"
                    onClick={handleClearIcd10}
                    className="ml-1 rounded-full p-0.5 hover:bg-primary-100 transition-colors"
                    aria-label={`Remove ICD-10 filter: ${selectedIcd10.code}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : (
                <>
                  <input
                    type="text"
                    value={icd10SearchQuery}
                    onChange={(event) => {
                      setIcd10SearchQuery(event.target.value);
                      setIsIcd10DropdownOpen(true);
                    }}
                    onFocus={() => setIsIcd10DropdownOpen(true)}
                    onBlur={() => {
                      setTimeout(() => setIsIcd10DropdownOpen(false), 200);
                    }}
                    placeholder="Filter by ICD-10..."
                    aria-label="Search ICD-10 codes"
                    aria-controls={isIcd10DropdownOpen ? icd10ListboxId : undefined}
                    aria-expanded={isIcd10DropdownOpen}
                    role="combobox"
                    aria-autocomplete="list"
                    className="h-10 w-full sm:w-52 pl-3 pr-8 rounded-md border border-border text-sm text-foreground/80 bg-card focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                  />
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  {isIcd10DropdownOpen && filteredIcd10Codes.length > 0 && (
                    <ul
                      id={icd10ListboxId}
                      role="listbox"
                      aria-label="ICD-10 code suggestions"
                      className="absolute z-20 mt-1 max-h-60 w-full sm:w-80 overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg"
                    >
                      {filteredIcd10Codes.map((entry) => (
                        <li
                          key={entry.code}
                          role="option"
                          aria-selected={false}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleIcd10Select(entry);
                          }}
                          className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                        >
                          <span className="font-mono text-xs font-medium text-foreground">
                            {entry.code}
                          </span>
                          <span className="text-muted-foreground truncate">
                            {entry.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <p className="self-center sm:ml-auto text-sm text-muted-foreground">
              {filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"}
            </p>
          </div>

          {/* Date range filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <CalendarDays className="hidden sm:block h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-10 shrink-0">From</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="h-9 rounded-md border border-border px-2 text-sm text-foreground/80 bg-card focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-10 shrink-0">To</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="h-9 rounded-md border border-border px-2 text-sm text-foreground/80 bg-card focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleDatePresetClick(preset)}
                  className={clsxMerge(
                    "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
                    preset.days === null && !fromDate && !toDate
                      ? "border-primary-300 bg-primary-50 text-primary-700"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <span
                  key={filter.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground/80"
                >
                  {filter.label}
                  <button
                    onClick={filter.onClear}
                    className="rounded-full p-0.5 hover:bg-muted transition-colors"
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
        <MedicalRecordList
          records={filteredRecords}
          isLoading={isLoadingRecords}
          searchHighlight={fullTextSearchTerm}
        />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] rounded-lg border border-border bg-card p-6">
          <FileX className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold text-foreground/80">Search for a Patient</h2>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
            Type a patient's name above to search and view their medical records.
          </p>
        </div>
      )}
    </div>
  );
}
