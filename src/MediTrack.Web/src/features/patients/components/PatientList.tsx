import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserPlus, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useGetPatientsQuery, useLazySearchPatientsQuery } from "../store/patientApi";
import type { PatientListItem } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";

const PAGE_SIZE = 6;

/* ── Skeleton ──────────────────────────────────────────── */

function PatientListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: PAGE_SIZE }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-lg bg-neutral-100" />
      ))}
    </div>
  );
}

/* ── Patient Card ──────────────────────────────────────── */

function PatientCard({ patient }: { readonly patient: PatientListItem }) {
  const formattedDOB = new Date(patient.dateOfBirth).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      to={`/patients/${patient.id}`}
      className="block rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md hover:border-primary-300"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-neutral-900 truncate">
            {patient.fullName}
          </h3>
          <p className="text-xs font-mono text-neutral-500 mt-0.5">{patient.medicalRecordNumber}</p>
        </div>
        <span
          className={clsxMerge(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0",
            patient.isActive
              ? "bg-success-50 text-success-700 border border-success-500/30"
              : "bg-neutral-100 text-neutral-500 border border-neutral-200"
          )}
        >
          {patient.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-sm text-neutral-600">
        <p>
          <span className="text-neutral-500">DOB:</span>{" "}
          <span className="font-medium">{formattedDOB}</span>
          <span className="ml-2 text-neutral-400">{patient.gender}</span>
        </p>
        <p className="truncate">
          <span className="text-neutral-500">Phone:</span>{" "}
          <span className="font-medium">{patient.phoneNumber}</span>
        </p>
        <p className="hidden md:block truncate">
          <span className="text-neutral-500">Email:</span>{" "}
          <span className="font-medium">{patient.email}</span>
        </p>
      </div>
    </Link>
  );
}

/* ── Pagination ────────────────────────────────────────── */

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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      <p className="text-sm text-neutral-500">
        Showing <span className="font-medium text-neutral-700">{startIndex + 1}–{endIndex}</span> of{" "}
        <span className="font-medium text-neutral-700">{totalItems}</span> patients
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage === 1}
          className={clsxMerge(
            "h-9 w-9 rounded-lg border border-neutral-200 flex items-center justify-center",
            "hover:bg-neutral-50 transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 text-neutral-700" />
        </button>
        <span className="text-sm font-medium text-neutral-700 min-w-[4rem] text-center">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={currentPage === totalPages}
          className={clsxMerge(
            "h-9 w-9 rounded-lg border border-neutral-200 flex items-center justify-center",
            "hover:bg-neutral-50 transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4 text-neutral-700" />
        </button>
      </div>
    </div>
  );
}

/* ── PatientList ───────────────────────────────────────── */

export function PatientList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: allPatients,
    isLoading: isLoadingAll,
    error: errorAll,
  } = useGetPatientsQuery({ includeInactive });

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

  // Pagination math
  const totalItems = patients?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const visiblePatients = patients?.slice(startIndex, endIndex) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Patients</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage patient records and information</p>
        </div>
        <Link
          to="/patients/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 text-sm font-medium text-white hover:bg-primary-800 sm:w-auto"
        >
          <UserPlus className="h-4 w-4" />
          Add Patient
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (searchTerm.trim()) {
              setIsSearchActive(true);
              setCurrentPage(1);
              triggerSearch({ searchTerm: searchTerm.trim() });
            }
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full h-10 rounded-lg border border-neutral-200 pl-9 pr-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!searchTerm.trim() || isSearching}
            className="h-10 rounded-lg bg-primary-700 px-5 text-sm font-medium text-white hover:bg-primary-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
          >
            Search
          </button>
          {isSearchActive && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="h-10 rounded-lg border border-neutral-200 px-5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Clear
            </button>
          )}
        </form>

        <div className="mt-3">
          <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => {
                setIncludeInactive(event.target.checked);
                setCurrentPage(1);
              }}
              className="h-4 w-4 rounded border-neutral-300 text-primary-700 focus:ring-primary-500"
            />
            Show inactive patients
          </label>
        </div>
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
      {!isLoading && patients && (
        <>
          {patients.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 p-12 text-center">
              <p className="text-neutral-500">
                {isSearchActive
                  ? "No patients found matching your search"
                  : "No patients yet. Add your first patient to get started."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </div>
  );
}
