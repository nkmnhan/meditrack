import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { toast } from "sonner";
import {
  Stethoscope,
  Activity,
  StickyNote,
  Pill,
  Paperclip,
  ArrowLeft,
  MoreVertical,
  CheckCircle,
  Clock,
  Archive,
  Loader2,
  Sparkles,
  CalendarDays,
  AlertTriangle,
  Heart,
  HeartPulse,
  Thermometer,
  Wind,
  Scale,
  Ruler,
  Calculator,
  FileImage,
  FileText,
  Download,
  Plus,
  Upload,
  X,
  FileUp,
  Printer,
  FileDown,
  Pencil,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  MessageCircle,
  Search,
  ListChecks,
} from "lucide-react";
import type { MedicalRecordResponse, ClinicalNoteType } from "../types";
import { RecordStatus, ClinicalNoteTypes, DiagnosisSeverity } from "../types";
import { SeverityBadge, StatusBadge, PrescriptionStatusBadge } from "./MedicalRecordBadges";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import {
  useResolveMedicalRecordMutation,
  useMarkRequiresFollowUpMutation,
  useArchiveMedicalRecordMutation,
  useAddClinicalNoteMutation,
  useAddAttachmentMutation,
  useUpdateDiagnosisMutation,
} from "../store/medicalRecordsApi";
import { useRoles } from "@/shared/auth/useRoles";
import { UserRole } from "@/shared/auth/roles";
import { useClaraPanel } from "@/shared/components/clara/ClaraPanelContext";

/* ── Drug interaction map ── */

interface DrugAllergyEntry {
  readonly allergen: string;
  readonly medications: string[];
  readonly severity: "high" | "moderate";
}

const DRUG_ALLERGY_MAP: DrugAllergyEntry[] = [
  {
    allergen: "Penicillin",
    medications: ["Amoxicillin", "Ampicillin", "Augmentin", "Penicillin", "Piperacillin"],
    severity: "high",
  },
  {
    allergen: "Sulfa",
    medications: ["Sulfamethoxazole", "Bactrim", "Septra", "Sulfasalazine"],
    severity: "high",
  },
  {
    allergen: "NSAIDs",
    medications: ["Aspirin", "Ibuprofen", "Naproxen", "Ketorolac", "Diclofenac", "Celecoxib"],
    severity: "moderate",
  },
  {
    allergen: "Aspirin",
    medications: ["Aspirin", "Ibuprofen", "Naproxen", "Ketorolac"],
    severity: "moderate",
  },
  {
    allergen: "Codeine",
    medications: ["Codeine", "Morphine", "Hydrocodone", "Oxycodone", "Tramadol"],
    severity: "high",
  },
  {
    allergen: "Cephalosporin",
    medications: ["Cephalexin", "Cefazolin", "Ceftriaxone", "Cefuroxime"],
    severity: "high",
  },
  {
    allergen: "Latex",
    medications: ["Avocado", "Banana", "Kiwi"],
    severity: "moderate",
  },
];

interface DrugInteractionWarning {
  readonly medication: string;
  readonly allergen: string;
  readonly severity: "high" | "moderate";
}

/**
 * Cross-reference prescriptions against known patient allergies to detect
 * potential drug-allergy interactions.
 */
function detectDrugInteractions(
  prescriptions: MedicalRecordResponse["prescriptions"],
  patientAllergies: string[],
): DrugInteractionWarning[] {
  const warnings: DrugInteractionWarning[] = [];
  const normalizedAllergies = patientAllergies.map((allergy) => allergy.toLowerCase().trim());

  for (const prescription of prescriptions) {
    const normalizedMedication = prescription.medicationName.toLowerCase().trim();

    for (const entry of DRUG_ALLERGY_MAP) {
      const allergenMatches = normalizedAllergies.some(
        (allergy) =>
          allergy.includes(entry.allergen.toLowerCase()) ||
          entry.allergen.toLowerCase().includes(allergy),
      );

      if (!allergenMatches) continue;

      const medicationMatches = entry.medications.some(
        (medication) =>
          normalizedMedication.includes(medication.toLowerCase()) ||
          medication.toLowerCase().includes(normalizedMedication),
      );

      if (medicationMatches) {
        warnings.push({
          medication: prescription.medicationName,
          allergen: entry.allergen,
          severity: entry.severity,
        });
      }
    }
  }

  return warnings;
}

/* ── Vital sign sparkline data (static demo) ── */

