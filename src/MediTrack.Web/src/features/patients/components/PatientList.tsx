import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, UserPlus, AlertCircle, ChevronLeft, ChevronRight, ChevronDown,
  Hash, Calendar, Phone, Mail, UserX,
} from "lucide-react";
import { useGetPatientsQuery, useLazySearchPatientsQuery } from "../store/patientApi";
import type { PatientListItem } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components/Breadcrumb";

const PAGE_SIZE = 6;

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Patients" },
];

/* ── Skeleton ── */

function PatientListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: PAGE_SIZE }).map((_, index) => (
        <div key={index} className="h-48 animate-pulse rounded-lg bg-neutral-100" />
      ))}
    </div>
  );
}

/* ── Patient Card ── */

function PatientCard({ patient }: { readonly patient: PatientListItem }) {
  const formattedDOB = new Date(patient.dateOfBirth).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const nameParts = patient.fullName.split(" ");
  const initials = nameParts.length >= 2
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
    : patient.fullName.slice(0, 2);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Top: avatar + name + status */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
          {initials.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900">{patient.fullName}</p>
        </div>
        <span
          className={clsxMerge(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            patient.isActive
              ? "border border-success-500/30 bg-success-50 text-success-700"
              : "bg-neutral-100 text-neutral-500"
          )}
        >
          {patient.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Info rows */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <Hash className="h-4 w-4 flex-shrink-0 text-neutral-500" />
          <span className="font-mono">{patient.medicalRecordNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <Calendar className="h-4 w-4 flex-shrink-0 text-neutral-500" />
          <span>{formattedDOB} <span className="text-neutral-500">({patient.gender})</span></span>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <Phone className="h-4 w-4 flex-shrink-0 text-neutral-500" />
          <span>{patient.phoneNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <Mail className="h-4 w-4 flex-shrink-0 text-neutral-500" />
          <span className="truncate">{patient.email}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex justify-end border-t border-neutral-200 pt-3">
        <Link to={`/patients/${patient.id}`} className="text-sm font-medium text-primary-700 hover:underline">
          View Details &rarr;
        </Link>
      </div>
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

/* ── PatientList ── */

export function PatientList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

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

  const patients = isSearchActive ? searchResults : allPatients;
  const isLoading = isSearchActive ? isSearching : isLoadingAll;
  const error = isSearchActive ? searchError : errorAll;

  // Client-side status filter (when not searching)
  const filteredPatients = patients?.filter((patient) => {
    if (statusFilter === "all") return true;
    return statusFilter === "active" ? patient.isActive : !patient.isActive;
  });

  // Pagination math
  const totalItems = filteredPatients?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const visiblePatients = filteredPatients?.slice(startIndex, endIndex) ?? [];

  return (
    <>
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-neutral-900">Patients</h1>
        <Link
          to="/patients/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <UserPlus className="h-4 w-4" /> Add Patient
        </Link>
      </div>

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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              if (!event.target.value.trim()) handleClearSearch();
            }}
            placeholder="Search by name, email, phone..."
            className="h-10 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-500 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700"
          />
        </form>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as "all" | "active" | "inactive");
              setCurrentPage(1);
            }}
            className="h-10 appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 text-sm text-neutral-700 transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-700"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        </div>
        <p className="self-center whitespace-nowrap text-sm text-neutral-500">
          Showing {totalItems} patients
        </p>
      </div>

      {/* Loading */}
      {isLoading && <PatientListSkeleton />}

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
              <UserX className="mb-3 h-12 w-12 text-neutral-300" />
              <p className="text-lg font-semibold text-neutral-700">No patients found</p>
              <p className="mt-1 text-sm text-neutral-500">
                {isSearchActive
                  ? "Try adjusting your search or filters"
                  : "No patients yet. Add your first patient to get started."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visiblePatients.map((patient) => (
                  <PatientCard key={patient.id} patient={patient} />
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
          )}
        </>
      )}
    </>
  );
}
