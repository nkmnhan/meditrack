import { useState, type FormEvent } from "react";
import { Sparkles, X, Search, Filter, AlertTriangle, CalendarClock, CalendarCheck } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

export interface ParsedFilters {
  readonly gender?: string;
  readonly minAge?: number;
  readonly maxAge?: number;
  readonly status?: "active" | "inactive";
  readonly nameSearch?: string;
  readonly diagnosisSearch?: string;
  readonly medicationSearch?: string;
  readonly bloodType?: string;
  readonly preset?: "high-risk" | "overdue-followups" | "todays-appointments";
}

interface NaturalLanguageSearchProps {
  readonly onFiltersChange: (filters: ParsedFilters | null) => void;
  readonly activeFilters: ParsedFilters | null;
}

const GENDER_KEYWORDS: Record<string, string> = {
  male: "Male",
  man: "Male",
  men: "Male",
  female: "Female",
  woman: "Female",
  women: "Female",
};

const ACTIVE_STATUS_KEYWORDS: Record<string, "active" | "inactive"> = {
  active: "active",
  inactive: "inactive",
};

const MIN_AGE_PATTERNS = [
  /\b(?:over|above|older\s+than)\s+(\d+)\b/i,
  /\b(\d+)\s*\+\b/,
];

const MAX_AGE_PATTERNS = [
  /\b(?:under|below|younger\s+than)\s+(\d+)\b/i,
];

const EXACT_AGE_PATTERN = /\bage\s+(\d+)\b/i;

const DIAGNOSIS_KEYWORDS: Record<string, string> = {
  diabetic: "diabetes",
  diabetes: "diabetes",
  hypertensive: "hypertension",
  hypertension: "hypertension",
  asthmatic: "asthma",
  asthma: "asthma",
  copd: "copd",
  cardiac: "cardiac",
  epilepsy: "epilepsy",
  epileptic: "epilepsy",
  cancer: "cancer",
  oncology: "cancer",
  renal: "renal",
  kidney: "renal",
  thyroid: "thyroid",
  arthritis: "arthritis",
};

const MEDICATION_KEYWORDS: string[] = [
  "metformin", "insulin", "lisinopril", "amlodipine", "atorvastatin",
  "omeprazole", "levothyroxine", "albuterol", "metoprolol", "losartan",
  "warfarin", "prednisone", "aspirin", "ibuprofen", "amoxicillin",
];

const BLOOD_TYPE_PATTERN = /\b(a|b|ab|o)\s*([+-]|positive|negative)\b/i;

interface SearchPreset {
  readonly id: "high-risk" | "overdue-followups" | "todays-appointments";
  readonly label: string;
  readonly icon: typeof AlertTriangle;
}

const SEARCH_PRESETS: SearchPreset[] = [
  { id: "high-risk", label: "High-risk patients", icon: AlertTriangle },
  { id: "overdue-followups", label: "Overdue follow-ups", icon: CalendarClock },
  { id: "todays-appointments", label: "Today's appointments", icon: CalendarCheck },
];

