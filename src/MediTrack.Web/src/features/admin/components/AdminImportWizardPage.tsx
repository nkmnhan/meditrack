import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  Table,
  CheckCircle2,
  FileUp,
  Loader2,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  Copy,
  Users,
  Save,
  FolderOpen,
  X,
  SkipForward,
  Wrench,
  GitMerge,
  Plus,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";

const BREADCRUMB_ITEMS = [
  { label: "Home", href: "/dashboard" },
  { label: "Admin", href: "/admin/dashboard" },
  { label: "Data Import" },
];

/* ── Step definitions ── */

const WIZARD_STEPS = [
  { label: "Upload", icon: Upload },
  { label: "Map Fields", icon: Table },
  { label: "Preview", icon: Table },
  { label: "Duplicates", icon: Users },
  { label: "Confirm", icon: CheckCircle2 },
] as const;

/* ── Demo field mapping data ── */

interface FieldMapping {
  readonly sourceField: string;
  readonly targetField: string;
}

const DEMO_FIELD_MAPPINGS: FieldMapping[] = [
  { sourceField: "first_name", targetField: "Patient.name.given" },
  { sourceField: "last_name", targetField: "Patient.name.family" },
  { sourceField: "dob", targetField: "Patient.birthDate" },
  { sourceField: "gender", targetField: "Patient.gender" },
  { sourceField: "phone", targetField: "Patient.telecom.phone" },
  { sourceField: "email", targetField: "Patient.telecom.email" },
  { sourceField: "address_line", targetField: "Patient.address.line" },
  { sourceField: "city", targetField: "Patient.address.city" },
];

const TARGET_FIELD_OPTIONS = [
  "Patient.name.given",
  "Patient.name.family",
  "Patient.birthDate",
  "Patient.gender",
  "Patient.telecom.phone",
  "Patient.telecom.email",
  "Patient.address.line",
  "Patient.address.city",
  "Patient.address.state",
  "Patient.address.postalCode",
  "Patient.identifier",
  "-- Skip --",
];

/* ── Demo preview data ── */

const DEMO_PREVIEW_HEADERS = [
  "first_name",
  "last_name",
  "dob",
  "gender",
  "phone",
  "email",
];

const DEMO_PREVIEW_ROWS = [
  ["Sarah", "Johnson", "1985-01-15", "female", "(555) 123-4567", "sarah.j@email.com"],
  ["Michael", "Chen", "1978-06-22", "male", "555.234.5678", "m.chen@email.com"],
  ["Emily", "Rodriguez", "03/08/1992", "female", "(555) 345-6789", ""],
  ["James", "Wilson", "1965-11-30", "male", "(555) 456-7890", "j.wilson@email.com"],
  ["Aisha", "Patel", "2001-09-14", "female", "(555) 567-8901", "a.patel@email.com"],
];

/* ── Validation types and demo data ── */

type ValidationErrorType = "invalid_phone" | "missing_email" | "invalid_date" | "duplicate_mrn";

interface CellValidationError {
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly errorType: ValidationErrorType;
  readonly message: string;
}

const VALIDATION_ERROR_CONFIG: Record<ValidationErrorType, { readonly label: string; readonly icon: typeof Phone }> = {
  invalid_phone: { label: "invalid phone numbers", icon: Phone },
  missing_email: { label: "missing required email", icon: Mail },
  invalid_date: { label: "invalid date format", icon: Calendar },
  duplicate_mrn: { label: "duplicate MRN", icon: Copy },
};

const DEMO_VALIDATION_ERRORS: CellValidationError[] = [
  { rowIndex: 1, columnIndex: 4, errorType: "invalid_phone", message: "Phone format should be (XXX) XXX-XXXX" },
  { rowIndex: 2, columnIndex: 2, errorType: "invalid_date", message: "Date should be YYYY-MM-DD format" },
  { rowIndex: 2, columnIndex: 5, errorType: "missing_email", message: "Email is required" },
];

/* ── Duplicate detection types and demo data ── */

type DuplicateAction = "merge" | "skip" | "create_new" | null;
type MatchConfidence = "high" | "medium";

interface DuplicateMatch {
  readonly importedName: string;
  readonly existingName: string;
  readonly existingMrn: string;
  readonly confidence: MatchConfidence;
  readonly matchReason: string;
}

