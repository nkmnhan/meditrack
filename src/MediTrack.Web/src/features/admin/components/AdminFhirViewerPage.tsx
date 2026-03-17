import { useState, useRef, useEffect } from "react";
import {
  Code2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileJson,
  Search,
  Loader2,
  ShieldCheck,
  CircleCheck,
  AlertTriangle,
  CircleX,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/dashboard" },
  { label: "Admin", href: "/admin/dashboard" },
  { label: "FHIR Viewer" },
];

type FhirResourceType =
  | "Patient"
  | "Observation"
  | "Encounter"
  | "Condition"
  | "MedicationRequest"
  | "AllergyIntolerance";

const RESOURCE_TYPES: readonly FhirResourceType[] = [
  "Patient",
  "Observation",
  "Encounter",
  "Condition",
  "MedicationRequest",
  "AllergyIntolerance",
];

const DEMO_BUNDLES: Record<FhirResourceType, object> = {
  Patient: {
    resourceType: "Bundle",
    type: "searchset",
    total: 1,
    entry: [
      {
        resource: {
          resourceType: "Patient",
          id: "pat-001",
          name: [{ use: "official", family: "Johnson", given: ["Sarah"] }],
          gender: "female",
          birthDate: "1985-01-15",
          telecom: [
            { system: "phone", value: "(555) 123-4567", use: "mobile" },
            { system: "email", value: "sarah.johnson@email.com" },
          ],
          address: [
            {
              use: "home",
              line: ["123 Maple Street"],
              city: "Springfield",
              state: "IL",
              postalCode: "62704",
            },
          ],
        },
      },
    ],
  },
  Observation: {
    resourceType: "Bundle",
    type: "searchset",
    total: 1,
    entry: [
      {
        resource: {
          resourceType: "Observation",
          id: "obs-001",
          status: "final",
          category: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/observation-category",
                  code: "vital-signs",
                  display: "Vital Signs",
                },
              ],
            },
          ],
          code: {
            coding: [
              { system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" },
            ],
          },
          subject: { reference: "Patient/pat-001" },
          effectiveDateTime: "2026-03-10T09:30:00Z",
          valueQuantity: {
            value: 120,
            unit: "mmHg",
            system: "http://unitsofmeasure.org",
            code: "mm[Hg]",
          },
        },
      },
    ],
  },
  Encounter: {
    resourceType: "Bundle",
    type: "searchset",
    total: 1,
    entry: [
      {
        resource: {
          resourceType: "Encounter",
          id: "enc-001",
          status: "finished",
          class: {
            system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            code: "AMB",
            display: "ambulatory",
          },
          type: [
            {
              coding: [
                {
                  system: "http://snomed.info/sct",
                  code: "185349003",
                  display: "Encounter for check up",
                },
              ],
            },
          ],
          subject: { reference: "Patient/pat-001" },
          period: {
            start: "2026-03-10T09:00:00Z",
            end: "2026-03-10T09:45:00Z",
          },
        },
      },
    ],
  },
  Condition: {
    resourceType: "Bundle",
    type: "searchset",
    total: 1,
    entry: [
      {
        resource: {
          resourceType: "Condition",
          id: "cond-001",
          clinicalStatus: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
                code: "active",
                display: "Active",
              },
            ],
          },
          code: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "73211009",
                display: "Diabetes mellitus",
              },
            ],
            text: "Type 2 Diabetes Mellitus",
          },
          subject: { reference: "Patient/pat-001" },
          onsetDateTime: "2020-06-15",
        },
      },
    ],
  },
  MedicationRequest: {
    resourceType: "Bundle",
    type: "searchset",
    total: 1,
    entry: [
      {
        resource: {
          resourceType: "MedicationRequest",
          id: "med-001",
          status: "active",
          intent: "order",
          medicationCodeableConcept: {
            coding: [
              {
                system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                code: "860975",
                display: "Metformin 500 MG Oral Tablet",
              },
            ],
          },
          subject: { reference: "Patient/pat-001" },
          authoredOn: "2026-03-01",
          dosageInstruction: [
            {
              text: "Take 1 tablet by mouth twice daily with meals",
              timing: {
                repeat: { frequency: 2, period: 1, periodUnit: "d" },
              },
            },
          ],
        },
      },
    ],
  },
  AllergyIntolerance: {
    resourceType: "Bundle",
    type: "searchset",
    total: 1,
    entry: [
      {
        resource: {
          resourceType: "AllergyIntolerance",
          id: "allergy-001",
          clinicalStatus: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                code: "active",
                display: "Active",
              },
            ],
          },
          type: "allergy",
          category: ["medication"],
          criticality: "high",
          code: {
            coding: [
              {
                system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                code: "7980",
                display: "Penicillin",
              },
            ],
          },
          patient: { reference: "Patient/pat-001" },
          reaction: [
            {
              manifestation: [{ coding: [{ display: "Anaphylaxis" }] }],
              severity: "severe",
            },
          ],
        },
      },
    ],
  },
};

