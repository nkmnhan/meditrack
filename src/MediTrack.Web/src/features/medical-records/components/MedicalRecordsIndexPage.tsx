import { useId } from "react";
import { Search, X, FileText, Loader2 } from "lucide-react";
import { useMedicalRecordsSearch } from "../hooks/useMedicalRecordsSearch";
import { MedicalRecordList } from "./MedicalRecordList";
import { clsxMerge } from "@/shared/utils/clsxMerge";

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

  const listboxId = useId();
  const isDropdownVisible = isPatientDropdownOpen && patientSearchTerm.length >= 2 && !selectedPatient;
  const hasResults = !isSearchingPatients && patientResults.length > 0;

  const activeDescendantId =
    isDropdownVisible && hasResults && highlightedIndex >= 0 && highlightedIndex < patientResults.length
      ? `${listboxId}-option-${highlightedIndex}`
      : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Medical Records</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Search for a patient to view their medical records
        </p>
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

      {/* Records list or empty state */}
      {selectedPatient ? (
        <MedicalRecordList records={records} isLoading={isLoadingRecords} />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] rounded-lg border border-neutral-200 bg-white p-6">
          <FileText className="h-12 w-12 text-neutral-400" />
          <h2 className="mt-4 text-lg font-semibold text-neutral-900">Search for a Patient</h2>
          <p className="mt-2 text-sm text-neutral-600 text-center max-w-md">
            Type a patient's name above to search and view their medical records.
          </p>
        </div>
      )}
    </div>
  );
}