const VITAL_TREND_DATA: Record<string, { readings: number[]; trend: "up" | "down" | "stable" }> = {
  "Blood Pressure": { readings: [128, 132, 130, 135, 138], trend: "up" },
  "Heart Rate": { readings: [72, 74, 70, 73, 72], trend: "stable" },
  "Temperature": { readings: [98.6, 98.4, 98.8, 99.0, 98.7], trend: "stable" },
  "Respiratory Rate": { readings: [16, 17, 16, 18, 17], trend: "stable" },
  "O2 Saturation": { readings: [98, 97, 98, 96, 97], trend: "down" },
  "Weight": { readings: [175, 176, 177, 176, 178], trend: "up" },
  "Height": { readings: [70, 70, 70, 70, 70], trend: "stable" },
  "BMI": { readings: [25.1, 25.2, 25.4, 25.3, 25.5], trend: "up" },
};

/* ── Sparkline SVG component ── */

function Sparkline({ readings, isWarning }: { readonly readings: number[]; readonly isWarning?: boolean }) {
  if (readings.length < 2) return null;

  const width = 60;
  const height = 20;
  const padding = 2;

  const minValue = Math.min(...readings);
  const maxValue = Math.max(...readings);
  const range = maxValue - minValue || 1;

  const points = readings.map((reading, index) => {
    const xPosition = padding + (index / (readings.length - 1)) * (width - padding * 2);
    const yPosition = height - padding - ((reading - minValue) / range) * (height - padding * 2);
    return `${xPosition},${yPosition}`;
  });

  const pathData = points.map((point, index) => (index === 0 ? `M${point}` : `L${point}`)).join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="mt-1"
      role="img"
      aria-label="Trend sparkline"
    >
      <path
        d={pathData}
        fill="none"
        stroke={isWarning ? "currentColor" : "currentColor"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isWarning ? "text-warning-500" : "text-primary-500"}
      />
    </svg>
  );
}

/* ── Vital sign config ── */

const VITAL_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  "Blood Pressure": { icon: Heart, color: "text-warning-500" },
  "Heart Rate": { icon: HeartPulse, color: "text-success-500" },
  "Temperature": { icon: Thermometer, color: "text-foreground/80" },
  "Respiratory Rate": { icon: Wind, color: "text-success-500" },
  "O2 Saturation": { icon: Wind, color: "text-success-500" },
  "Weight": { icon: Scale, color: "text-foreground/80" },
  "Height": { icon: Ruler, color: "text-foreground/80" },
  "BMI": { icon: Calculator, color: "text-success-500" },
};

const DEFAULT_VITAL_CONFIG = { icon: Activity, color: "text-info-700" };

/* ── Note type options ── */

const NOTE_TYPE_OPTIONS: ClinicalNoteType[] = [
  ClinicalNoteTypes.ProgressNote,
  ClinicalNoteTypes.SoapNote,
  ClinicalNoteTypes.Assessment,
  ClinicalNoteTypes.Plan,
  ClinicalNoteTypes.ProcedureNote,
  ClinicalNoteTypes.ConsultationNote,
  ClinicalNoteTypes.DischargeSummary,
];

const SOAP_NOTE_PLACEHOLDER = "S: (Subjective)\n\nO: (Objective)\n\nA: (Assessment)\n\nP: (Plan)";

/* ── Upload config ── */

const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png,.dcm";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Note type colors ── */

const NOTE_TYPE_COLORS: Record<string, string> = {
  "Progress Note": "bg-primary-100 text-primary-700",
  "SOAP Note": "bg-secondary-100 text-secondary-700",
  "Assessment": "bg-accent-100 text-accent-700",
  "Plan": "bg-info-100 text-info-700",
  "Procedure Note": "bg-warning-100 text-warning-700",
  "Consultation Note": "bg-primary-100 text-primary-700",
  "Discharge Summary": "bg-muted text-foreground/80",
};

/* ── Print styles ── */

const PRINT_STYLES = `
@media print {
  nav, header, [data-print-hide], .print-hide {
    display: none !important;
  }
  body {
    font-size: 12pt;
  }
  .print-expand {
    max-height: none !important;
    overflow: visible !important;
  }
}
`;

/* ── Sub-components ── */