// --- Validation types and demo data ---

type ValidationSeverity = "pass" | "warning" | "error";

interface ValidationResult {
  readonly field: string;
  readonly severity: ValidationSeverity;
  readonly message: string;
}

const DEMO_VALIDATION_RESULTS: Record<FhirResourceType, readonly ValidationResult[]> = {
  Patient: [
    { field: "Patient.resourceType", severity: "pass", message: "Valid resource type" },
    { field: "Patient.name", severity: "pass", message: "Valid" },
    { field: "Patient.birthDate", severity: "pass", message: "Valid" },
    { field: "Patient.gender", severity: "pass", message: "Valid" },
    { field: "Patient.identifier", severity: "warning", message: "Missing system URI" },
    { field: "Patient.telecom", severity: "pass", message: "Valid" },
  ],
  Observation: [
    { field: "Observation.resourceType", severity: "pass", message: "Valid resource type" },
    { field: "Observation.status", severity: "pass", message: "Valid" },
    { field: "Observation.code", severity: "pass", message: "Valid" },
    { field: "Observation.subject", severity: "pass", message: "Valid reference" },
    { field: "Observation.valueQuantity", severity: "pass", message: "Valid" },
    { field: "Observation.interpretation", severity: "warning", message: "Missing interpretation coding" },
  ],
  Encounter: [
    { field: "Encounter.resourceType", severity: "pass", message: "Valid resource type" },
    { field: "Encounter.status", severity: "pass", message: "Valid" },
    { field: "Encounter.class", severity: "pass", message: "Valid" },
    { field: "Encounter.subject", severity: "pass", message: "Valid reference" },
    { field: "Encounter.period", severity: "pass", message: "Valid" },
    { field: "Encounter.participant", severity: "warning", message: "No participants listed" },
  ],
  Condition: [
    { field: "Condition.resourceType", severity: "pass", message: "Valid resource type" },
    { field: "Condition.clinicalStatus", severity: "pass", message: "Valid" },
    { field: "Condition.code", severity: "pass", message: "Valid" },
    { field: "Condition.subject", severity: "pass", message: "Valid reference" },
    { field: "Condition.verificationStatus", severity: "warning", message: "Missing verification status" },
    { field: "Condition.onsetDateTime", severity: "pass", message: "Valid" },
  ],
  MedicationRequest: [
    { field: "MedicationRequest.resourceType", severity: "pass", message: "Valid resource type" },
    { field: "MedicationRequest.status", severity: "pass", message: "Valid" },
    { field: "MedicationRequest.intent", severity: "pass", message: "Valid" },
    { field: "MedicationRequest.subject", severity: "pass", message: "Valid reference" },
    { field: "MedicationRequest.dosageInstruction", severity: "pass", message: "Valid" },
    { field: "MedicationRequest.requester", severity: "warning", message: "Missing requester reference" },
  ],
  AllergyIntolerance: [
    { field: "AllergyIntolerance.resourceType", severity: "pass", message: "Valid resource type" },
    { field: "AllergyIntolerance.clinicalStatus", severity: "pass", message: "Valid" },
    { field: "AllergyIntolerance.code", severity: "pass", message: "Valid" },
    { field: "AllergyIntolerance.patient", severity: "pass", message: "Valid reference" },
    { field: "AllergyIntolerance.reaction", severity: "pass", message: "Valid" },
    { field: "AllergyIntolerance.criticality", severity: "pass", message: "Valid" },
  ],
};