function parseNaturalLanguageQuery(query: string): ParsedFilters {
  const filters: {
    gender?: string;
    minAge?: number;
    maxAge?: number;
    status?: "active" | "inactive";
    nameSearch?: string;
    diagnosisSearch?: string;
    medicationSearch?: string;
    bloodType?: string;
  } = {};

  let remainingQuery = query.trim();

  // Extract gender
  for (const [keyword, gender] of Object.entries(GENDER_KEYWORDS)) {
    const genderPattern = new RegExp(`\\b${keyword}\\b`, "i");
    if (genderPattern.test(remainingQuery)) {
      filters.gender = gender;
      remainingQuery = remainingQuery.replace(genderPattern, "").trim();
      break;
    }
  }

  // Extract min age ("over X", "above X", "older than X", "X+")
  for (const pattern of MIN_AGE_PATTERNS) {
    const match = remainingQuery.match(pattern);
    if (match) {
      filters.minAge = parseInt(match[1], 10);
      remainingQuery = remainingQuery.replace(match[0], "").trim();
      break;
    }
  }

  // Extract max age ("under X", "below X", "younger than X")
  for (const pattern of MAX_AGE_PATTERNS) {
    const match = remainingQuery.match(pattern);
    if (match) {
      filters.maxAge = parseInt(match[1], 10);
      remainingQuery = remainingQuery.replace(match[0], "").trim();
      break;
    }
  }

  // Extract exact age ("age X") — only if no min/max was already found
  if (filters.minAge === undefined && filters.maxAge === undefined) {
    const exactMatch = remainingQuery.match(EXACT_AGE_PATTERN);
    if (exactMatch) {
      const exactAge = parseInt(exactMatch[1], 10);
      filters.minAge = exactAge;
      filters.maxAge = exactAge;
      remainingQuery = remainingQuery.replace(exactMatch[0], "").trim();
    }
  }

  // Extract status
  for (const [keyword, status] of Object.entries(ACTIVE_STATUS_KEYWORDS)) {
    const statusPattern = new RegExp(`\\b${keyword}\\b`, "i");
    if (statusPattern.test(remainingQuery)) {
      filters.status = status;
      remainingQuery = remainingQuery.replace(statusPattern, "").trim();
      break;
    }
  }

  // Extract diagnosis terms
  for (const [keyword, diagnosis] of Object.entries(DIAGNOSIS_KEYWORDS)) {
    const diagnosisPattern = new RegExp(`\\b${keyword}\\b`, "i");
    if (diagnosisPattern.test(remainingQuery)) {
      filters.diagnosisSearch = diagnosis;
      remainingQuery = remainingQuery.replace(diagnosisPattern, "").trim();
      break;
    }
  }

  // Extract medication names
  for (const medication of MEDICATION_KEYWORDS) {
    const medicationPattern = new RegExp(`\\b${medication}\\b`, "i");
    if (medicationPattern.test(remainingQuery)) {
      filters.medicationSearch = medication.toLowerCase();
      remainingQuery = remainingQuery.replace(medicationPattern, "").trim();
      break;
    }
  }

  // Extract blood type (e.g., "A+", "O negative", "AB-")
  const bloodTypeMatch = remainingQuery.match(BLOOD_TYPE_PATTERN);
  if (bloodTypeMatch) {
    const typeGroup = bloodTypeMatch[1].toUpperCase();
    const rhRaw = bloodTypeMatch[2].toLowerCase();
    const rhSign = rhRaw === "positive" || rhRaw === "+" ? "+" : "-";
    filters.bloodType = `${typeGroup}${rhSign}`;
    remainingQuery = remainingQuery.replace(bloodTypeMatch[0], "").trim();
  }

  // Remaining words become name search (clean up extra whitespace and common filler words)
  const fillerWords = new Set(["patients", "patient", "who", "are", "is", "the", "with", "and", "of", "a", "an", "years", "year", "old", "on", "taking", "diagnosed", "type", "blood"]);
  const nameWords = remainingQuery
    .split(/\s+/)
    .filter((word) => word.length > 0 && !fillerWords.has(word.toLowerCase()));

  if (nameWords.length > 0) {
    filters.nameSearch = nameWords.join(" ");
  }

  return filters;
}

function hasActiveFilters(filters: ParsedFilters): boolean {
  return (
    filters.gender !== undefined ||
    filters.minAge !== undefined ||
    filters.maxAge !== undefined ||
    filters.status !== undefined ||
    filters.nameSearch !== undefined ||
    filters.diagnosisSearch !== undefined ||
    filters.medicationSearch !== undefined ||
    filters.bloodType !== undefined ||
    filters.preset !== undefined
  );
}

interface FilterTagProps {
  readonly label: string;
  readonly value: string;
  readonly onRemove: () => void;
}

