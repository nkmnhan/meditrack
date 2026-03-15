import { useState, useEffect } from "react";
import { useLazySearchPatientsQuery } from "@/features/patients/store/patientApi";
import { useGetMedicalRecordsByPatientIdQuery } from "../store/medicalRecordsApi";
import type { PatientListItem } from "@/features/patients/types";

export function useMedicalRecordsSearch() {
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const [searchPatients, { data: patientResults = [], isFetching: isSearchingPatients }] =
    useLazySearchPatientsQuery();

  const {
    data: records = [],
    isLoading: isLoadingRecords,
  } = useGetMedicalRecordsByPatientIdQuery(selectedPatient?.id ?? "", {
    skip: !selectedPatient,
  });

  // Patient search debounce (300ms, min 2 chars)
  useEffect(() => {
    if (patientSearchTerm.length < 2) return;
    const debounceTimer = setTimeout(() => {
      searchPatients({ searchTerm: patientSearchTerm });
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [patientSearchTerm, searchPatients]);

  // Auto-select when exactly one patient matches
  useEffect(() => {
    if (
      !isSearchingPatients &&
      !selectedPatient &&
      patientSearchTerm.length >= 2 &&
      patientResults.length === 1
    ) {
      handlePatientSelect(patientResults[0]);
    }
  }, [patientResults, isSearchingPatients]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchTermChange(term: string) {
    setPatientSearchTerm(term);
    setIsPatientDropdownOpen(true);
    setHighlightedIndex(-1);
    if (selectedPatient) {
      setSelectedPatient(null);
    }
  }

  function handlePatientSelect(patient: PatientListItem) {
    setSelectedPatient(patient);
    setPatientSearchTerm(patient.fullName);
    setIsPatientDropdownOpen(false);
    setHighlightedIndex(-1);
  }

  function handleClearSelection() {
    setSelectedPatient(null);
    setPatientSearchTerm("");
    setIsPatientDropdownOpen(false);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isPatientDropdownOpen || selectedPatient) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (patientSearchTerm.length >= 2 && !selectedPatient) {
          setIsPatientDropdownOpen(true);
          setHighlightedIndex(0);
        }
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        setHighlightedIndex((previous) =>
          previous < patientResults.length - 1 ? previous + 1 : 0
        );
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        setHighlightedIndex((previous) =>
          previous > 0 ? previous - 1 : patientResults.length - 1
        );
        break;
      }
      case "Enter": {
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < patientResults.length) {
          handlePatientSelect(patientResults[highlightedIndex]);
        }
        break;
      }
      case "Escape": {
        event.preventDefault();
        setIsPatientDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
      }
    }
  }

  return {
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
  };
}