// --- Helper: count text matches in a string ---

function findMatchIndices(text: string, searchTerm: string): number[] {
  if (!searchTerm) return [];
  const indices: number[] = [];
  const lowerText = text.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  let startPosition = 0;
  while (startPosition < lowerText.length) {
    const foundIndex = lowerText.indexOf(lowerTerm, startPosition);
    if (foundIndex === -1) break;
    indices.push(foundIndex);
    startPosition = foundIndex + 1;
  }
  return indices;
}

// --- JSON tree node with search highlighting ---

interface JsonNodeProps {
  readonly nodeKey: string;
  readonly value: unknown;
  readonly depth: number;
  readonly searchTerm?: string;
  readonly currentMatchIndex?: number;
  readonly matchCounter?: { current: number };
}

function HighlightedText({
  text,
  searchTerm,
  currentMatchIndex,
  matchCounter,
  className,
}: {
  readonly text: string;
  readonly searchTerm?: string;
  readonly currentMatchIndex?: number;
  readonly matchCounter?: { current: number };
  readonly className?: string;
}) {
  if (!searchTerm) {
    return <span className={className}>{text}</span>;
  }

  const lowerText = text.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const segments: React.ReactNode[] = [];
  let lastEnd = 0;
  let searchStart = 0;

  while (searchStart < lowerText.length) {
    const foundIndex = lowerText.indexOf(lowerTerm, searchStart);
    if (foundIndex === -1) break;

    if (foundIndex > lastEnd) {
      segments.push(
        <span key={`text-${lastEnd}`} className={className}>
          {text.slice(lastEnd, foundIndex)}
        </span>,
      );
    }

    const isCurrentMatch =
      matchCounter && currentMatchIndex !== undefined && matchCounter.current === currentMatchIndex;
    if (matchCounter) matchCounter.current += 1;

    segments.push(
      <mark
        key={`match-${foundIndex}`}
        className={clsxMerge(
          "rounded px-0.5",
          isCurrentMatch ? "bg-warning-300 text-foreground" : "bg-warning-100 text-foreground",
        )}
      >
        {text.slice(foundIndex, foundIndex + searchTerm.length)}
      </mark>,
    );

    lastEnd = foundIndex + searchTerm.length;
    searchStart = foundIndex + 1;
  }

  if (lastEnd < text.length) {
    segments.push(
      <span key={`text-${lastEnd}`} className={className}>
        {text.slice(lastEnd)}
      </span>,
    );
  }

  return segments.length > 0 ? <>{segments}</> : <span className={className}>{text}</span>;
}

function JsonNode({ nodeKey, value, depth, searchTerm, currentMatchIndex, matchCounter }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const highlightProps = { searchTerm, currentMatchIndex, matchCounter };

  if (value === null) {
    return (
      <div className="flex items-center gap-1" style={{ paddingLeft: depth * 16 }}>
        <HighlightedText text={`${nodeKey}:`} className="text-muted-foreground" {...highlightProps} />
        <span className="italic text-muted-foreground/70">null</span>
      </div>
    );
  }
  if (typeof value === "boolean") {
    return (
      <div className="flex items-center gap-1" style={{ paddingLeft: depth * 16 }}>
        <HighlightedText text={`${nodeKey}:`} className="text-muted-foreground" {...highlightProps} />
        <HighlightedText text={String(value)} className="text-accent-600" {...highlightProps} />
      </div>
    );
  }
  if (typeof value === "number") {
    return (
      <div className="flex items-center gap-1" style={{ paddingLeft: depth * 16 }}>
        <HighlightedText text={`${nodeKey}:`} className="text-muted-foreground" {...highlightProps} />
        <HighlightedText text={String(value)} className="text-info-600" {...highlightProps} />
      </div>
    );
  }
  if (typeof value === "string") {
    return (
      <div className="flex items-start gap-1" style={{ paddingLeft: depth * 16 }}>
        <HighlightedText
          text={`${nodeKey}:`}
          className="flex-shrink-0 text-muted-foreground"
          {...highlightProps}
        />
        <HighlightedText text={`"${value}"`} className="break-all text-success-700" {...highlightProps} />
      </div>
    );
  }
  if (Array.isArray(value)) {
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="-ml-1 flex items-center gap-1 rounded px-1 text-left hover:bg-muted"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
          )}
          <HighlightedText text={`${nodeKey}:`} className="text-muted-foreground" {...highlightProps} />
          <span className="text-muted-foreground/70">[{value.length}]</span>
        </button>
        {isExpanded &&
          value.map((item, index) => (
            <JsonNode
              key={index}
              nodeKey={String(index)}
              value={item}
              depth={depth + 1}
              {...highlightProps}
            />
          ))}
      </div>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="-ml-1 flex items-center gap-1 rounded px-1 text-left hover:bg-muted"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
          )}
          <HighlightedText text={`${nodeKey}:`} className="text-muted-foreground" {...highlightProps} />
          <span className="text-muted-foreground/70">
            {"{"}{entries.length}{"}"}
          </span>
        </button>
        {isExpanded &&
          entries.map(([entryKey, entryValue]) => (
            <JsonNode
              key={entryKey}
              nodeKey={entryKey}
              value={entryValue}
              depth={depth + 1}
              {...highlightProps}
            />
          ))}
      </div>
    );
  }
  return null;
}