const DEMO_DUPLICATE_MATCHES: DuplicateMatch[] = [
  {
    importedName: "Sarah Johnson",
    existingName: "Sarah A. Johnson",
    existingMrn: "PT-2024-001",
    confidence: "high",
    matchReason: "Name + DOB match",
  },
  {
    importedName: "James Wilson",
    existingName: "James R. Wilson",
    existingMrn: "PT-2024-047",
    confidence: "medium",
    matchReason: "Name match only",
  },
];

/* ── Mapping template types ── */

const TEMPLATE_STORAGE_KEY = "meditrack_import_templates";

interface MappingTemplate {
  readonly name: string;
  readonly mappings: FieldMapping[];
}

const DEFAULT_TEMPLATES: MappingTemplate[] = [
  {
    name: "Standard Patient Import",
    mappings: DEMO_FIELD_MAPPINGS,
  },
];

function loadTemplatesFromStorage(): MappingTemplate[] {
  try {
    const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as MappingTemplate[];
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_TEMPLATES;
}

function saveTemplatesToStorage(templates: MappingTemplate[]): void {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
}

/* ── Step Indicator ── */

interface StepIndicatorProps {
  readonly currentStep: number;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {WIZARD_STEPS.map((step, index) => {
        const StepIcon = step.icon;
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={clsxMerge(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted && "border-success-500 bg-success-500 text-white",
                  isActive && "border-primary-700 bg-primary-700 text-white",
                  !isCompleted && !isActive && "border-border bg-card text-muted-foreground/70",
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <StepIcon className="h-5 w-5" />
                )}
              </div>
              <span
                className={clsxMerge(
                  "mt-1.5 text-xs font-medium",
                  isActive ? "text-primary-700" : isCompleted ? "text-success-700" : "text-muted-foreground/70",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < WIZARD_STEPS.length - 1 && (
              <div
                className={clsxMerge(
                  "mb-5 h-0.5 w-6 sm:w-12 md:w-20",
                  index < currentStep ? "bg-success-500" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Step 1: Upload ── */

interface UploadStepProps {
  readonly selectedFile: File | null;
  readonly onFileSelect: (file: File) => void;
}

function UploadStep({ selectedFile, onFileSelect }: UploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && isAcceptedFileType(droppedFile.name)) {
      onFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    if (chosen) {
      onFileSelect(chosen);
    }
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={clsxMerge(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors sm:p-12",
          isDragOver
            ? "border-primary-500 bg-primary-50"
            : "border-border bg-muted hover:border-primary-400 hover:bg-primary-50/50",
        )}
      >
        <div
          className={clsxMerge(
            "mb-4 flex h-14 w-14 items-center justify-center rounded-full",
            isDragOver ? "bg-primary-100" : "bg-muted",
          )}
        >
          <FileUp
            className={clsxMerge(
              "h-7 w-7",
              isDragOver ? "text-primary-700" : "text-muted-foreground",
            )}
          />
        </div>
        <p className="text-sm font-medium text-foreground">
          Drag and drop your file here
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          or click to browse files
        </p>
        <p className="mt-3 text-xs text-muted-foreground/70">
          Accepted formats: .json, .csv
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {selectedFile && (
        <div className="flex items-center gap-3 rounded-lg border border-success-200 bg-success-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {selectedFile.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Step 2: Map Fields ── */

interface MapFieldsStepProps {
  readonly fieldMappings: FieldMapping[];
  readonly onMappingChange: (index: number, targetField: string) => void;
  readonly onLoadTemplate: (mappings: FieldMapping[]) => void;
}

function MapFieldsStep({ fieldMappings, onMappingChange, onLoadTemplate }: MapFieldsStepProps) {
  const [templates, setTemplates] = useState<MappingTemplate[]>(loadTemplatesFromStorage);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");

  const handleSaveTemplate = () => {
    const trimmedName = templateNameInput.trim();
    if (!trimmedName) return;

    const newTemplate: MappingTemplate = {
      name: trimmedName,
      mappings: fieldMappings,
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    saveTemplatesToStorage(updatedTemplates);
    setTemplateNameInput("");
    setIsSaveModalOpen(false);
  };

  const handleDeleteTemplate = (templateIndex: number) => {
    const updatedTemplates = templates.filter((_, index) => index !== templateIndex);
    setTemplates(updatedTemplates);
    saveTemplatesToStorage(updatedTemplates);
  };

  const handleLoadTemplate = (templateName: string) => {
    const selectedTemplate = templates.find((template) => template.name === templateName);
    if (selectedTemplate) {
      onLoadTemplate(selectedTemplate.mappings);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Map source fields from your file to MediTrack FHIR fields.
      </p>

      {/* Template management bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground/80">Templates</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.map((template, templateIndex) => (
              <div
                key={template.name}
                className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1"
              >
                <button
                  onClick={() => handleLoadTemplate(template.name)}
                  className="text-xs font-medium text-primary-700 hover:text-primary-800"
                >
                  {template.name}
                </button>
                <button
                  onClick={() => handleDeleteTemplate(templateIndex)}
                  className="ml-1 rounded p-0.5 text-muted-foreground/70 hover:bg-muted hover:text-error-600"
                  aria-label={`Delete template ${template.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {templates.length === 0 && (
              <span className="text-xs text-muted-foreground/70">No saved templates</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsSaveModalOpen(true)}
          className={clsxMerge(
            "flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium transition-colors",
            "text-foreground/80 hover:bg-muted",
          )}
        >
          <Save className="h-3.5 w-3.5" />
          Save as Template
        </button>
      </div>

      {/* Save template modal */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Mapping Template</DialogTitle>
            <DialogDescription>
              Save the current field mappings as a reusable template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="template-name" className="text-sm font-medium text-foreground/80">
                Template Name
              </label>
              <Input
                id="template-name"
                value={templateNameInput}
                onChange={(event) => setTemplateNameInput(event.target.value)}
                placeholder="e.g., Standard Patient Import"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSaveTemplate();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setIsSaveModalOpen(false)}
              className="flex h-9 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground/80 hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTemplate}
              disabled={!templateNameInput.trim()}
              className={clsxMerge(
                "flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-medium text-white transition-colors",
                templateNameInput.trim()
                  ? "bg-primary-700 hover:bg-primary-800"
                  : "cursor-not-allowed bg-border",
              )}
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field mapping table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="px-4 py-3 text-left font-medium text-foreground/80">
                Source Field
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground/70">
                &rarr;
              </th>
              <th className="px-4 py-3 text-left font-medium text-foreground/80">
                Target Field
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {fieldMappings.map((mapping, index) => (
              <tr key={mapping.sourceField}>
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80">
                    {mapping.sourceField}
                  </code>
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground/50">
                  <ArrowRight className="mx-auto h-4 w-4" />
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={mapping.targetField}
                    onValueChange={(targetValue) => onMappingChange(index, targetValue)}
                  >
                    <SelectTrigger className="h-9 w-full text-xs sm:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_FIELD_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Step 3: Preview with Validation ── */

interface PreviewStepProps {
  readonly skippedRows: Set<number>;
  readonly onToggleSkipRow: (rowIndex: number) => void;
}

function PreviewStep({ skippedRows, onToggleSkipRow }: PreviewStepProps) {
  // Group errors by type for the summary
  const errorsByType = DEMO_VALIDATION_ERRORS.reduce<Record<ValidationErrorType, CellValidationError[]>>(
    (accumulator, error) => {
      if (!accumulator[error.errorType]) {
        accumulator[error.errorType] = [];
      }
      accumulator[error.errorType].push(error);
      return accumulator;
    },
    {} as Record<ValidationErrorType, CellValidationError[]>,
  );

  const errorLookup = new Map<string, CellValidationError>();
  for (const error of DEMO_VALIDATION_ERRORS) {
    errorLookup.set(`${error.rowIndex}-${error.columnIndex}`, error);
  }

  const rowsWithErrors = new Set(DEMO_VALIDATION_ERRORS.map((error) => error.rowIndex));

  const totalErrors = DEMO_VALIDATION_ERRORS.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Preview the first 5 rows of data to verify the import looks correct.
      </p>

      {/* Validation error summary */}
      {totalErrors > 0 && (
        <div className="space-y-3 rounded-lg border border-warning-200 bg-warning-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning-600" />
            <span className="text-sm font-semibold text-warning-800">
              {totalErrors} validation {totalErrors === 1 ? "issue" : "issues"} found
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {(Object.entries(errorsByType) as [ValidationErrorType, CellValidationError[]][]).map(
              ([errorType, errors]) => {
                const config = VALIDATION_ERROR_CONFIG[errorType];
                const ErrorIcon = config.icon;
                const uniqueRows = new Set(errors.map((error) => error.rowIndex));
                return (
                  <div
                    key={errorType}
                    className="flex items-center gap-1.5 rounded-md bg-card/70 px-2.5 py-1.5"
                  >
                    <ErrorIcon className="h-3.5 w-3.5 text-warning-700" />
                    <span className="text-xs text-warning-800">
                      {uniqueRows.size} {uniqueRows.size === 1 ? "row has" : "rows have"} {config.label}
                    </span>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* Data table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                #
              </th>
              {DEMO_PREVIEW_HEADERS.map((header) => (
                <th
                  key={header}
                  className="px-3 py-2.5 text-left text-xs font-medium text-foreground/80"
                >
                  {header}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center text-xs font-medium text-foreground/80">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {DEMO_PREVIEW_ROWS.map((row, rowIndex) => {
              const isSkipped = skippedRows.has(rowIndex);
              const hasRowError = rowsWithErrors.has(rowIndex);
              return (
                <tr
                  key={rowIndex}
                  className={clsxMerge(
                    "hover:bg-muted",
                    isSkipped && "opacity-40",
                  )}
                >
                  <td className="px-3 py-2.5 text-xs text-muted-foreground/70">
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, cellIndex) => {
                    const cellError = errorLookup.get(`${rowIndex}-${cellIndex}`);
                    return (
                      <td
                        key={cellIndex}
                        className={clsxMerge(
                          "whitespace-nowrap px-3 py-2.5 text-xs",
                          cellError && !isSkipped
                            ? "text-error-700"
                            : "text-foreground/80",
                        )}
                      >
                        <div
                          className={clsxMerge(
                            "inline-block rounded px-1.5 py-0.5",
                            cellError && !isSkipped
                              ? "border border-error-200 bg-error-50"
                              : "",
                          )}
                          title={cellError?.message}
                        >
                          {cell || <span className="italic text-error-400">empty</span>}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center">
                    {hasRowError && (
                      <div className="flex items-center justify-center gap-1">
                        {!isSkipped ? (
                          <>
                            <button
                              onClick={() => onToggleSkipRow(rowIndex)}
                              className="flex h-7 items-center gap-1 rounded border border-border px-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                              title="Skip this row during import"
                            >
                              <SkipForward className="h-3 w-3" />
                              <span className="hidden sm:inline">Skip</span>
                            </button>
                            <button
                              className="flex h-7 items-center gap-1 rounded border border-primary-200 bg-primary-50 px-2 text-xs font-medium text-primary-700 hover:bg-primary-100"
                              title="Mark for manual fix"
                            >
                              <Wrench className="h-3 w-3" />
                              <span className="hidden sm:inline">Fix</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onToggleSkipRow(rowIndex)}
                            className="flex h-7 items-center gap-1 rounded border border-border px-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                            title="Include this row again"
                          >
                            <Plus className="h-3 w-3" />
                            <span className="hidden sm:inline">Include</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground/70">
        Showing 5 of 5 records
        {skippedRows.size > 0 && (
          <span className="ml-2 text-warning-600">
            ({skippedRows.size} row{skippedRows.size !== 1 ? "s" : ""} will be skipped)
          </span>
        )}
      </p>
    </div>
  );
}

/* ── Step 4: Duplicate Detection ── */

interface DuplicateStepProps {
  readonly duplicateActions: DuplicateAction[];
  readonly onDuplicateActionChange: (matchIndex: number, action: DuplicateAction) => void;
}

function DuplicateStep({ duplicateActions, onDuplicateActionChange }: DuplicateStepProps) {
  const resolvedCount = duplicateActions.filter((action) => action !== null).length;
  const totalDuplicates = DEMO_DUPLICATE_MATCHES.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        We found potential duplicates in your import. Review each match and choose an action.
      </p>

      {/* Summary */}
      <div className="flex items-center gap-2 rounded-lg border border-info-200 bg-info-50 px-4 py-3">
        <Users className="h-5 w-5 flex-shrink-0 text-info-600" />
        <span className="text-sm text-info-800">
          <span className="font-semibold">{totalDuplicates} potential duplicates</span> found
          {resolvedCount > 0 && (
            <span className="ml-1 text-info-600">
              ({resolvedCount} of {totalDuplicates} resolved)
            </span>
          )}
        </span>
      </div>

      {/* Duplicate match cards */}
      <div className="space-y-4">
        {DEMO_DUPLICATE_MATCHES.map((match, matchIndex) => {
          const selectedAction = duplicateActions[matchIndex];
          return (
            <div
              key={matchIndex}
              className={clsxMerge(
                "rounded-lg border p-4",
                selectedAction
                  ? "border-success-200 bg-success-50/30"
                  : "border-border bg-card",
              )}
            >
              {/* Confidence badge */}
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={clsxMerge(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    match.confidence === "high"
                      ? "bg-warning-100 text-warning-800"
                      : "bg-muted text-foreground/80",
                  )}
                >
                  {match.confidence === "high" ? "High" : "Medium"} confidence
                </span>
                <span className="text-xs text-muted-foreground">
                  {match.matchReason}
                </span>
              </div>

              {/* Comparison */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex-1 rounded-md border border-border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground">Imported Record</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{match.importedName}</p>
                </div>
                <div className="hidden text-muted-foreground/50 sm:block">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <div className="flex-1 rounded-md border border-border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground">Existing Record</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{match.existingName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">MRN: {match.existingMrn}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => onDuplicateActionChange(matchIndex, "merge")}
                  className={clsxMerge(
                    "flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
                    selectedAction === "merge"
                      ? "border-primary-300 bg-primary-100 text-primary-800"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <GitMerge className="h-3.5 w-3.5" />
                  Merge
                </button>
                <button
                  onClick={() => onDuplicateActionChange(matchIndex, "skip")}
                  className={clsxMerge(
                    "flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
                    selectedAction === "skip"
                      ? "border-warning-300 bg-warning-100 text-warning-800"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip
                </button>
                <button
                  onClick={() => onDuplicateActionChange(matchIndex, "create_new")}
                  className={clsxMerge(
                    "flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
                    selectedAction === "create_new"
                      ? "border-success-300 bg-success-100 text-success-800"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create New
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step 5: Confirm ── */

interface ConfirmStepProps {
  readonly selectedFile: File | null;
  readonly fieldMappings: FieldMapping[];
  readonly isImporting: boolean;
  readonly importProgress: number;
  readonly isImportComplete: boolean;
  readonly skippedRowCount: number;
  readonly duplicateActions: DuplicateAction[];
  readonly onStartImport: () => void;
}

function ConfirmStep({
  selectedFile,
  fieldMappings,
  isImporting,
  importProgress,
  isImportComplete,
  skippedRowCount,
  duplicateActions,
  onStartImport,
}: ConfirmStepProps) {
  const activeMappings = fieldMappings.filter(
    (mapping) => mapping.targetField !== "-- Skip --",
  );
  const mergeCount = duplicateActions.filter((action) => action === "merge").length;
  const skipDupCount = duplicateActions.filter((action) => action === "skip").length;
  const createNewCount = duplicateActions.filter((action) => action === "create_new").length;
  const totalRecords = DEMO_PREVIEW_ROWS.length;
  const importableRecords = totalRecords - skippedRowCount - skipDupCount;

  return (
    <div className="space-y-6">
      {!isImporting && !isImportComplete && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Review your import configuration before starting.
          </p>
          <div className="rounded-lg border border-border bg-muted p-4 sm:p-5">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">File</dt>
                <dd className="text-foreground">
                  {selectedFile?.name ?? "No file selected"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">File Size</dt>
                <dd className="text-foreground">
                  {selectedFile ? formatFileSize(selectedFile.size) : "--"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">Total Records</dt>
                <dd className="text-foreground">{totalRecords}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">Records to Import</dt>
                <dd className="text-foreground">{importableRecords}</dd>
              </div>
              {skippedRowCount > 0 && (
                <div className="flex justify-between">
                  <dt className="font-medium text-warning-600">Skipped (validation)</dt>
                  <dd className="text-warning-600">{skippedRowCount}</dd>
                </div>
              )}
              {skipDupCount > 0 && (
                <div className="flex justify-between">
                  <dt className="font-medium text-warning-600">Skipped (duplicates)</dt>
                  <dd className="text-warning-600">{skipDupCount}</dd>
                </div>
              )}
              {mergeCount > 0 && (
                <div className="flex justify-between">
                  <dt className="font-medium text-info-600">Merging into existing</dt>
                  <dd className="text-info-600">{mergeCount}</dd>
                </div>
              )}
              {createNewCount > 0 && (
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">Creating new (despite duplicate)</dt>
                  <dd className="text-foreground">{createNewCount}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">Mapped Fields</dt>
                <dd className="text-foreground">
                  {activeMappings.length} of {fieldMappings.length}
                </dd>
              </div>
            </dl>
          </div>
          <button
            onClick={onStartImport}
            className={clsxMerge(
              "flex h-11 w-full items-center justify-center gap-2 rounded-lg font-medium text-white transition-colors",
              "bg-primary-700 hover:bg-primary-800",
            )}
          >
            <Upload className="h-4 w-4" />
            Start Import
          </button>
        </div>
      )}

      {isImporting && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary-700" />
            <p className="text-sm font-medium text-foreground">
              Importing records...
            </p>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary-700 transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {importProgress}% complete
          </p>
        </div>
      )}

      {isImportComplete && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
            <CheckCircle2 className="h-8 w-8 text-success-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">
              Import Complete
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {importableRecords} records have been successfully imported.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function isAcceptedFileType(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return lowerName.endsWith(".json") || lowerName.endsWith(".csv");
}

/* ── Page Component ── */

export function AdminImportWizardPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(DEMO_FIELD_MAPPINGS);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isImportComplete, setIsImportComplete] = useState(false);
  const [skippedRows, setSkippedRows] = useState<Set<number>>(new Set());
  const [duplicateActions, setDuplicateActions] = useState<DuplicateAction[]>(
    () => DEMO_DUPLICATE_MATCHES.map(() => null),
  );

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleMappingChange = (index: number, targetField: string) => {
    setFieldMappings((previous) =>
      previous.map((mapping, mappingIndex) =>
        mappingIndex === index ? { ...mapping, targetField } : mapping,
      ),
    );
  };

  const handleLoadTemplate = (mappings: FieldMapping[]) => {
    setFieldMappings(mappings);
  };

  const handleToggleSkipRow = (rowIndex: number) => {
    setSkippedRows((previous) => {
      const updated = new Set(previous);
      if (updated.has(rowIndex)) {
        updated.delete(rowIndex);
      } else {
        updated.add(rowIndex);
      }
      return updated;
    });
  };

  const handleDuplicateActionChange = (matchIndex: number, action: DuplicateAction) => {
    setDuplicateActions((previous) =>
      previous.map((existingAction, index) =>
        index === matchIndex ? action : existingAction,
      ),
    );
  };

  const handleStartImport = () => {
    setIsImporting(true);
    setImportProgress(0);

    // Simulated progress
    const progressInterval = setInterval(() => {
      setImportProgress((previous) => {
        if (previous >= 100) {
          clearInterval(progressInterval);
          setIsImporting(false);
          setIsImportComplete(true);
          return 100;
        }
        return previous + 10;
      });
    }, 300);
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep((previous) => previous + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((previous) => previous - 1);
    }
  };

  const isNextDisabled =
    (currentStep === 0 && selectedFile === null) ||
    currentStep === WIZARD_STEPS.length - 1;

  return (
    <div className="space-y-6">
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
            <FileUp className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              Data Import Wizard
            </h1>
            <p className="text-sm text-muted-foreground">
              Import patient data from external files
            </p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <StepIndicator currentStep={currentStep} />
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        {currentStep === 0 && (
          <UploadStep
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
          />
        )}
        {currentStep === 1 && (
          <MapFieldsStep
            fieldMappings={fieldMappings}
            onMappingChange={handleMappingChange}
            onLoadTemplate={handleLoadTemplate}
          />
        )}
        {currentStep === 2 && (
          <PreviewStep
            skippedRows={skippedRows}
            onToggleSkipRow={handleToggleSkipRow}
          />
        )}
        {currentStep === 3 && (
          <DuplicateStep
            duplicateActions={duplicateActions}
            onDuplicateActionChange={handleDuplicateActionChange}
          />
        )}
        {currentStep === 4 && (
          <ConfirmStep
            selectedFile={selectedFile}
            fieldMappings={fieldMappings}
            isImporting={isImporting}
            importProgress={importProgress}
            isImportComplete={isImportComplete}
            skippedRowCount={skippedRows.size}
            duplicateActions={duplicateActions}
            onStartImport={handleStartImport}
          />
        )}
      </div>

      {/* Navigation */}
      {!isImporting && !isImportComplete && (
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={clsxMerge(
              "flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors",
              currentStep === 0
                ? "cursor-not-allowed border-border text-muted-foreground/50"
                : "border-border text-foreground/80 hover:bg-muted",
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          {currentStep < WIZARD_STEPS.length - 1 && (
            <button
              onClick={handleNext}
              disabled={isNextDisabled}
              className={clsxMerge(
                "flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white transition-colors",
                isNextDisabled
                  ? "cursor-not-allowed bg-border"
                  : "bg-primary-700 hover:bg-primary-800",
              )}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