function FilterTag({ label, value, onRemove }: FilterTagProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
      {label}: {value}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-primary-200"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export function NaturalLanguageSearch({ onFiltersChange, activeFilters }: NaturalLanguageSearchProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      onFiltersChange(null);
      return;
    }

    const parsed = parseNaturalLanguageQuery(trimmed);
    if (hasActiveFilters(parsed)) {
      onFiltersChange(parsed);
    } else {
      onFiltersChange(null);
    }
  };

  const handleRemoveFilter = (filterKey: keyof ParsedFilters) => {
    if (!activeFilters) return;

    const updatedFilters = { ...activeFilters };
    delete updatedFilters[filterKey];

    // If removing exact age (min === max), remove both
    if (filterKey === "minAge" && activeFilters.minAge === activeFilters.maxAge) {
      delete updatedFilters.maxAge;
    } else if (filterKey === "maxAge" && activeFilters.minAge === activeFilters.maxAge) {
      delete updatedFilters.minAge;
    }

    if (hasActiveFilters(updatedFilters)) {
      onFiltersChange(updatedFilters);
    } else {
      onFiltersChange(null);
      setQuery("");
    }
  };

  const handleClearAll = () => {
    onFiltersChange(null);
    setQuery("");
  };

  const isExactAge =
    activeFilters?.minAge !== undefined &&
    activeFilters?.maxAge !== undefined &&
    activeFilters.minAge === activeFilters.maxAge;

  const formatAgeLabel = (): string | null => {
    if (!activeFilters) return null;
    if (isExactAge) return `${activeFilters.minAge}`;
    if (activeFilters.minAge !== undefined && activeFilters.maxAge !== undefined) {
      return `${activeFilters.minAge}–${activeFilters.maxAge}`;
    }
    if (activeFilters.minAge !== undefined) return `> ${activeFilters.minAge}`;
    if (activeFilters.maxAge !== undefined) return `< ${activeFilters.maxAge}`;
    return null;
  };

  const handlePresetClick = (presetId: "high-risk" | "overdue-followups" | "todays-appointments") => {
    onFiltersChange({ preset: presetId });
    setQuery("");
  };

  return (
    <div className="mb-4">
      <form onSubmit={handleSubmit} className="relative">
        <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-500" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try: 'diabetic female over 60' or 'patients on metformin' or 'blood type O+'"
          className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-20 text-sm text-foreground placeholder:text-muted-foreground/70 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
        <button
          type="submit"
          className={clsxMerge(
            "absolute right-1 top-1/2 -translate-y-1/2",
            "inline-flex h-8 items-center gap-1.5 rounded-md px-3",
            "bg-accent-500 text-xs font-medium text-white",
            "transition-colors hover:bg-accent-600"
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Parse</span>
        </button>
      </form>

      {/* Saved search presets */}
      {!activeFilters && (
        <div className="mt-2 flex flex-wrap gap-2">
          {SEARCH_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetClick(preset.id)}
              className={clsxMerge(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3",
                "border border-border bg-muted text-xs font-medium text-foreground/80",
                "transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              )}
            >
              <preset.icon className="h-3.5 w-3.5" />
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Active filter tags */}
      {activeFilters && hasActiveFilters(activeFilters) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground/70" />

          {activeFilters.gender && (
            <FilterTag
              label="Gender"
              value={activeFilters.gender}
              onRemove={() => handleRemoveFilter("gender")}
            />
          )}

          {(activeFilters.minAge !== undefined || activeFilters.maxAge !== undefined) && (
            <FilterTag
              label="Age"
              value={formatAgeLabel() ?? ""}
              onRemove={() => handleRemoveFilter(isExactAge ? "minAge" : activeFilters.minAge !== undefined ? "minAge" : "maxAge")}
            />
          )}

          {activeFilters.status && (
            <FilterTag
              label="Status"
              value={activeFilters.status.charAt(0).toUpperCase() + activeFilters.status.slice(1)}
              onRemove={() => handleRemoveFilter("status")}
            />
          )}

          {activeFilters.diagnosisSearch && (
            <FilterTag
              label="Diagnosis"
              value={activeFilters.diagnosisSearch}
              onRemove={() => handleRemoveFilter("diagnosisSearch")}
            />
          )}

          {activeFilters.medicationSearch && (
            <FilterTag
              label="Medication"
              value={activeFilters.medicationSearch}
              onRemove={() => handleRemoveFilter("medicationSearch")}
            />
          )}

          {activeFilters.bloodType && (
            <FilterTag
              label="Blood Type"
              value={activeFilters.bloodType}
              onRemove={() => handleRemoveFilter("bloodType")}
            />
          )}

          {activeFilters.preset && (
            <FilterTag
              label="Preset"
              value={SEARCH_PRESETS.find((preset) => preset.id === activeFilters.preset)?.label ?? activeFilters.preset}
              onRemove={() => handleRemoveFilter("preset")}
            />
          )}

          {activeFilters.nameSearch && (
            <FilterTag
              label="Name"
              value={activeFilters.nameSearch}
              onRemove={() => handleRemoveFilter("nameSearch")}
            />
          )}

          <button
            type="button"
            onClick={handleClearAll}
            className="ml-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground/80"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