function highlightJsonString(raw: string, searchTerm?: string): string {
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  let highlighted = escaped
    .replace(
      /(&quot;(?:\\.|[^&])*?&quot;)\s*:/g,
      '<span class="text-foreground/80 font-medium">$1</span>:',
    )
    .replace(
      /:\s*(&quot;(?:\\.|[^&])*?&quot;)/g,
      ': <span class="text-success-700">$1</span>',
    )
    .replace(
      /:\s*(\d+\.?\d*)/g,
      ': <span class="text-info-600">$1</span>',
    )
    .replace(
      /:\s*(true|false)/g,
      ': <span class="text-accent-600">$1</span>',
    )
    .replace(
      /:\s*(null)/g,
      ': <span class="italic text-muted-foreground/70">$1</span>',
    );

  if (searchTerm) {
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(`(${escapedTerm})`, "gi");
    highlighted = highlighted.replace(
      searchRegex,
      '<mark class="rounded px-0.5 bg-warning-100 text-foreground">$1</mark>',
    );
  }

  return highlighted;
}

type ViewMode = "raw" | "tree";

const SIMULATED_FETCH_DELAY_MS = 1500;

export function AdminFhirViewerPage() {
  const [selectedResource, setSelectedResource] =
    useState<FhirResourceType>("Patient");
  const [viewMode, setViewMode] = useState<ViewMode>("raw");
  const [hasCopied, setHasCopied] = useState(false);

  // Live FHIR querying state
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [resourceIdQuery, setResourceIdQuery] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  // Validation state
  const [isValidationVisible, setIsValidationVisible] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Bundle search state
  const [bundleSearchTerm, setBundleSearchTerm] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  const bundle = DEMO_BUNDLES[selectedResource];
  const jsonString = JSON.stringify(bundle, null, 2);
  const entryCount =
    bundle && "entry" in bundle
      ? (bundle as { entry: unknown[] }).entry.length
      : 0;

  const totalMatches = bundleSearchTerm ? findMatchIndices(jsonString, bundleSearchTerm).length : 0;

  const handleCopyBundle = async () => {
    await navigator.clipboard.writeText(jsonString);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleFetchLive = () => {
    if (!resourceIdQuery.trim()) return;
    setIsFetching(true);
    // Simulate a fetch delay, then show the demo data
    setTimeout(() => {
      setIsFetching(false);
    }, SIMULATED_FETCH_DELAY_MS);
  };

  const handleValidate = () => {
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      setIsValidationVisible(true);
    }, 800);
  };

  const handleNextMatch = () => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex((totalMatches + currentMatchIndex + 1) % totalMatches);
  };

  const handlePreviousMatch = () => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex((totalMatches + currentMatchIndex - 1) % totalMatches);
  };

  const handleBundleSearchChange = (searchValue: string) => {
    setBundleSearchTerm(searchValue);
    setCurrentMatchIndex(0);
  };

  // Keyboard shortcut: Ctrl+F when viewer is focused
  useEffect(() => {
    const containerElement = viewerContainerRef.current;
    if (!containerElement) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "f") {
        event.preventDefault();
        const searchInput = containerElement.querySelector<HTMLInputElement>(
          "[data-bundle-search-input]",
        );
        searchInput?.focus();
      }
    };

    containerElement.addEventListener("keydown", handleKeyDown);
    return () => containerElement.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset validation panel when resource type changes
  useEffect(() => {
    setIsValidationVisible(false);
  }, [selectedResource]);

  // Compute validation summary
  const validationResults = DEMO_VALIDATION_RESULTS[selectedResource];
  const passCount = validationResults.filter((result) => result.severity === "pass").length;
  const warningCount = validationResults.filter((result) => result.severity === "warning").length;
  const errorCount = validationResults.filter((result) => result.severity === "error").length;

  return (
    <div className="space-y-6">
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* Header with live mode toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
            <FileJson className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              FHIR Resource Viewer
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse and query FHIR R4 bundles by resource type
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="live-mode-toggle"
              checked={isLiveMode}
              onCheckedChange={setIsLiveMode}
            />
            <Label htmlFor="live-mode-toggle" className="text-sm text-foreground/80">
              Fetch Live
            </Label>
          </div>
          {isLiveMode ? (
            <Badge className="border-success-200 bg-success-50 text-success-700 hover:bg-success-50">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-success-500" />
              Live
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">
              Demo Data
            </Badge>
          )}
        </div>
      </div>

      {/* Live mode search bar */}
      {isLiveMode && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              placeholder="Enter Patient ID or Resource ID"
              value={resourceIdQuery}
              onChange={(event) => setResourceIdQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleFetchLive();
              }}
              className="pl-9"
            />
          </div>
          <button
            onClick={handleFetchLive}
            disabled={isFetching || !resourceIdQuery.trim()}
            className={clsxMerge(
              "flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
              "bg-primary-700 text-white hover:bg-primary-800",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {isFetching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Search</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Toolbar: resource selector, view mode, validate, copy */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label
            htmlFor="resource-type"
            className="text-sm font-medium text-foreground/80"
          >
            Resource Type
          </label>
          <Select
            value={selectedResource}
            onValueChange={(resourceValue) => {
              setSelectedResource(resourceValue as FhirResourceType);
              setBundleSearchTerm("");
              setCurrentMatchIndex(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-56" id="resource-type">
              <SelectValue placeholder="Select resource type" />
            </SelectTrigger>
            <SelectContent>
              {RESOURCE_TYPES.map((resourceType) => (
                <SelectItem key={resourceType} value={resourceType}>
                  {resourceType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card">
            <button
              onClick={() => setViewMode("raw")}
              className={clsxMerge(
                "flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm font-medium transition-colors",
                viewMode === "raw"
                  ? "bg-primary-700 text-white"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Code2 className="h-4 w-4" />
              <span className="hidden sm:inline">Raw JSON</span>
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={clsxMerge(
                "flex items-center gap-1.5 rounded-r-lg px-3 py-2 text-sm font-medium transition-colors",
                viewMode === "tree"
                  ? "bg-primary-700 text-white"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="hidden sm:inline">Tree View</span>
            </button>
          </div>

          <button
            onClick={handleValidate}
            disabled={isValidating}
            className={clsxMerge(
              "flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
              isValidationVisible
                ? "border-success-300 bg-success-50 text-success-700"
                : "border-border bg-card text-muted-foreground hover:bg-muted",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Validate</span>
          </button>

          <button
            onClick={handleCopyBundle}
            className={clsxMerge(
              "flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
              hasCopied
                ? "border-success-300 bg-success-50 text-success-700"
                : "border-border bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {hasCopied ? (
              <CopiedLabel />
            ) : (
              <CopyLabel />
            )}
          </button>
        </div>
      </div>

      {/* Fetching overlay message */}
      {isFetching && (
        <div className="flex items-center justify-center gap-3 rounded-lg border border-primary-200 bg-primary-50 p-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary-700" />
          <span className="text-sm font-medium text-primary-700">
            Fetching {selectedResource} resource for &quot;{resourceIdQuery}&quot;...
          </span>
        </div>
      )}

      {/* JSON Viewer panel */}
      {!isFetching && (
        <div
          ref={viewerContainerRef}
          className="rounded-xl border border-border bg-card shadow-sm"
          tabIndex={-1}
        >
          {/* Viewer header */}
          <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-2">
              <FileJson className="h-4 w-4 text-primary-700" />
              <span className="text-sm font-medium text-foreground">
                {selectedResource} Bundle
              </span>
              <span className="text-xs text-muted-foreground">
                {entryCount} resource(s)
              </span>
            </div>

            {/* Bundle search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  data-bundle-search-input
                  type="text"
                  placeholder="Search in bundle..."
                  value={bundleSearchTerm}
                  onChange={(event) => handleBundleSearchChange(event.target.value)}
                  className={clsxMerge(
                    "h-8 w-full rounded-md border border-border bg-muted pl-8 pr-3 text-xs text-foreground",
                    "placeholder:text-muted-foreground/70",
                    "focus:border-primary-300 focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary-300",
                    "sm:w-48",
                  )}
                />
              </div>
              {bundleSearchTerm && (
                <div className="flex items-center gap-1">
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {totalMatches > 0
                      ? `${currentMatchIndex + 1} of ${totalMatches}`
                      : "0 matches"}
                  </span>
                  <button
                    onClick={handlePreviousMatch}
                    disabled={totalMatches === 0}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                    aria-label="Previous match"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleNextMatch}
                    disabled={totalMatches === 0}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                    aria-label="Next match"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* JSON content */}
          <div className="overflow-x-auto p-4 sm:p-5">
            {viewMode === "raw" ? (
              <pre
                className="text-xs leading-relaxed sm:text-sm"
                dangerouslySetInnerHTML={{
                  __html: highlightJsonString(jsonString, bundleSearchTerm),
                }}
              />
            ) : (
              <div className="space-y-0.5 font-mono text-xs sm:text-sm">
                {Object.entries(bundle).map(([entryKey, entryValue]) => (
                  <JsonNode
                    key={entryKey}
                    nodeKey={entryKey}
                    value={entryValue}
                    depth={0}
                    searchTerm={bundleSearchTerm}
                    currentMatchIndex={currentMatchIndex}
                    matchCounter={{ current: 0 }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation results panel */}
      {isValidationVisible && !isFetching && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary-700" />
              <span className="text-sm font-medium text-foreground">
                FHIR R4 Validation Results
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-success-700">{passCount} passed</span>
                {", "}
                <span className="font-medium text-warning-700">{warningCount} warning{warningCount !== 1 ? "s" : ""}</span>
                {", "}
                <span className="font-medium text-error-700">{errorCount} error{errorCount !== 1 ? "s" : ""}</span>
              </span>
              <button
                onClick={() => setIsValidationVisible(false)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/70 hover:bg-muted hover:text-muted-foreground"
                aria-label="Close validation panel"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-neutral-50 p-2 sm:p-3">
            {validationResults.map((result) => (
              <div
                key={result.field}
                className="flex items-start gap-2 rounded-lg px-3 py-2"
              >
                <ValidationIcon severity={result.severity} />
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {result.field}:
                  </span>
                  <span
                    className={clsxMerge(
                      "text-xs",
                      result.severity === "pass" && "text-success-700",
                      result.severity === "warning" && "text-warning-700",
                      result.severity === "error" && "text-error-700",
                    )}
                  >
                    {result.severity === "pass" ? "\u2713" : result.severity === "warning" ? "\u26A0" : "\u2717"}{" "}
                    {result.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ValidationIcon({ severity }: { readonly severity: ValidationSeverity }) {
  switch (severity) {
    case "pass":
      return <CircleCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-600" />;
    case "warning":
      return <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning-600" />;
    case "error":
      return <CircleX className="mt-0.5 h-4 w-4 flex-shrink-0 text-error-600" />;
  }
}

function CopiedLabel() {
  return (
    <>
      <Check className="h-4 w-4" />
      <span className="hidden sm:inline">Copied!</span>
    </>
  );
}

function CopyLabel() {
  return (
    <>
      <Copy className="h-4 w-4" />
      <span className="hidden sm:inline">Copy Bundle</span>
    </>
  );
}
