import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search, UserPlus, AlertCircle, ChevronLeft, ChevronRight, ChevronDown,
  Hash, Calendar, Phone, Mail, UserX, CircleDot, CalendarCheck, Sparkles,
  LayoutGrid, List, Download, MessageSquare, CheckSquare, Square, Clock,
} from "lucide-react";
import { useGetPatientsQuery, useLazySearchPatientsQuery } from "../store/patientApi";
import type { PatientListItem } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components/Breadcrumb";
import { NaturalLanguageSearch, type ParsedFilters } from "./NaturalLanguageSearch";

const PAGE_SIZE = 6;

const AVATAR_COLORS = [
  "bg-primary-100 text-primary-700",
  "bg-success-100 text-success-700",
  "bg-error-100 text-error-700",
  "bg-warning-100 text-warning-700",
  "bg-accent-100 text-accent-700",
  "bg-info-100 text-info-700",
  "bg-secondary-100 text-secondary-700",
] as const;

function getAvatarColor(patientId: string): string {
  let hash = 0;
  for (let index = 0; index < patientId.length; index++) {
    hash = ((hash << 5) - hash + patientId.charCodeAt(index)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/dashboard" },
  { label: "Patients" },
];

type ViewMode = "grid" | "list";

const VIEW_MODE_STORAGE_KEY = "meditrack-patient-view-mode";

function getStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored === "grid" || stored === "list") return stored;
  } catch {
    // localStorage may not be available
  }
  return "grid";
}

function storeViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // Silently fail if localStorage is not available
  }
}

/* ── Demo data enrichment ── */

/**
 * Enriches PatientListItem with demo flags for risk/alert badges and last visit dates.
 * In production, these would come from the backend. For now, we assign them
 * deterministically based on patient ID hash so the demo is consistent.
 */
function enrichWithDemoData(patients: PatientListItem[]): PatientListItem[] {
  return patients.map((patient, index) => {
    // Use a simple hash to deterministically assign demo flags
    let idHash = 0;
    for (let charIndex = 0; charIndex < patient.id.length; charIndex++) {
      idHash = ((idHash << 5) - idHash + patient.id.charCodeAt(charIndex)) | 0;
    }
    const absHash = Math.abs(idHash);

    // Assign demo flags to roughly: 15% critical, 25% appointment today, 10% Clara session
    const isCritical = patient.isCritical ?? (absHash % 7 === 0);
    const hasAppointmentToday = patient.hasAppointmentToday ?? (absHash % 4 === 0);
    const hasClaraSession = patient.hasClaraSession ?? (absHash % 10 === 0);

    // Demo last visit: between 1 and 30 days ago, deterministic per patient
    const daysAgo = (absHash % 30) + 1;
    const lastVisit = new Date();
    lastVisit.setDate(lastVisit.getDate() - daysAgo);
    const lastVisitDate = patient.lastVisitDate ?? lastVisit.toISOString();

    // Demo diagnosis tags and medications for NLP filter testing
    const demoDiagnoses: string[][] = [
      ["diabetes", "hypertension"],
      ["asthma"],
      ["cardiac"],
      ["diabetes"],
      [],
      ["hypertension"],
      ["copd", "diabetes"],
      [],
      ["epilepsy"],
      ["thyroid"],
    ];
    const demoMedications: string[][] = [
      ["metformin", "lisinopril"],
      ["albuterol"],
      ["metoprolol", "aspirin"],
      ["insulin"],
      [],
      ["amlodipine"],
      ["metformin"],
      [],
      ["levothyroxine"],
      ["losartan"],
    ];
    const demoBloodTypes = ["A+", "B+", "O+", "AB+", "A-", "O-", "B-", "AB-", "O+", "A+"];

    return {
      ...patient,
      isCritical,
      hasAppointmentToday,
      hasClaraSession,
      lastVisitDate,
      diagnosisTags: patient.diagnosisTags ?? demoDiagnoses[index % demoDiagnoses.length],
      medications: patient.medications ?? demoMedications[index % demoMedications.length],
      bloodType: patient.bloodType ?? demoBloodTypes[index % demoBloodTypes.length],
    };
  });
}

/* ── Format helpers ── */

function formatLastVisitDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDOB(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ── Risk/Alert Badges ── */

function PatientBadges({ patient }: { readonly patient: PatientListItem }) {
  const hasBadges = patient.isCritical || patient.hasAppointmentToday || patient.hasClaraSession;
  if (!hasBadges) return null;

  return (
    <div className="flex items-center gap-1.5">
      {patient.isCritical && (
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-error-100"
          title="Critical/Urgent"
        >
          <CircleDot className="h-3 w-3 text-error-600" />
        </span>
      )}
      {patient.hasAppointmentToday && (
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-info-100"
          title="Appointment today"
        >
          <CalendarCheck className="h-3 w-3 text-info-600" />
        </span>
      )}
      {patient.hasClaraSession && (
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-100"
          title="Active Clara session"
        >
          <Sparkles className="h-3 w-3 text-accent-600" />
        </span>
      )}
    </div>
  );
}

/* ── Skeleton ── */

function PatientListSkeleton({ viewMode }: { readonly viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {Array.from({ length: PAGE_SIZE }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: PAGE_SIZE }).map((_, index) => (
        <div key={index} className="h-56 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

/* ── Patient Card (Grid View) ── */

interface PatientCardProps {
  readonly patient: PatientListItem;
  readonly isSelected: boolean;
  readonly onToggleSelect: (patientId: string) => void;
}

function PatientCard({ patient, isSelected, onToggleSelect }: PatientCardProps) {
  const formattedDOB = formatDOB(patient.dateOfBirth);

  const nameParts = patient.fullName.split(" ");
  const initials = nameParts.length >= 2
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
    : patient.fullName.slice(0, 2);

  const lastVisitFormatted = patient.lastVisitDate
    ? formatLastVisitDate(patient.lastVisitDate)
    : null;

  return (
    <div
      className={clsxMerge(
        "relative rounded-lg border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        isSelected ? "border-primary-400 ring-2 ring-primary-200" : "border-border"
      )}
    >
      {/* Selection checkbox — top-right */}
      <button
        type="button"
        onClick={() => onToggleSelect(patient.id)}
        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-muted"
        aria-label={isSelected ? `Deselect ${patient.fullName}` : `Select ${patient.fullName}`}
      >
        {isSelected ? (
          <CheckSquare className="h-4 w-4 text-primary-700" />
        ) : (
          <Square className="h-4 w-4 text-muted-foreground/70" />
        )}
      </button>

      {/* Top: avatar + name + status + badges */}
      <div className="mb-4 flex items-center gap-3 pr-6">
        <div className={clsxMerge("flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold", getAvatarColor(patient.id))}>
          {initials.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{patient.fullName}</p>
          <PatientBadges patient={patient} />
        </div>
        <span
          className={clsxMerge(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            patient.isActive
              ? "border border-success-500/30 bg-success-50 text-success-700"
              : "bg-muted text-muted-foreground"
          )}
        >
          {patient.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Info rows */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-foreground/80">
          <Hash className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="font-mono">{patient.medicalRecordNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground/80">
          <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span>{formattedDOB} <span className="text-muted-foreground">({patient.age} years)</span></span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground/80">
          <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span>{patient.phoneNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground/80">
          <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="truncate">{patient.email}</span>
        </div>

        {/* Last Visit */}
        {lastVisitFormatted && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
            <span>Last Visit: {lastVisitFormatted}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex justify-end border-t border-border pt-3">
        <Link to={`/patients/${patient.id}`} className="text-sm font-medium text-primary-700 hover:underline">
          View Details &rarr;
        </Link>
      </div>
    </div>
  );
}

/* ── Patient Row (List View) ── */

function PatientRow({ patient, isSelected, onToggleSelect }: PatientCardProps) {
  const formattedDOB = formatDOB(patient.dateOfBirth);
  const lastVisitFormatted = patient.lastVisitDate
    ? formatLastVisitDate(patient.lastVisitDate)
    : "N/A";

  return (
    <div
      className={clsxMerge(
        "flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-shadow hover:shadow-sm",
        isSelected ? "border-primary-400 ring-2 ring-primary-200" : "border-border"
      )}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onToggleSelect(patient.id)}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded transition-colors hover:bg-muted"
        aria-label={isSelected ? `Deselect ${patient.fullName}` : `Select ${patient.fullName}`}
      >
        {isSelected ? (
          <CheckSquare className="h-4 w-4 text-primary-700" />
        ) : (
          <Square className="h-4 w-4 text-muted-foreground/70" />
        )}
      </button>

      {/* Name + badges */}
      <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
        <Link to={`/patients/${patient.id}`} className="truncate text-sm font-semibold text-foreground hover:text-primary-700 hover:underline">
          {patient.fullName}
        </Link>
        <PatientBadges patient={patient} />
      </div>

      {/* MRN */}
      <span className="hidden text-sm font-mono text-foreground/80 md:block md:w-28">
        {patient.medicalRecordNumber}
      </span>

      {/* DOB */}
      <span className="hidden text-sm text-foreground/80 lg:block lg:w-36">
        {formattedDOB}
      </span>

      {/* Phone */}
      <span className="hidden text-sm text-foreground/80 md:block md:w-32">
        {patient.phoneNumber}
      </span>

      {/* Status */}
      <span
        className={clsxMerge(
          "hidden items-center rounded-full px-2 py-0.5 text-xs font-medium sm:inline-flex",
          patient.isActive
            ? "border border-success-500/30 bg-success-50 text-success-700"
            : "bg-muted text-muted-foreground"
        )}
      >
        {patient.isActive ? "Active" : "Inactive"}
      </span>

      {/* Last Visit */}
      <span className="hidden text-sm text-muted-foreground lg:block lg:w-32">
        {lastVisitFormatted}
      </span>

      {/* View link */}
      <Link
        to={`/patients/${patient.id}`}
        className="ml-auto flex-shrink-0 text-sm font-medium text-primary-700 hover:underline"
      >
        View &rarr;
      </Link>
    </div>
  );
}

/* ── Bulk Action Bar ── */

interface BulkActionBarProps {
  readonly selectedCount: number;
  readonly onClearSelection: () => void;
}

function BulkActionBar({ selectedCount, onClearSelection }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 py-3 shadow-lg sm:bottom-4 sm:left-1/2 sm:right-auto sm:max-w-lg sm:-translate-x-1/2 sm:rounded-lg sm:border sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">
          {selectedCount} selected
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={clsxMerge(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-3",
              "border border-border bg-card text-sm font-medium text-foreground/80",
              "transition-colors hover:bg-muted"
            )}
            aria-label="Export selected patients"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            type="button"
            className={clsxMerge(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-3",
              "border border-border bg-card text-sm font-medium text-foreground/80",
              "transition-colors hover:bg-muted"
            )}
            aria-label="Send message to selected patients"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Message</span>
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground/80"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── View Mode Toggle ── */

interface ViewModeToggleProps {
  readonly viewMode: ViewMode;
  readonly onViewModeChange: (mode: ViewMode) => void;
}

function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-border">
      <button
        type="button"
        onClick={() => onViewModeChange("grid")}
        className={clsxMerge(
          "inline-flex h-9 w-9 items-center justify-center rounded-l-md transition-colors",
          viewMode === "grid"
            ? "bg-primary-700 text-white"
            : "bg-card text-muted-foreground hover:bg-muted"
        )}
        aria-label="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("list")}
        className={clsxMerge(
          "inline-flex h-9 w-9 items-center justify-center rounded-r-md border-l border-border transition-colors",
          viewMode === "list"
            ? "bg-primary-700 text-white"
            : "bg-card text-muted-foreground hover:bg-muted"
        )}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ── Pagination ── */

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
    <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">
        Showing {startIndex + 1}&ndash;{endIndex} of {totalItems}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage === 1}
          className={clsxMerge(
            "inline-flex h-10 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium text-foreground/80",
            "transition-colors hover:bg-muted",
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
            "inline-flex h-10 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium text-foreground/80",
            "transition-colors hover:bg-muted",
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

/* ── List View Header ── */

interface ListHeaderProps {
  readonly isAllSelected: boolean;
  readonly onToggleSelectAll: () => void;
}

function ListHeader({ isAllSelected, onToggleSelectAll }: ListHeaderProps) {
  return (
    <div className="mb-2 flex items-center gap-3 rounded-lg bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <button
        type="button"
        onClick={onToggleSelectAll}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded transition-colors hover:bg-muted"
        aria-label={isAllSelected ? "Deselect all" : "Select all"}
      >
        {isAllSelected ? (
          <CheckSquare className="h-4 w-4 text-primary-700" />
        ) : (
          <Square className="h-4 w-4 text-muted-foreground/70" />
        )}
      </button>
      <span className="flex-1 sm:w-40 sm:flex-none">Name</span>
      <span className="hidden md:block md:w-28">MRN</span>
      <span className="hidden lg:block lg:w-36">Date of Birth</span>
      <span className="hidden md:block md:w-32">Phone</span>
      <span className="hidden sm:block sm:w-16">Status</span>
      <span className="hidden lg:block lg:w-32">Last Visit</span>
      <span className="ml-auto w-14" />
    </div>
  );
}

/* ── PatientList ── */

export function PatientList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [nlpFilters, setNlpFilters] = useState<ParsedFilters | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<string>>(new Set());

  const {
    data: allPatients,
    isLoading: isLoadingAll,
    error: errorAll,
  } = useGetPatientsQuery({ includeInactive: statusFilter === "inactive" });

  const [triggerSearch, { data: searchResults, isLoading: isSearching, error: searchError }] =
    useLazySearchPatientsQuery();

  const handleClearSearch = () => {
    setSearchTerm("");
    setIsSearchActive(false);
    setCurrentPage(1);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    storeViewMode(mode);
  };

  const handleToggleSelect = (patientId: string) => {
    setSelectedPatientIds((previous) => {
      const next = new Set(previous);
      if (next.has(patientId)) {
        next.delete(patientId);
      } else {
        next.add(patientId);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedPatientIds(new Set());
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedPatientIds(new Set());
  }, [statusFilter, nlpFilters, isSearchActive]);

  const patients = isSearchActive ? searchResults : allPatients;
  const isLoading = isSearchActive ? isSearching : isLoadingAll;
  const error = isSearchActive ? searchError : errorAll;

  // Enrich with demo data for badges / last visit / diagnosis / medications
  const enrichedPatients = patients ? enrichWithDemoData(patients) : undefined;

  // Client-side status filter (when not searching)
  const statusFilteredPatients = enrichedPatients?.filter((patient) => {
    if (statusFilter === "all") return true;
    return statusFilter === "active" ? patient.isActive : !patient.isActive;
  });

  // Apply NLP filters on top of status filter
  const filteredPatients = nlpFilters
    ? statusFilteredPatients?.filter((patient) => {
        if (nlpFilters.gender && patient.gender.toLowerCase() !== nlpFilters.gender.toLowerCase()) {
          return false;
        }
        if (nlpFilters.minAge !== undefined && patient.age < nlpFilters.minAge) {
          return false;
        }
        if (nlpFilters.maxAge !== undefined && patient.age > nlpFilters.maxAge) {
          return false;
        }
        if (nlpFilters.status) {
          const isActive = nlpFilters.status === "active";
          if (patient.isActive !== isActive) return false;
        }
        if (nlpFilters.nameSearch) {
          const nameSearchLower = nlpFilters.nameSearch.toLowerCase();
          if (!patient.fullName.toLowerCase().includes(nameSearchLower)) {
            return false;
          }
        }
        // Diagnosis filter
        if (nlpFilters.diagnosisSearch) {
          const diagnosisLower = nlpFilters.diagnosisSearch.toLowerCase();
          const hasMatchingDiagnosis = patient.diagnosisTags?.some(
            (tag) => tag.toLowerCase().includes(diagnosisLower)
          );
          if (!hasMatchingDiagnosis) return false;
        }
        // Medication filter
        if (nlpFilters.medicationSearch) {
          const medicationLower = nlpFilters.medicationSearch.toLowerCase();
          const hasMatchingMedication = patient.medications?.some(
            (med) => med.toLowerCase().includes(medicationLower)
          );
          if (!hasMatchingMedication) return false;
        }
        // Blood type filter
        if (nlpFilters.bloodType) {
          if (patient.bloodType?.toUpperCase() !== nlpFilters.bloodType.toUpperCase()) {
            return false;
          }
        }
        // Preset filters
        if (nlpFilters.preset === "high-risk") {
          if (!patient.isCritical) return false;
        }
        if (nlpFilters.preset === "todays-appointments") {
          if (!patient.hasAppointmentToday) return false;
        }
        if (nlpFilters.preset === "overdue-followups") {
          // Demo: patients whose last visit was more than 14 days ago
          if (patient.lastVisitDate) {
            const daysSinceVisit = Math.floor(
              (Date.now() - new Date(patient.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceVisit <= 14) return false;
          }
        }
        return true;
      })
    : statusFilteredPatients;

  // Pagination math
  const totalItems = filteredPatients?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const visiblePatients = filteredPatients?.slice(startIndex, endIndex) ?? [];

  // Select all logic (for visible patients on current page)
  const visiblePatientIds = visiblePatients.map((patient) => patient.id);
  const isAllVisibleSelected =
    visiblePatientIds.length > 0 && visiblePatientIds.every((id) => selectedPatientIds.has(id));

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      setSelectedPatientIds((previous) => {
        const next = new Set(previous);
        for (const patientId of visiblePatientIds) {
          next.delete(patientId);
        }
        return next;
      });
    } else {
      setSelectedPatientIds((previous) => {
        const next = new Set(previous);
        for (const patientId of visiblePatientIds) {
          next.add(patientId);
        }
        return next;
      });
    }
  };

  return (
    <>
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-foreground">Patients</h1>
        <div className="flex items-center gap-3">
          <ViewModeToggle viewMode={viewMode} onViewModeChange={handleViewModeChange} />
          <Link
            to="/patients/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <UserPlus className="h-4 w-4" /> Add Patient
          </Link>
        </div>
      </div>

      {/* Natural Language Search */}
      <NaturalLanguageSearch
        onFiltersChange={(filters) => {
          setNlpFilters(filters);
          setCurrentPage(1);
        }}
        activeFilters={nlpFilters}
      />

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (searchTerm.trim()) {
              setIsSearchActive(true);
              setCurrentPage(1);
              triggerSearch({ searchTerm: searchTerm.trim() });
            }
          }}
          className="relative flex-1"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              if (!event.target.value.trim()) handleClearSearch();
            }}
            placeholder="Search by name, email, phone..."
            className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700"
          />
        </form>
        <div className="relative">
          <select
            value={statusFilter}
            aria-label="Filter by status"
            onChange={(event) => {
              setStatusFilter(event.target.value as "all" | "active" | "inactive");
              setCurrentPage(1);
            }}
            className="h-10 appearance-none rounded-md border border-border bg-card pl-3 pr-8 text-sm text-foreground/80 transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-700"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Select all (grid view only — list view has its own header) */}
        {viewMode === "grid" && visiblePatients.length > 0 && (
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
            aria-label={isAllVisibleSelected ? "Deselect all" : "Select all"}
          >
            {isAllVisibleSelected ? (
              <CheckSquare className="h-4 w-4 text-primary-700" />
            ) : (
              <Square className="h-4 w-4 text-muted-foreground/70" />
            )}
            <span className="hidden sm:inline">Select All</span>
          </button>
        )}

        <p className="self-center whitespace-nowrap text-sm text-muted-foreground" aria-live="polite">
          Showing {totalItems} patients
        </p>
      </div>

      {/* Loading */}
      {isLoading && <PatientListSkeleton viewMode={viewMode} />}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-error-200 bg-error-50 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-error-600" />
          <div>
            <p className="text-sm font-medium text-error-800">Failed to load patients</p>
            <p className="text-sm text-error-700">
              {"data" in error && typeof error.data === "object" && error.data && "message" in error.data
                ? String((error.data as Record<string, unknown>).message)
                : "An error occurred while fetching patients"}
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {!isLoading && filteredPatients && (
        <>
          {filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <UserX className="mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="text-lg font-semibold text-foreground/80">No patients found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSearchActive
                  ? "Try adjusting your search or filters"
                  : "No patients yet. Add your first patient to get started."}
              </p>
            </div>
          ) : (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {visiblePatients.map((patient) => (
                    <PatientCard
                      key={patient.id}
                      patient={patient}
                      isSelected={selectedPatientIds.has(patient.id)}
                      onToggleSelect={handleToggleSelect}
                    />
                  ))}
                </div>
              ) : (
                <div>
                  <ListHeader
                    isAllSelected={isAllVisibleSelected}
                    onToggleSelectAll={handleToggleSelectAll}
                  />
                  <div className="space-y-2">
                    {visiblePatients.map((patient) => (
                      <PatientRow
                        key={patient.id}
                        patient={patient}
                        isSelected={selectedPatientIds.has(patient.id)}
                        onToggleSelect={handleToggleSelect}
                      />
                    ))}
                  </div>
                </div>
              )}

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
          )}
        </>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedPatientIds.size}
        onClearSelection={handleClearSelection}
      />

      {/* Spacer when bulk bar is visible to prevent content from being hidden behind it */}
      {selectedPatientIds.size > 0 && <div className="h-16" />}
    </>
  );
}