function SectionCard({
  icon: Icon,
  title,
  iconColor = "text-primary-700",
  right,
  children,
}: {
  readonly icon: React.ElementType;
  readonly title: string;
  readonly iconColor?: string;
  readonly right?: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="print-expand rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 pb-3 pt-5">
        <div className="flex items-center gap-2">
          <Icon className={clsxMerge("h-5 w-5", iconColor)} />
          <h2 className="font-semibold text-foreground">{title}</h2>
        </div>
        {right}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm font-medium leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

interface VitalCardProps {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly warning?: boolean;
  readonly warningText?: string;
  readonly vitalKey: string;
}

function VitalCard({ label, value, unit, warning, warningText, vitalKey }: VitalCardProps) {
  const config = VITAL_CONFIG[vitalKey] || DEFAULT_VITAL_CONFIG;
  const VitalIcon = config.icon;
  const colorClass = warning ? "text-warning-500" : config.color;
  const trendData = VITAL_TREND_DATA[vitalKey];

  return (
    <div className="rounded-lg bg-muted p-4">
      <VitalIcon className={clsxMerge("mb-2 h-4 w-4", colorClass)} />
      <div className="flex items-center gap-1.5">
        <p className={clsxMerge("text-2xl font-bold", colorClass)}>{value}</p>
        {trendData && trendData.trend !== "stable" && (
          trendData.trend === "up" ? (
            <TrendingUp className={clsxMerge("h-4 w-4", warning ? "text-warning-500" : "text-muted-foreground")} />
          ) : (
            <TrendingDown className={clsxMerge("h-4 w-4", warning ? "text-warning-500" : "text-muted-foreground")} />
          )
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {label}
        {unit ? ` (${unit})` : ""}
      </p>
      {trendData && (
        <Sparkline readings={trendData.readings} isWarning={warning} />
      )}
      {warning && warningText && (
        <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-warning-600">
          <AlertTriangle className="h-3 w-3" />
          <span>{warningText}</span>
        </div>
      )}
    </div>
  );
}

/* ── Clara Quick Actions Panel ── */

function ClaraQuickActions({ recordId }: { readonly recordId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { openPanel } = useClaraPanel();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const quickActions = [
    {
      label: "Ask Clara about this record",
      icon: MessageCircle,
      prompt: `Help me understand medical record ${recordId}. What are the key findings?`,
    },
    {
      label: "Summarize findings",
      icon: Search,
      prompt: `Summarize all findings, diagnoses, and treatment plans for record ${recordId}.`,
    },
    {
      label: "Check for gaps",
      icon: ListChecks,
      prompt: `Review medical record ${recordId} for any gaps in documentation, missing follow-ups, or incomplete assessments.`,
    },
  ];

  return (
    <div className="print-hide fixed bottom-20 right-4 z-40 md:bottom-24 md:right-6" ref={panelRef}>
      {isOpen && (
        <div
          className={clsxMerge(
            "mb-3 w-72 rounded-lg border border-border bg-card shadow-xl",
            "animate-in fade-in slide-in-from-bottom-2 duration-200"
          )}
        >
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-600" />
              <p className="text-sm font-semibold text-foreground">Clara AI</p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Quick actions for this record</p>
          </div>
          <div className="p-2">
            {quickActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => {
                    openPanel(action.prompt);
                    setIsOpen(false);
                  }}
                  className={clsxMerge(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5",
                    "text-left text-sm text-foreground/80",
                    "transition-colors hover:bg-muted"
                  )}
                >
                  <ActionIcon className="h-4 w-4 flex-shrink-0 text-accent-600" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsxMerge(
          "flex h-12 w-12 items-center justify-center md:h-14 md:w-14",
          "rounded-full shadow-lg",
          "bg-gradient-to-br from-accent-500 to-accent-700",
          "text-white transition-all duration-200",
          "hover:shadow-xl hover:scale-105",
          "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
        )}
        aria-label="Clara quick actions"
        title="Clara quick actions"
      >
        <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-300 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent-400" />
        </span>
      </button>
    </div>
  );
}

/* ── Severity options for edit mode ── */

const SEVERITY_OPTIONS = [
  DiagnosisSeverity.Mild,
  DiagnosisSeverity.Moderate,
  DiagnosisSeverity.Severe,
  DiagnosisSeverity.Critical,
];

/* ── Main component ── */

interface MedicalRecordDetailProps {
  readonly record: MedicalRecordResponse;
  readonly patientAllergies?: string[];
}

export function MedicalRecordDetail({ record, patientAllergies = [] }: MedicalRecordDetailProps) {
  const isAiGenerated = Boolean("origin" in record && (record as Record<string, unknown>).origin === "AI");
  const navigate = useNavigate();
  const auth = useAuth();
  const { hasAnyRole } = useRoles();
  const isMedicalStaff = hasAnyRole([UserRole.Doctor, UserRole.Nurse]);

  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  /* ── Edit mode state ── */
  const [isEditing, setIsEditing] = useState(false);
  const [editDiagnosisDescription, setEditDiagnosisDescription] = useState(record.diagnosisDescription);
  const [editDiagnosisCode, setEditDiagnosisCode] = useState(record.diagnosisCode);
  const [editSeverity, setEditSeverity] = useState<DiagnosisSeverity>(record.severity);

  /* ── Add Note state ── */
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteType, setNoteType] = useState<ClinicalNoteType>(ClinicalNoteTypes.SoapNote);
  const [noteContent, setNoteContent] = useState("");

  /* ── Upload Attachment state ── */
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadInProgress, setIsUploadInProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!showActions) return;
    function handleClickOutside(event: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActions]);

  const [resolveRecord, { isLoading: isResolving }] = useResolveMedicalRecordMutation();
  const [markFollowUp, { isLoading: isMarkingFollowUp }] = useMarkRequiresFollowUpMutation();
  const [archiveRecord, { isLoading: isArchiving }] = useArchiveMedicalRecordMutation();
  const [addClinicalNote, { isLoading: isSavingNote }] = useAddClinicalNoteMutation();
  const [addAttachment] = useAddAttachmentMutation();
  const [updateDiagnosis, { isLoading: isSavingEdit }] = useUpdateDiagnosisMutation();

  /* ── Drug interaction warnings ── */
  const drugInteractionWarnings = detectDrugInteractions(record.prescriptions, patientAllergies);

  async function handleResolve() {
    try {
      await resolveRecord(record.id).unwrap();
      setShowActions(false);
      toast.success("Record marked as resolved.");
    } catch {
      toast.error("Failed to resolve record. Please try again.");
    }
  }

  async function handleMarkFollowUp() {
    try {
      await markFollowUp(record.id).unwrap();
      setShowActions(false);
      toast.success("Record marked for follow-up.");
    } catch {
      toast.error("Failed to mark for follow-up. Please try again.");
    }
  }

  async function handleArchive() {
    try {
      await archiveRecord(record.id).unwrap();
      setShowActions(false);
      toast.success("Record archived.");
    } catch {
      toast.error("Failed to archive record. Please try again.");
    }
  }

  /* ── Print / Export handlers ── */

  function handlePrint() {
    window.print();
  }

  function handleExportPdf() {
    toast.info("Generating PDF... This may take a moment.");
    // Simulated — actual PDF generation would call a backend endpoint
  }

  /* ── Edit handlers ── */

  function handleStartEdit() {
    setIsEditing(true);
    setEditDiagnosisDescription(record.diagnosisDescription);
    setEditDiagnosisCode(record.diagnosisCode);
    setEditSeverity(record.severity);
    setShowActions(false);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditDiagnosisDescription(record.diagnosisDescription);
    setEditDiagnosisCode(record.diagnosisCode);
    setEditSeverity(record.severity);
  }

  async function handleSaveEdit() {
    if (!editDiagnosisDescription.trim()) {
      toast.error("Diagnosis description cannot be empty.");
      return;
    }
    if (!editDiagnosisCode.trim()) {
      toast.error("Diagnosis code cannot be empty.");
      return;
    }

    try {
      await updateDiagnosis({
        id: record.id,
        body: {
          diagnosisDescription: editDiagnosisDescription.trim(),
          diagnosisCode: editDiagnosisCode.trim(),
          severity: editSeverity,
        },
      }).unwrap();
      toast.success("Record updated successfully.");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update record. Please try again.");
    }
  }

  /* ── Add Note handlers ── */

  function handleOpenAddNote() {
    setIsAddingNote(true);
    setNoteType(ClinicalNoteTypes.SoapNote);
    setNoteContent("");
  }

  function handleCancelAddNote() {
    setIsAddingNote(false);
    setNoteType(ClinicalNoteTypes.SoapNote);
    setNoteContent("");
  }

  async function handleSaveNote() {
    if (!noteContent.trim()) {
      toast.error("Note content cannot be empty.");
      return;
    }

    const authorId = auth.user?.profile?.sub ?? "";
    const authorName = (auth.user?.profile?.name as string) ?? "Unknown";

    try {
      await addClinicalNote({
        id: record.id,
        body: {
          noteType,
          content: noteContent.trim(),
          authorId,
          authorName,
        },
      }).unwrap();
      toast.success("Clinical note added successfully.");
      handleCancelAddNote();
    } catch {
      toast.error("Failed to add clinical note. Please try again.");
    }
  }

  /* ── Upload handlers ── */

  function handleOpenUpload() {
    setIsUploadingFile(true);
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploadInProgress(false);
  }

  function handleCancelUpload() {
    setIsUploadingFile(false);
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploadInProgress(false);
  }

  function handleFileSelect(file: File) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File exceeds the 10 MB limit. Selected file: ${formatFileSize(file.size)}`);
      return;
    }
    setSelectedFile(file);
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input so re-selecting the same file triggers onChange
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleRemoveFile() {
    setSelectedFile(null);
  }

  async function handleUploadFile() {
    if (!selectedFile) return;

    setIsUploadInProgress(true);
    setUploadProgress(0);

    const uploadedById = auth.user?.profile?.sub ?? "";
    const uploadedByName = (auth.user?.profile?.name as string) ?? "Unknown";

    // Simulate upload progress since actual file upload endpoint may not exist yet
    const progressInterval = setInterval(() => {
      setUploadProgress((previous) => {
        if (previous >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return previous + 10;
      });
    }, 200);

    try {
      // Use a placeholder storageUrl since actual file upload/storage is not yet implemented
      await addAttachment({
        id: record.id,
        body: {
          fileName: selectedFile.name,
          contentType: selectedFile.type || "application/octet-stream",
          fileSizeBytes: selectedFile.size,
          storageUrl: `placeholder://${selectedFile.name}`,
          uploadedById,
          uploadedByName,
        },
      }).unwrap();

      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success(`"${selectedFile.name}" uploaded successfully.`);
      handleCancelUpload();
    } catch {
      clearInterval(progressInterval);
      setIsUploadInProgress(false);
      setUploadProgress(0);
      toast.error("Failed to upload attachment. Please try again.");
    }
  }

  const formattedDate = new Date(record.recordedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  function getAttachmentIcon(contentType: string) {
    if (contentType.startsWith("image/")) {
      return <FileImage className="h-5 w-5 flex-shrink-0 text-primary-700" />;
    }
    return <FileText className="h-5 w-5 flex-shrink-0 text-primary-700" />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Print styles injected via style tag */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className={clsxMerge(
                "flex h-10 w-10 items-center justify-center",
                "rounded-lg border border-border",
                "transition-colors hover:bg-muted",
                "print-hide"
              )}
            >
              <ArrowLeft className="h-5 w-5 text-foreground/80" />
            </button>
            <h1 className="text-2xl font-bold text-foreground">{record.chiefComplaint}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 pl-[52px]">
            <StatusBadge status={record.status} size="md" />
            <SeverityBadge severity={record.severity} size="md" />
          </div>
          <p className="mt-2 pl-[52px] text-sm text-muted-foreground">
            {record.recordedByDoctorName} — Created {formattedDate}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Print & Export buttons */}
          <button
            onClick={handlePrint}
            className={clsxMerge(
              "flex h-10 w-10 items-center justify-center",
              "rounded-lg border border-border bg-card",
              "transition-colors hover:bg-muted",
              "print-hide"
            )}
            title="Print record"
          >
            <Printer className="h-4 w-4 text-foreground/80" />
          </button>
          <button
            onClick={handleExportPdf}
            className={clsxMerge(
              "flex h-10 w-10 items-center justify-center",
              "rounded-lg border border-border bg-card",
              "transition-colors hover:bg-muted",
              "print-hide"
            )}
            title="Export as PDF"
          >
            <FileDown className="h-4 w-4 text-foreground/80" />
          </button>

          {/* Actions dropdown */}
          {isMedicalStaff && record.status !== RecordStatus.Archived && (
            <div className="relative print-hide" ref={actionsRef}>
              <button
                onClick={() => setShowActions(!showActions)}
                className={clsxMerge(
                  "flex h-10 w-10 items-center justify-center",
                  "rounded-lg border border-border bg-card",
                  "transition-colors hover:bg-muted"
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showActions && (
                <div
                  className={clsxMerge(
                    "absolute right-0 z-10 mt-2 w-48",
                    "rounded-lg border border-border bg-card shadow-lg"
                  )}
                >
                  {/* Edit Record */}
                  <button
                    onClick={handleStartEdit}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted"
                  >
                    <Pencil className="h-4 w-4 text-primary-600" />
                    Edit Record
                  </button>

                  {record.status !== RecordStatus.Resolved && (
                    <button
                      onClick={handleResolve}
                      disabled={isResolving}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                    >
                      {isResolving ? (
                        <Loader2 className="h-4 w-4 animate-spin text-success-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-success-600" />
                      )}
                      Mark as Resolved
                    </button>
                  )}

                  {record.status !== RecordStatus.RequiresFollowUp && (
                    <button
                      onClick={handleMarkFollowUp}
                      disabled={isMarkingFollowUp}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                    >
                      {isMarkingFollowUp ? (
                        <Loader2 className="h-4 w-4 animate-spin text-warning-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-warning-600" />
                      )}
                      Requires Follow-up
                    </button>
                  )}

                  <button
                    onClick={handleArchive}
                    disabled={isArchiving}
                    className="flex w-full items-center gap-2 border-t border-border px-4 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  >
                    {isArchiving ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Archive className="h-4 w-4 text-muted-foreground" />
                    )}
                    Archive Record
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Origin Banner */}
      {isAiGenerated && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-accent-100 bg-accent-50 px-4 py-3">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-accent-700" />
          <span className="text-sm text-accent-700">
            This record was generated by Clara AI on {formattedDate}.
          </span>
          <Link
            to={`/clara/session/${record.appointmentId || ""}`}
            className="text-sm font-medium text-accent-700 hover:underline"
          >
            View session &rarr;
          </Link>
        </div>
      )}

      {/* Drug Interaction Warnings */}
      {drugInteractionWarnings.length > 0 && (
        <div className="space-y-2">
          {drugInteractionWarnings.map((warning) => (
            <div
              key={`${warning.medication}-${warning.allergen}`}
              className={clsxMerge(
                "flex items-start gap-3 rounded-lg border px-4 py-3",
                warning.severity === "high"
                  ? "border-error-200 bg-error-50"
                  : "border-warning-200 bg-warning-50"
              )}
            >
              <ShieldAlert
                className={clsxMerge(
                  "mt-0.5 h-5 w-5 flex-shrink-0",
                  warning.severity === "high" ? "text-error-600" : "text-warning-600"
                )}
              />
              <div>
                <p
                  className={clsxMerge(
                    "text-sm font-medium",
                    warning.severity === "high" ? "text-error-700" : "text-warning-700"
                  )}
                >
                  Potential interaction: {warning.medication} may cross-react with {warning.allergen} allergy
                </p>
                <p
                  className={clsxMerge(
                    "mt-0.5 text-xs",
                    warning.severity === "high" ? "text-error-600" : "text-warning-600"
                  )}
                >
                  {warning.severity === "high"
                    ? "High severity — review immediately with prescribing physician"
                    : "Moderate severity — monitor patient for adverse reactions"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {/* Diagnosis & Chief Complaint */}
        <SectionCard icon={Stethoscope} title="Diagnosis & Chief Complaint">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="edit-chief-complaint"
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Chief Complaint
                </label>
                <p className="text-sm font-medium text-foreground">{record.chiefComplaint}</p>
                <p className="mt-1 text-xs text-muted-foreground/70">Chief complaint cannot be changed after creation</p>
              </div>

              <div>
                <label
                  htmlFor="edit-diagnosis-description"
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Diagnosis Description
                </label>
                <textarea
                  id="edit-diagnosis-description"
                  rows={3}
                  value={editDiagnosisDescription}
                  onChange={(event) => setEditDiagnosisDescription(event.target.value)}
                  className={clsxMerge(
                    "w-full rounded-lg border border-border bg-card px-3 py-2",
                    "text-sm leading-relaxed text-foreground",
                    "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
                    "resize-y"
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-diagnosis-code"
                    className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Diagnosis Code (ICD-10)
                  </label>
                  <input
                    id="edit-diagnosis-code"
                    type="text"
                    value={editDiagnosisCode}
                    onChange={(event) => setEditDiagnosisCode(event.target.value)}
                    className={clsxMerge(
                      "w-full rounded-lg border border-border bg-card px-3 py-2",
                      "font-mono text-sm text-foreground",
                      "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    )}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-severity"
                    className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Severity
                  </label>
                  <select
                    id="edit-severity"
                    value={editSeverity}
                    onChange={(event) => setEditSeverity(event.target.value as DiagnosisSeverity)}
                    className={clsxMerge(
                      "w-full rounded-lg border border-border bg-card px-3 py-2",
                      "text-sm text-foreground",
                      "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    )}
                  >
                    {SEVERITY_OPTIONS.map((severity) => (
                      <option key={severity} value={severity}>
                        {severity}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSavingEdit}
                  className={clsxMerge(
                    "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4",
                    "border border-border bg-card text-sm font-medium text-foreground/80",
                    "transition-colors hover:bg-muted",
                    "disabled:opacity-50"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || !editDiagnosisDescription.trim() || !editDiagnosisCode.trim()}
                  className={clsxMerge(
                    "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4",
                    "bg-primary-700 text-sm font-medium text-white",
                    "transition-colors hover:bg-primary-800",
                    "disabled:opacity-50"
                  )}
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Chief Complaint">{record.chiefComplaint}</Field>
              <Field label="Primary Diagnosis">
                {record.diagnosisDescription}{" "}
                <span className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                  {record.diagnosisCode}
                </span>
              </Field>
            </div>
          )}
        </SectionCard>

        {/* Vital Signs */}
        {record.vitalSigns.length > 0 && (
          <SectionCard
            icon={Activity}
            title="Vital Signs"
            right={
              <span className="hidden text-xs text-muted-foreground sm:block">
                Recorded {new Date(record.vitalSigns[0].recordedAt).toLocaleString()}
              </span>
            }
          >
            {record.vitalSigns.map((vitals) => (
              <div key={vitals.id} className="mb-4 last:mb-0">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {vitals.bloodPressureFormatted != null && (
                    <VitalCard
                      vitalKey="Blood Pressure"
                      label="Blood Pressure"
                      value={vitals.bloodPressureFormatted}
                      unit="mmHg"
                      warning={
                        (vitals.bloodPressureSystolic != null && vitals.bloodPressureSystolic > 140) ||
                        (vitals.bloodPressureDiastolic != null && vitals.bloodPressureDiastolic > 90)
                      }
                      warningText="Monitor closely"
                    />
                  )}
                  {vitals.heartRate != null && (
                    <VitalCard
                      vitalKey="Heart Rate"
                      label="Heart Rate"
                      value={String(vitals.heartRate)}
                      unit="bpm"
                      warning={vitals.heartRate > 100 || vitals.heartRate < 60}
                      warningText="Abnormal range"
                    />
                  )}
                  {vitals.temperature != null && (
                    <VitalCard
                      vitalKey="Temperature"
                      label="Temperature"
                      value={String(vitals.temperature)}
                      unit="°F"
                      warning={vitals.temperature > 100.4 || vitals.temperature < 97}
                      warningText="Outside normal"
                    />
                  )}
                  {vitals.respiratoryRate != null && (
                    <VitalCard
                      vitalKey="Respiratory Rate"
                      label="Respiratory Rate"
                      value={String(vitals.respiratoryRate)}
                      unit="/min"
                      warning={vitals.respiratoryRate > 20 || vitals.respiratoryRate < 12}
                      warningText="Abnormal range"
                    />
                  )}
                  {vitals.oxygenSaturation != null && (
                    <VitalCard
                      vitalKey="O2 Saturation"
                      label="O₂ Saturation"
                      value={String(vitals.oxygenSaturation)}
                      unit="%"
                      warning={vitals.oxygenSaturation < 95}
                      warningText="Low oxygen"
                    />
                  )}
                  {vitals.weight != null && (
                    <VitalCard
                      vitalKey="Weight"
                      label="Weight"
                      value={String(vitals.weight)}
                      unit="lbs"
                    />
                  )}
                  {vitals.height != null && (
                    <VitalCard
                      vitalKey="Height"
                      label="Height"
                      value={String(vitals.height)}
                      unit="in"
                    />
                  )}
                  {vitals.bmi != null && (
                    <VitalCard
                      vitalKey="BMI"
                      label="BMI"
                      value={vitals.bmi.toFixed(1)}
                      warning={vitals.bmi > 30 || vitals.bmi < 18.5}
                      warningText={vitals.bmi > 30 ? "Obese range" : "Underweight"}
                    />
                  )}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Recorded by {vitals.recordedByName} on{" "}
                  {new Date(vitals.recordedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </SectionCard>
        )}

        {/* Clinical Notes */}
        {record.clinicalNotes.length > 0 && (
          <SectionCard
            icon={StickyNote}
            title="Clinical Notes"
            right={
              <button
                onClick={handleOpenAddNote}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Note
              </button>
            }
          >
            <div className="divide-y divide-border">
              {record.clinicalNotes.map((note, noteIndex) => (
                <div key={note.id} className={noteIndex === 0 ? "pb-5" : "py-5"}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={clsxMerge(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        NOTE_TYPE_COLORS[note.noteType as ClinicalNoteType] || "bg-muted text-foreground/80"
                      )}
                    >
                      {note.noteType}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {note.authorName} · {new Date(note.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>

            {/* Inline Add Note Form */}
            {isAddingNote && (
              <div className="mt-4 space-y-4 rounded-lg border border-border bg-muted p-4">
                <div>
                  <label
                    htmlFor="note-type-select"
                    className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Note Type
                  </label>
                  <select
                    id="note-type-select"
                    value={noteType}
                    onChange={(event) => setNoteType(event.target.value as ClinicalNoteType)}
                    className={clsxMerge(
                      "w-full rounded-lg border border-border bg-card px-3 py-2",
                      "text-sm text-foreground",
                      "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    )}
                  >
                    {NOTE_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="note-content-textarea"
                    className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Content
                  </label>
                  <textarea
                    id="note-content-textarea"
                    rows={6}
                    value={noteContent}
                    onChange={(event) => setNoteContent(event.target.value)}
                    placeholder={
                      noteType === ClinicalNoteTypes.SoapNote
                        ? SOAP_NOTE_PLACEHOLDER
                        : "Enter note content..."
                    }
                    className={clsxMerge(
                      "w-full rounded-lg border border-border bg-card px-3 py-2",
                      "text-sm leading-relaxed text-foreground",
                      "placeholder:text-muted-foreground/70",
                      "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
                      "resize-y"
                    )}
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCancelAddNote}
                    disabled={isSavingNote}
                    className={clsxMerge(
                      "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4",
                      "border border-border bg-card text-sm font-medium text-foreground/80",
                      "transition-colors hover:bg-muted",
                      "disabled:opacity-50"
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={isSavingNote || !noteContent.trim()}
                    className={clsxMerge(
                      "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4",
                      "bg-primary-700 text-sm font-medium text-white",
                      "transition-colors hover:bg-primary-800",
                      "disabled:opacity-50"
                    )}
                  >
                    {isSavingNote ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Note"
                    )}
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {/* Prescriptions */}
        {record.prescriptions.length > 0 && (
          <SectionCard icon={Pill} title="Prescriptions" iconColor="text-secondary-700">
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Medication</th>
                    <th className="pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Dosage</th>
                    <th className="pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Frequency</th>
                    <th className="pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Prescribed By</th>
                    <th className="pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Start Date</th>
                    <th className="pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {record.prescriptions.map((prescription) => (
                    <tr key={prescription.id} className="transition-colors hover:bg-muted">
                      <td className="py-3 font-medium text-foreground">{prescription.medicationName}</td>
                      <td className="py-3 text-foreground/80">{prescription.dosage}</td>
                      <td className="py-3 text-foreground/80">{prescription.frequency}</td>
                      <td className="py-3 text-foreground/80">{prescription.prescribedByName}</td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(prescription.prescribedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3">
                        <PrescriptionStatusBadge status={prescription.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {record.prescriptions.map((prescription) => (
                <div key={prescription.id} className="space-y-1.5 rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{prescription.medicationName}</p>
                    <PrescriptionStatusBadge status={prescription.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {prescription.dosage} · {prescription.frequency}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {prescription.prescribedByName} ·{" "}
                    {new Date(prescription.prescribedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Recommended Follow-up */}
        {record.status === RecordStatus.RequiresFollowUp && (
          <SectionCard
            icon={CalendarDays}
            title="Recommended Follow-up"
            iconColor="text-secondary-700"
            right={
              <Link
                to="/appointments"
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
              >
                Book Appointment &rarr;
              </Link>
            }
          >
            <p className="text-sm text-foreground/80">
              This record requires follow-up. Please schedule a follow-up appointment with the patient.
            </p>
          </SectionCard>
        )}

        {/* Attachments */}
        {record.attachments.length > 0 && (
          <SectionCard
            icon={Paperclip}
            title="Attachments"
            right={
              <button
                onClick={handleOpenUpload}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </button>
            }
          >
            <div className="space-y-2">
              {record.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.storageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={clsxMerge(
                    "flex items-center gap-3 rounded-lg p-3",
                    "transition-colors hover:bg-muted"
                  )}
                >
                  {getAttachmentIcon(attachment.contentType)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{attachment.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.fileSizeFormatted} · {new Date(attachment.uploadedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="h-9 w-9 flex-shrink-0 rounded-lg text-muted-foreground transition-colors hover:bg-muted"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Download className="mx-auto h-4 w-4" />
                  </button>
                </a>
              ))}
            </div>

            {/* Inline Upload Form */}
            {isUploadingFile && (
              <div className="mt-4 space-y-4 rounded-lg border border-border bg-muted p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {!selectedFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={clsxMerge(
                      "flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8",
                      "transition-colors",
                      isDragOver
                        ? "border-primary-500 bg-primary-50"
                        : "border-border bg-card hover:border-primary-400 hover:bg-muted"
                    )}
                  >
                    <FileUp
                      className={clsxMerge(
                        "h-8 w-8",
                        isDragOver ? "text-primary-600" : "text-muted-foreground/70"
                      )}
                    />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground/80">
                        Drag and drop a file here, or{" "}
                        <span className="text-primary-700">click to browse</span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Supported: PDF, JPEG, PNG, DICOM
                      </p>
                      <p className="text-xs text-muted-foreground">Max 10 MB per file</p>
                    </div>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {/* Selected file display */}
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                      {getAttachmentIcon(selectedFile.type)}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      {!isUploadInProgress && (
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className={clsxMerge(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground/80"
                          )}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Upload progress */}
                    {isUploadInProgress && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full rounded-full bg-primary-600 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCancelUpload}
                    disabled={isUploadInProgress}
                    className={clsxMerge(
                      "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4",
                      "border border-border bg-card text-sm font-medium text-foreground/80",
                      "transition-colors hover:bg-muted",
                      "disabled:opacity-50"
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadFile}
                    disabled={!selectedFile || isUploadInProgress}
                    className={clsxMerge(
                      "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4",
                      "bg-primary-700 text-sm font-medium text-white",
                      "transition-colors hover:bg-primary-800",
                      "disabled:opacity-50"
                    )}
                  >
                    {isUploadInProgress ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        )}
      </div>

      {/* Clara Quick Actions FAB */}
      <ClaraQuickActions recordId={record.id} />
    </div>
  );
}
