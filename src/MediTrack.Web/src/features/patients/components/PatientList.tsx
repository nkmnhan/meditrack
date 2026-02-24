import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserPlus, AlertCircle } from "lucide-react";
import { useGetPatientsQuery, useLazySearchPatientsQuery } from "../store/patientApi";
import type { PatientListItem } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";

function PatientListSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-16 animate-pulse rounded-lg bg-neutral-100" />
      <div className="h-16 animate-pulse rounded-lg bg-neutral-100" />
      <div className="h-16 animate-pulse rounded-lg bg-neutral-100" />
      <div className="h-16 animate-pulse rounded-lg bg-neutral-100" />
      <div className="h-16 animate-pulse rounded-lg bg-neutral-100" />
    </div>
  );
}

function PatientCard({ patient }: { readonly patient: PatientListItem }) {
  const formattedDOB = new Date(patient.dateOfBirth).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      to={`/patients/${patient.id}`}
      className="block rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">
            {patient.fullName}
          </h3>
          <div className="mt-1 flex items-center gap-4 text-sm text-neutral-500">
            <span>MRN: {patient.medicalRecordNumber}</span>
            <span>•</span>
            <span>DOB: {formattedDOB}</span>
            <span>•</span>
            <span>{patient.email}</span>
            <span>•</span>
            <span>{patient.phoneNumber}</span>
          </div>
        </div>
        <span
          className={clsxMerge(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            patient.isActive
              ? "bg-success-50 text-success-700"
              : "bg-neutral-100 text-neutral-500"
          )}
        >
          {patient.isActive ? "Active" : "Inactive"}
        </span>
      </div>
    </Link>
  );
}

export function PatientList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Fetch all patients by default
  const {
    data: allPatients,
    isLoading: isLoadingAll,
    error: errorAll,
  } = useGetPatientsQuery({ includeInactive });
  
  // Lazy query for search
  const [triggerSearch, { data: searchResults, isLoading: isSearching, error: searchError }] =
    useLazySearchPatientsQuery();

  const handleClearSearch = () => {
    setSearchTerm("");
    setIsSearchActive(false);
  };

  // Determine which data to display
  const patients = isSearchActive ? searchResults : allPatients;
  const isLoading = isSearchActive ? isSearching : isLoadingAll;
  const error = isSearchActive ? searchError : errorAll;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Patients</h1>
          <p className="mt-1 text-neutral-500">Manage patient records and information</p>
        </div>
        <Link
          to="/patients/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-white hover:bg-primary-800"
        >
          <UserPlus className="h-5 w-5" />
          New Patient
        </Link>
      </div>

      {/* Search Bar */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (searchTerm.trim()) {
              setIsSearchActive(true);
              triggerSearch({ searchTerm: searchTerm.trim() });
            }
          }}
          className="flex gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or phone number..."
              className="w-full rounded-lg border border-neutral-300 py-2 pl-10 pr-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={!searchTerm.trim() || isSearching}
            className="rounded-lg bg-primary-700 px-6 py-2 text-white hover:bg-primary-800 disabled:bg-neutral-300"
          >
            Search
          </button>
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="rounded-lg border border-neutral-300 px-6 py-2 text-neutral-700 hover:bg-neutral-50"
            >
              Clear
            </button>
          )}
        </form>
        
        <div className="mt-3 flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-primary-700 focus:ring-primary-500"
            />{" "}
            Show inactive patients
          </label>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && <PatientListSkeleton />}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-error-200 bg-error-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-error-600" />
          <div>
            <p className="text-sm font-medium text-error-800">Failed to load patients</p>
            <p className="text-sm text-error-700">
              {"data" in error && typeof error.data === "object" && error.data && "message" in error.data
                ? String(error.data.message)
                : "An error occurred while fetching patients"}
            </p>
          </div>
        </div>
      )}

      {/* Patient List */}
      {!isLoading && patients && (
        <>
          {patients.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 p-12 text-center">
              <p className="text-neutral-500">
                {searchTerm.trim()
                  ? "No patients found matching your search"
                  : "No patients yet. Add your first patient to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {patients.map((patient) => (
                <PatientCard key={patient.id} patient={patient} />
              ))}
            </div>
          )}
          
          {patients.length > 0 && (
            <p className="text-center text-sm text-neutral-500">
              Showing {patients.length} patient{patients.length === 1 ? "" : "s"}
            </p>
          )}
        </>
      )}
    </div>
  );
}
