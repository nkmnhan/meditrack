import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  Sparkles,
  FileText,
  Stethoscope,
  Clock,
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  Pill,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  MessageSquare,
  ChevronRight,
  Mic,
  Search,
  X,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  GitCompareArrows,
  Undo2,
  Redo2,
} from "lucide-react";
import { useGetSessionQuery } from "../store/claraApi";
import { useCreateMedicalRecordMutation } from "@/features/medical-records/store/medicalRecordsApi";
import { DiagnosisSeverity } from "@/features/medical-records/types";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { Breadcrumb } from "@/shared/components";
import { useClaraPanel } from "@/shared/components/clara/ClaraPanelContext";
import { useUndoHistory } from "../hooks/useUndoHistory";
import { NoteQualityIndicator } from "./NoteQualityIndicator";
import { SessionAnalytics } from "./SessionAnalytics";
import { PreviousSessionsList } from "./PreviousSessionsList";
import type { ConfidenceLevel, SessionAnalyticsData, DiagnosisSlot as DiagnosisSlotType, PrescriptionDraft as PrescriptionDraftType } from "../types";

/* ── Types ── */

type PrescriptionDraft = PrescriptionDraftType;

const EMPTY_PRESCRIPTION: PrescriptionDraft = {
  medicationName: "",
  dosage: "",
  frequency: "",
  durationDays: "",
  instructions: "",
};

const SEVERITY_OPTIONS = [
  { value: DiagnosisSeverity.Mild, label: "Mild" },
  { value: DiagnosisSeverity.Moderate, label: "Moderate" },
  { value: DiagnosisSeverity.Severe, label: "Severe" },
  { value: DiagnosisSeverity.Critical, label: "Critical" },
];

const STATUS_OPTIONS = ["Active", "Resolved", "Chronic", "Inactive"] as const;

const SUGGESTION_TYPE_CONFIG: Record<string, {
  barColor: string;
  badgeBg: string;
  badgeText: string;
  icon: typeof AlertTriangle;
}> = {
  Urgent:         { barColor: "bg-error-500",      badgeBg: "bg-error-50",      badgeText: "text-error-700",      icon: AlertTriangle },
  Medication:     { barColor: "bg-secondary-700",   badgeBg: "bg-secondary-50",   badgeText: "text-secondary-700",   icon: Pill },
  Guideline:      { barColor: "bg-primary-700",     badgeBg: "bg-primary-50",     badgeText: "text-primary-700",     icon: BookOpen },
  Recommendation: { barColor: "bg-warning-500",     badgeBg: "bg-warning-50",     badgeText: "text-warning-700",     icon: Lightbulb },
};

const DEFAULT_SUGGESTION_STYLE = {
  barColor: "bg-accent-500",
  badgeBg: "bg-accent-50",
  badgeText: "text-accent-700",
  icon: Sparkles,
};

/* ── ICD-10 Data ── */

interface Icd10Entry {
  readonly code: string;
  readonly description: string;
}

const COMMON_ICD10_CODES: Icd10Entry[] = [
  { code: "R51.9", description: "Headache, unspecified" },
  { code: "J06.9", description: "Acute upper respiratory infection, unspecified" },
  { code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
  { code: "I10", description: "Essential (primary) hypertension" },
  { code: "M54.5", description: "Low back pain" },
  { code: "J45.909", description: "Unspecified asthma, uncomplicated" },
  { code: "F41.1", description: "Generalized anxiety disorder" },
  { code: "F32.9", description: "Major depressive disorder, single episode, unspecified" },
  { code: "K21.0", description: "Gastro-esophageal reflux disease with esophagitis" },
  { code: "N39.0", description: "Urinary tract infection, site not specified" },
  { code: "J02.9", description: "Acute pharyngitis, unspecified" },
  { code: "R10.9", description: "Unspecified abdominal pain" },
  { code: "M79.3", description: "Panniculitis, unspecified" },
  { code: "R05.9", description: "Cough, unspecified" },
  { code: "B34.9", description: "Viral infection, unspecified" },
  { code: "R50.9", description: "Fever, unspecified" },
  { code: "G43.909", description: "Migraine, unspecified, not intractable" },
  { code: "J18.9", description: "Pneumonia, unspecified organism" },
  { code: "L30.9", description: "Dermatitis, unspecified" },
  { code: "R11.2", description: "Nausea with vomiting, unspecified" },
  { code: "M25.50", description: "Pain in unspecified joint" },
  { code: "R07.9", description: "Chest pain, unspecified" },
  { code: "E78.5", description: "Hyperlipidemia, unspecified" },
  { code: "K59.00", description: "Constipation, unspecified" },
  { code: "H66.90", description: "Otitis media, unspecified" },
  { code: "R42", description: "Dizziness and giddiness" },
  { code: "J20.9", description: "Acute bronchitis, unspecified" },
  { code: "L50.9", description: "Urticaria, unspecified" },
  { code: "R53.83", description: "Other fatigue" },
  { code: "S93.40", description: "Sprain of unspecified ligament of ankle" },
];

const MAX_VISIBLE_RESULTS = 8;

/* ── Medication Data (P1) ── */

interface MedicationEntry {
  readonly name: string;
  readonly commonDosages: readonly string[];
  readonly commonFrequencies: readonly string[];
}

const COMMON_MEDICATIONS: MedicationEntry[] = [
  { name: "Lisinopril", commonDosages: ["5mg", "10mg", "20mg", "40mg"], commonFrequencies: ["Once daily", "Twice daily"] },
  { name: "Metformin", commonDosages: ["500mg", "850mg", "1000mg"], commonFrequencies: ["Once daily", "Twice daily", "Three times daily"] },
  { name: "Atorvastatin", commonDosages: ["10mg", "20mg", "40mg", "80mg"], commonFrequencies: ["Once daily"] },
  { name: "Omeprazole", commonDosages: ["10mg", "20mg", "40mg"], commonFrequencies: ["Once daily", "Twice daily"] },
  { name: "Amlodipine", commonDosages: ["2.5mg", "5mg", "10mg"], commonFrequencies: ["Once daily"] },
  { name: "Metoprolol", commonDosages: ["25mg", "50mg", "100mg", "200mg"], commonFrequencies: ["Once daily", "Twice daily"] },
  { name: "Losartan", commonDosages: ["25mg", "50mg", "100mg"], commonFrequencies: ["Once daily", "Twice daily"] },
  { name: "Gabapentin", commonDosages: ["100mg", "300mg", "400mg", "600mg", "800mg"], commonFrequencies: ["Once daily", "Twice daily", "Three times daily"] },
  { name: "Hydrochlorothiazide", commonDosages: ["12.5mg", "25mg", "50mg"], commonFrequencies: ["Once daily"] },
  { name: "Levothyroxine", commonDosages: ["25mcg", "50mcg", "75mcg", "100mcg", "125mcg", "150mcg"], commonFrequencies: ["Once daily"] },
  { name: "Amoxicillin", commonDosages: ["250mg", "500mg", "875mg"], commonFrequencies: ["Twice daily", "Three times daily"] },
  { name: "Azithromycin", commonDosages: ["250mg", "500mg"], commonFrequencies: ["Once daily"] },
  { name: "Prednisone", commonDosages: ["5mg", "10mg", "20mg", "40mg", "60mg"], commonFrequencies: ["Once daily", "Twice daily"] },
  { name: "Albuterol", commonDosages: ["90mcg/actuation", "2.5mg/3mL"], commonFrequencies: ["Every 4-6 hours as needed", "As needed"] },
  { name: "Fluoxetine", commonDosages: ["10mg", "20mg", "40mg", "60mg"], commonFrequencies: ["Once daily"] },
  { name: "Sertraline", commonDosages: ["25mg", "50mg", "100mg", "200mg"], commonFrequencies: ["Once daily"] },
  { name: "Ibuprofen", commonDosages: ["200mg", "400mg", "600mg", "800mg"], commonFrequencies: ["Every 6 hours", "Every 8 hours", "Three times daily"] },
  { name: "Acetaminophen", commonDosages: ["325mg", "500mg", "650mg", "1000mg"], commonFrequencies: ["Every 4-6 hours", "Every 6 hours", "Three times daily"] },
  { name: "Pantoprazole", commonDosages: ["20mg", "40mg"], commonFrequencies: ["Once daily", "Twice daily"] },
  { name: "Montelukast", commonDosages: ["4mg", "5mg", "10mg"], commonFrequencies: ["Once daily at bedtime"] },
  { name: "Clopidogrel", commonDosages: ["75mg", "300mg"], commonFrequencies: ["Once daily"] },
  { name: "Warfarin", commonDosages: ["1mg", "2mg", "2.5mg", "5mg", "7.5mg", "10mg"], commonFrequencies: ["Once daily"] },
  { name: "Insulin Glargine", commonDosages: ["10 units", "20 units", "30 units", "40 units"], commonFrequencies: ["Once daily at bedtime", "Once daily"] },
  { name: "Duloxetine", commonDosages: ["20mg", "30mg", "60mg", "120mg"], commonFrequencies: ["Once daily", "Twice daily"] },
  { name: "Tramadol", commonDosages: ["50mg", "100mg"], commonFrequencies: ["Every 4-6 hours as needed", "Every 6 hours", "Three times daily"] },
];

/* ── AI Confidence (P1) ── */

// ConfidenceLevel imported from types.ts

interface SoapSectionConfig {
  readonly key: string;
  readonly label: string;
  readonly prefix: string;
  readonly confidence: ConfidenceLevel;
}

const SOAP_SECTIONS: SoapSectionConfig[] = [
  { key: "subjective", label: "Subjective", prefix: "S:", confidence: "high" },
  { key: "objective", label: "Objective", prefix: "O:", confidence: "high" },
  { key: "assessment", label: "Assessment", prefix: "A:", confidence: "medium" },
  { key: "plan", label: "Plan", prefix: "P:", confidence: "high" },
];

/* ── Diff View (P2) ── */

interface DiffSegment {
  readonly text: string;
  readonly type: "unchanged" | "addition" | "deletion";
}

const DEMO_DIFF_SECTIONS: Record<string, DiffSegment[]> = {
  assessment: [
    { text: "Patient presents with symptoms consistent with ", type: "unchanged" },
    { text: "acute tension-type headache", type: "deletion" },
    { text: "chronic migraine without aura", type: "addition" },
    { text: ", likely ", type: "unchanged" },
    { text: "stress-related", type: "deletion" },
    { text: "triggered by medication non-compliance", type: "addition" },
    { text: ". Further evaluation recommended.", type: "unchanged" },
  ],
};

/* ── Multi-Diagnosis Labels (P2) ── */

const DIAGNOSIS_RANK_LABELS = ["Primary", "Secondary", "Tertiary", "Quaternary"] as const;
const MAX_DIAGNOSES = 4;

type DiagnosisSlot = DiagnosisSlotType;

const EMPTY_DIAGNOSIS_SLOT: DiagnosisSlot = {
  code: "",
  description: "",
  searchQuery: "",
  isDropdownOpen: false,
  isManualEntry: false,
};

/* ── Component ── */

export function SessionSummary() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading, error } = useGetSessionQuery(sessionId!);
  const [createMedicalRecord, { isLoading: isCreating }] = useCreateMedicalRecordMutation();

  // Form state
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [severity, setSeverity] = useState<DiagnosisSeverity>(DiagnosisSeverity.Moderate);
  const [diagnosisStatus, setDiagnosisStatus] = useState("Active");
  const [prescriptions, setPrescriptions] = useState<PrescriptionDraft[]>([]);
  const [followUp, setFollowUp] = useState("");

  // Multi-diagnosis state (P2 — secondary diagnosis support)
  const [diagnoses, setDiagnoses] = useState<DiagnosisSlot[]>([{ ...EMPTY_DIAGNOSIS_SLOT }]);
  const diagnosisSearchRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Legacy accessors for primary diagnosis (used in save handler)
  const diagnosisCode = diagnoses[0]?.code ?? "";
  const diagnosisDescription = diagnoses[0]?.description ?? "";

  // SOAP section state (P1 — confidence indicators, P2 — diff view)
  const [soapSections, setSoapSections] = useState<Record<string, string>>({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [isDiffViewActive, setIsDiffViewActive] = useState(false);

  // Undo/Redo for form state (Enhancement 1)
  interface FormSnapshot {
    readonly chiefComplaint: string;
    readonly diagnoses: DiagnosisSlot[];
    readonly prescriptions: PrescriptionDraft[];
    readonly soapSections: Record<string, string>;
    readonly severity: DiagnosisSeverity;
    readonly diagnosisStatus: string;
    readonly followUp: string;
  }
  const {
    state: _undoState,
    setState: pushSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoHistory<FormSnapshot>({
    chiefComplaint: "",
    diagnoses: [{ ...EMPTY_DIAGNOSIS_SLOT }],
    prescriptions: [],
    soapSections: { subjective: "", objective: "", assessment: "", plan: "" },
    severity: DiagnosisSeverity.Moderate,
    diagnosisStatus: "Active",
    followUp: "",
  });

  // Push snapshot on blur — captures current form state
  const handleFormBlur = () => {
    pushSnapshot({
      chiefComplaint,
      diagnoses,
      prescriptions,
      soapSections,
      severity,
      diagnosisStatus,
      followUp,
    });
  };

  // Restore state from undo/redo
  useEffect(() => {
    if (_undoState) {
      setChiefComplaint(_undoState.chiefComplaint);
      setDiagnoses(_undoState.diagnoses);
      setPrescriptions(_undoState.prescriptions);
      setSoapSections(_undoState.soapSections);
      setSeverity(_undoState.severity);
      setDiagnosisStatus(_undoState.diagnosisStatus);
      setFollowUp(_undoState.followUp);
    }
  // Only react to undo/redo actions via _undoState reference
  }, [_undoState]);

  // Page context (Enhancement 4)
  const { setPageContext } = useClaraPanel();
  useEffect(() => {
    setPageContext({
      type: "session-summary",
      sessionId,
      patientId: session?.patientId,
    });
    return () => setPageContext({ type: "default" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, session?.patientId]);

  // Medication autocomplete state (P1)
  const [medicationSearchQueries, setMedicationSearchQueries] = useState<Record<number, string>>({});
  const [medicationDropdownOpen, setMedicationDropdownOpen] = useState<Record<number, boolean>>({});
  const medicationSearchRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Filter ICD-10 codes for a given diagnosis slot
  const getFilteredIcd10Codes = (searchQuery: string) => {
    if (searchQuery.length < 1) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return COMMON_ICD10_CODES.filter(
      (entry) =>
        entry.code.toLowerCase().includes(lowerQuery) ||
        entry.description.toLowerCase().includes(lowerQuery),
    ).slice(0, MAX_VISIBLE_RESULTS);
  };

  // Filter medications for a given prescription
  const getFilteredMedications = (searchQuery: string) => {
    if (searchQuery.length < 1) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return COMMON_MEDICATIONS.filter((medication) =>
      medication.name.toLowerCase().includes(lowerQuery),
    ).slice(0, MAX_VISIBLE_RESULTS);
  };

  // Diagnosis handlers
  const handleUpdateDiagnosis = (slotIndex: number, updates: Partial<DiagnosisSlot>) => {
    setDiagnoses(
      diagnoses.map((slot, currentIndex) =>
        currentIndex === slotIndex ? { ...slot, ...updates } : slot,
      ),
    );
  };

  const handleSelectIcd10 = (slotIndex: number, entry: Icd10Entry) => {
    handleUpdateDiagnosis(slotIndex, {
      code: entry.code,
      description: entry.description,
      searchQuery: "",
      isDropdownOpen: false,
    });
  };

  const handleClearDiagnosis = (slotIndex: number) => {
    handleUpdateDiagnosis(slotIndex, {
      code: "",
      description: "",
      searchQuery: "",
      isManualEntry: false,
    });
  };

  const handleSwitchToManualEntry = (slotIndex: number) => {
    handleUpdateDiagnosis(slotIndex, {
      isManualEntry: true,
      isDropdownOpen: false,
      searchQuery: "",
    });
  };

  const handleAddSecondaryDiagnosis = () => {
    if (diagnoses.length >= MAX_DIAGNOSES) return;
    setDiagnoses([...diagnoses, { ...EMPTY_DIAGNOSIS_SLOT }]);
  };

  const handleRemoveSecondaryDiagnosis = (slotIndex: number) => {
    if (slotIndex === 0) return;
    setDiagnoses(diagnoses.filter((_, currentIndex) => currentIndex !== slotIndex));
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close diagnosis dropdowns
      diagnosisSearchRefs.current.forEach((refElement, slotIndex) => {
        if (refElement && !refElement.contains(event.target as Node)) {
          if (diagnoses[slotIndex]?.isDropdownOpen) {
            handleUpdateDiagnosis(slotIndex, { isDropdownOpen: false });
          }
        }
      });
      // Close medication dropdowns
      medicationSearchRefs.current.forEach((refElement, prescriptionIndex) => {
        if (refElement && !refElement.contains(event.target as Node)) {
          if (medicationDropdownOpen[prescriptionIndex]) {
            setMedicationDropdownOpen((previous) => ({
              ...previous,
              [prescriptionIndex]: false,
            }));
          }
        }
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  });

  // Medication autocomplete handlers
  const handleSelectMedication = (prescriptionIndex: number, medication: MedicationEntry) => {
    handlePrescriptionChange(prescriptionIndex, "medicationName", medication.name);
    // Auto-suggest first dosage and frequency
    if (medication.commonDosages.length > 0) {
      handlePrescriptionChange(prescriptionIndex, "dosage", medication.commonDosages[0]);
    }
    if (medication.commonFrequencies.length > 0) {
      handlePrescriptionChange(prescriptionIndex, "frequency", medication.commonFrequencies[0]);
    }
    setMedicationSearchQueries((previous) => ({ ...previous, [prescriptionIndex]: "" }));
    setMedicationDropdownOpen((previous) => ({ ...previous, [prescriptionIndex]: false }));
  };

  const getSelectedMedication = (medicationName: string): MedicationEntry | undefined => {
    return COMMON_MEDICATIONS.find(
      (medication) => medication.name.toLowerCase() === medicationName.toLowerCase(),
    );
  };

  const handleAddPrescription = () => {
    setPrescriptions([...prescriptions, { ...EMPTY_PRESCRIPTION }]);
  };

  const handleRemovePrescription = (index: number) => {
    setPrescriptions(prescriptions.filter((_, prescriptionIndex) => prescriptionIndex !== index));
    // Clean up medication search state
    setMedicationSearchQueries((previous) => {
      const updated = { ...previous };
      delete updated[index];
      return updated;
    });
    setMedicationDropdownOpen((previous) => {
      const updated = { ...previous };
      delete updated[index];
      return updated;
    });
  };

  const handlePrescriptionChange = (
    index: number,
    field: keyof PrescriptionDraft,
    value: string,
  ) => {
    setPrescriptions(
      prescriptions.map((prescription, prescriptionIndex) =>
        prescriptionIndex === index ? { ...prescription, [field]: value } : prescription,
      ),
    );
  };

  const handleSoapSectionChange = (sectionKey: string, value: string) => {
    setSoapSections((previous) => ({ ...previous, [sectionKey]: value }));
  };

  const handleSave = async () => {
    if (!session?.patientId) {
      toast.error("No patient linked to this session. Cannot create medical record.");
      return;
    }
    if (!chiefComplaint.trim() || !diagnosisCode.trim() || !diagnosisDescription.trim()) {
      toast.error("Please fill in the chief complaint, diagnosis code, and description.");
      return;
    }

    try {
      const result = await createMedicalRecord({
        patientId: session.patientId,
        chiefComplaint: chiefComplaint.trim(),
        diagnosisCode: diagnosisCode.trim(),
        diagnosisDescription: diagnosisDescription.trim(),
        severity,
        recordedByDoctorId: session.doctorId,
        recordedByDoctorName: "Current Doctor",
      }).unwrap();
      toast.success("Medical record saved successfully.");
      navigate(`/medical-records/${result.id}`);
    } catch {
      toast.error("Failed to save medical record. Please try again.");
    }
  };

  const handleScheduleFollowUp = () => {
    const patientId = session?.patientId ?? "";
    const reason = encodeURIComponent(followUp || "Follow-up appointment");
    navigate(`/appointments/new?patientId=${patientId}&reason=${reason}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-3 h-12 w-12 text-muted-foreground/50" />
        <p className="text-lg font-semibold text-foreground/80">Session not found</p>
        <Link to="/clara" className="mt-2 text-sm text-primary-700 hover:underline">
          &larr; Back to Clara
        </Link>
      </div>
    );
  }

  const patientStatements = session.transcriptLines.filter(
    (line) => line.speaker === "Patient",
  );

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Clara", href: "/clara" },
          { label: `Session ${sessionId?.slice(0, 8) ?? ""}`, href: `/clara/session/${sessionId}` },
          { label: "Summary" },
        ]}
      />

      {/* Session Analytics (Enhancement 3) */}
      <SessionAnalytics
        data={{
          durationSeconds: session.startedAt && session.endedAt
            ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
            : 0,
          transcriptLineCount: session.transcriptLines.length,
          suggestionsAccepted: 0,
          suggestionsDismissed: 0,
          suggestionsFlagged: 0,
          suggestionsTotal: session.suggestions.length,
          estimatedTimeSavedMinutes: Math.round(session.suggestions.length * 2),
        } satisfies SessionAnalyticsData}
        className="mb-6"
      />

      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground/80 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Review AI-Generated Draft</h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-200 bg-accent-50 px-2.5 py-0.5 text-xs font-semibold text-accent-700">
                <Sparkles className="h-3 w-3" />
                AI Draft
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Mic className="h-3.5 w-3.5" />
                {session.transcriptLines.length} exchanges
              </span>
              <span className="text-muted-foreground/50">&middot;</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {sessionId?.slice(0, 8).toUpperCase()}
              </span>
              <span className="text-muted-foreground/50">&middot;</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-accent-500" />
                {session.suggestions.length} suggestions
              </span>
            </div>
          </div>
        </div>

        {/* Undo/Redo + Show Changes */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground/80 hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Undo"
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground/80 hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Redo"
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsDiffViewActive(!isDiffViewActive)}
            className={clsxMerge(
              "inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors",
              isDiffViewActive
                ? "border-primary-200 bg-primary-50 text-primary-700"
                : "border-border text-foreground/80 hover:bg-muted",
            )}
          >
            <GitCompareArrows className="h-4 w-4" />
            {isDiffViewActive ? "Hide Changes" : "Show Changes"}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col gap-6 pb-24 lg:flex-row lg:pb-0">
        {/* Left column — Session data */}
        <div className="lg:w-[40%] lg:sticky lg:top-6 lg:self-start space-y-4">
          {/* Patient statements */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
              <MessageSquare className="h-4 w-4 text-secondary-700" />
              <h3 className="text-sm font-semibold text-foreground">Key Patient Statements</h3>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-3">
              {patientStatements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No patient statements recorded.</p>
              ) : (
                patientStatements.map((line) => (
                  <div
                    key={line.id}
                    className="rounded-lg border border-secondary-100 bg-secondary-50 px-3 py-2.5 text-xs text-foreground/80 leading-relaxed"
                  >
                    {line.text}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
              <Sparkles className="h-5 w-5 text-accent-500" />
              <h3 className="text-sm font-semibold text-foreground">Clara&apos;s Suggestions</h3>
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-700">
                {session.suggestions.length}
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2.5">
              {session.suggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No suggestions were generated.</p>
              ) : (
                session.suggestions.map((suggestion) => {
                  const config = SUGGESTION_TYPE_CONFIG[suggestion.type] ?? DEFAULT_SUGGESTION_STYLE;
                  const SuggestionIcon = config.icon;
                  return (
                    <div
                      key={suggestion.id}
                      className="flex overflow-hidden rounded-lg border border-border bg-card"
                    >
                      <div className={clsxMerge("w-1 flex-shrink-0", config.barColor)} />
                      <div className="flex-1 p-3">
                        <span className={clsxMerge(
                          "mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          config.badgeBg, config.badgeText,
                        )}>
                          <SuggestionIcon className="h-3 w-3" />
                          {suggestion.type}
                        </span>
                        <p className="text-xs leading-relaxed text-foreground/80 line-clamp-2">
                          {suggestion.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Previous Visits (Enhancement 5) */}
          {session.patientId && (
            <details className="rounded-lg border border-border bg-card p-5">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
                <Clock className="h-4 w-4 text-primary-700" />
                Previous Visits
              </summary>
              <div className="mt-3">
                <PreviousSessionsList
                  patientId={session.patientId}
                  currentSessionId={sessionId}
                />
              </div>
            </details>
          )}

          {/* Session stats strip */}
          <div className="flex items-center justify-around rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{session.transcriptLines.length} exchanges</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{patientStatements.length} patient statements</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent-500" />
              <span>{session.suggestions.length} suggestions</span>
            </div>
          </div>
        </div>

        {/* Right column — Medical record draft form */}
        <div className="lg:w-[60%] space-y-5">
          {/* AI Draft banner */}
          <div className="flex items-center gap-2.5 rounded-lg border border-accent-200 bg-accent-50 px-4 py-3">
            <Sparkles className="h-4 w-4 flex-shrink-0 text-accent-600" />
            <p className="text-sm text-accent-700">
              <strong>AI Generated Draft</strong> — Clara pre-filled this record from the session transcript. Review, edit, and save as the official medical record.
            </p>
          </div>

          {/* Note Quality Indicator (Enhancement 2) */}
          <NoteQualityIndicator
            sectionConfidences={SOAP_SECTIONS.map((section) => section.confidence as ConfidenceLevel)}
          />

          <div className="rounded-lg border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-6 pb-3 pt-5">
              <FileText className="h-5 w-5 text-primary-700" />
              <h3 className="font-semibold text-foreground">Medical Record Draft</h3>
            </div>

            <div className="space-y-6 p-6">
              {/* Chief Complaint */}
              <div>
                <label
                  htmlFor="chiefComplaint"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Chief Complaint <span className="text-error-500">*</span>
                </label>
                <textarea
                  id="chiefComplaint"
                  rows={4}
                  value={chiefComplaint}
                  onChange={(event) => setChiefComplaint(event.target.value)}
                  onBlur={handleFormBlur}
                  placeholder="e.g. Persistent headache for 3 days"
                  className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                />
              </div>

              {/* Multi-Diagnosis Section (P2 — secondary diagnosis support) */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Diagnoses <span className="text-error-500">*</span>
                </label>

                <div className="space-y-4">
                  {diagnoses.map((diagnosisSlot, slotIndex) => {
                    const rankLabel = DIAGNOSIS_RANK_LABELS[slotIndex] ?? `Diagnosis ${slotIndex + 1}`;
                    const filteredCodes = getFilteredIcd10Codes(diagnosisSlot.searchQuery);

                    return (
                      <div
                        key={slotIndex}
                        className="rounded-lg border border-border bg-muted p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className={clsxMerge(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                            slotIndex === 0
                              ? "bg-primary-100 text-primary-700"
                              : "bg-border text-foreground/80",
                          )}>
                            {rankLabel}
                          </span>
                          {slotIndex > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSecondaryDiagnosis(slotIndex)}
                              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-error-600 transition-colors"
                              aria-label={`Remove ${rankLabel.toLowerCase()} diagnosis`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Selected diagnosis chip */}
                        {diagnosisSlot.code && diagnosisSlot.description && !diagnosisSlot.isManualEntry && (
                          <div className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
                            <span className="rounded border border-border bg-card px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                              {diagnosisSlot.code}
                            </span>
                            <span className="text-sm text-foreground/80">{diagnosisSlot.description}</span>
                            <button
                              type="button"
                              onClick={() => handleClearDiagnosis(slotIndex)}
                              className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground/80 transition-colors"
                              aria-label="Clear diagnosis"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Autocomplete search */}
                        {(!diagnosisSlot.code || !diagnosisSlot.description) && !diagnosisSlot.isManualEntry && (
                          <div
                            ref={(element) => { diagnosisSearchRefs.current[slotIndex] = element; }}
                            className="relative"
                          >
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <input
                                type="text"
                                value={diagnosisSlot.searchQuery}
                                onChange={(event) => {
                                  handleUpdateDiagnosis(slotIndex, {
                                    searchQuery: event.target.value,
                                    isDropdownOpen: event.target.value.length >= 1,
                                  });
                                }}
                                onFocus={() => {
                                  if (diagnosisSlot.searchQuery.length >= 1) {
                                    handleUpdateDiagnosis(slotIndex, { isDropdownOpen: true });
                                  }
                                }}
                                placeholder="Search ICD-10 code or description..."
                                className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                              />
                            </div>

                            {/* Dropdown results */}
                            {diagnosisSlot.isDropdownOpen && (
                              <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                                <ul className="max-h-[320px] overflow-y-auto py-1">
                                  {filteredCodes.length === 0 ? (
                                    <li className="px-3 py-2.5 text-sm text-muted-foreground">
                                      No matching codes found.
                                    </li>
                                  ) : (
                                    filteredCodes.map((entry) => {
                                      const lowerQuery = diagnosisSlot.searchQuery.toLowerCase();
                                      const codeMatchStart = entry.code.toLowerCase().indexOf(lowerQuery);
                                      const descriptionMatchStart = entry.description.toLowerCase().indexOf(lowerQuery);

                                      return (
                                        <li key={entry.code}>
                                          <button
                                            type="button"
                                            onClick={() => handleSelectIcd10(slotIndex, entry)}
                                            className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors"
                                          >
                                            <span className="flex-shrink-0 rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                                              {codeMatchStart >= 0 ? (
                                                <>
                                                  {entry.code.slice(0, codeMatchStart)}
                                                  <mark className="bg-warning-200 text-foreground">
                                                    {entry.code.slice(codeMatchStart, codeMatchStart + diagnosisSlot.searchQuery.length)}
                                                  </mark>
                                                  {entry.code.slice(codeMatchStart + diagnosisSlot.searchQuery.length)}
                                                </>
                                              ) : (
                                                entry.code
                                              )}
                                            </span>
                                            <span className="text-sm text-foreground/80">
                                              {descriptionMatchStart >= 0 ? (
                                                <>
                                                  {entry.description.slice(0, descriptionMatchStart)}
                                                  <mark className="bg-warning-200 text-foreground">
                                                    {entry.description.slice(descriptionMatchStart, descriptionMatchStart + diagnosisSlot.searchQuery.length)}
                                                  </mark>
                                                  {entry.description.slice(descriptionMatchStart + diagnosisSlot.searchQuery.length)}
                                                </>
                                              ) : (
                                                entry.description
                                              )}
                                            </span>
                                          </button>
                                        </li>
                                      );
                                    })
                                  )}
                                </ul>
                                <div className="border-t border-border px-3 py-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSwitchToManualEntry(slotIndex)}
                                    className="text-xs font-medium text-primary-700 hover:text-primary-800 hover:underline transition-colors"
                                  >
                                    Enter manually
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Manual entry mode */}
                        {diagnosisSlot.isManualEntry && (
                          <div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
                              <input
                                type="text"
                                value={diagnosisSlot.code}
                                onChange={(event) =>
                                  handleUpdateDiagnosis(slotIndex, { code: event.target.value })
                                }
                                placeholder="e.g. R51.9"
                                className="h-10 w-full rounded-lg border border-border bg-card px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                              />
                              <input
                                type="text"
                                value={diagnosisSlot.description}
                                onChange={(event) =>
                                  handleUpdateDiagnosis(slotIndex, { description: event.target.value })
                                }
                                placeholder="Diagnosis description"
                                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                              />
                            </div>
                            <div className="mt-2 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleUpdateDiagnosis(slotIndex, { isManualEntry: false })}
                                className="text-xs font-medium text-primary-700 hover:text-primary-800 hover:underline transition-colors"
                              >
                                Back to search
                              </button>
                              {diagnosisSlot.code && diagnosisSlot.description && (
                                <div className="inline-flex items-center gap-1.5">
                                  <span className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-foreground/80">
                                    {diagnosisSlot.code}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{diagnosisSlot.description}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add secondary diagnosis button */}
                {diagnoses.length < MAX_DIAGNOSES && (
                  <button
                    type="button"
                    onClick={handleAddSecondaryDiagnosis}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary-300 hover:text-primary-700 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add {DIAGNOSIS_RANK_LABELS[diagnoses.length] ?? "Additional"} Diagnosis
                  </button>
                )}
              </div>

              {/* Severity + Status */}
              <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="severity"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Severity
                </label>
                <div className="relative">
                  <select
                    id="severity"
                    value={severity}
                    onChange={(event) =>
                      setSeverity(event.target.value as DiagnosisSeverity)
                    }
                    className="h-10 w-full appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-sm text-foreground/80 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                  >
                    {SEVERITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Stethoscope className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label
                  htmlFor="diagnosisStatus"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Status
                </label>
                <div className="relative">
                  <select
                    id="diagnosisStatus"
                    value={diagnosisStatus}
                    onChange={(event) => setDiagnosisStatus(event.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-sm text-foreground/80 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              </div>

              {/* SOAP Sections with AI Confidence Indicators (P1) */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Clinical Notes (SOAP)
                </label>
                <div className="space-y-3">
                  {SOAP_SECTIONS.map((section) => {
                    const isHighConfidence = section.confidence === "high";
                    const hasDiffData = isDiffViewActive && DEMO_DIFF_SECTIONS[section.key];

                    return (
                      <div
                        key={section.key}
                        className={clsxMerge(
                          "rounded-lg border bg-card",
                          !isHighConfidence
                            ? "border-l-4 border-l-warning-400 border-t-neutral-200 border-r-neutral-200 border-b-neutral-200"
                            : "border-border",
                        )}
                      >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                          <span className="text-xs font-semibold text-foreground/80">
                            {section.prefix} {section.label}
                          </span>
                          {/* Confidence badge */}
                          {isHighConfidence ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700">
                              <ShieldCheck className="h-3 w-3" />
                              High confidence
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700">
                              <ShieldAlert className="h-3 w-3" />
                              Review recommended
                            </span>
                          )}
                        </div>

                        {/* Diff view (P2) */}
                        {hasDiffData ? (
                          <div className="px-3 py-2">
                            <p className="text-xs leading-relaxed text-foreground/80">
                              {DEMO_DIFF_SECTIONS[section.key]!.map((segment, segmentIndex) => {
                                if (segment.type === "addition") {
                                  return (
                                    <span
                                      key={segmentIndex}
                                      className="rounded bg-success-50 px-0.5 text-success-800"
                                    >
                                      {segment.text}
                                    </span>
                                  );
                                }
                                if (segment.type === "deletion") {
                                  return (
                                    <span
                                      key={segmentIndex}
                                      className="rounded bg-error-50 px-0.5 text-error-700 line-through"
                                    >
                                      {segment.text}
                                    </span>
                                  );
                                }
                                return <span key={segmentIndex}>{segment.text}</span>;
                              })}
                            </p>
                            <textarea
                              value={soapSections[section.key]}
                              onChange={(event) => handleSoapSectionChange(section.key, event.target.value)}
                              rows={2}
                              placeholder={`${section.prefix} ...`}
                              className="mt-2 w-full resize-none rounded-md border border-border px-3 py-2 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                            />
                          </div>
                        ) : (
                          <textarea
                            value={soapSections[section.key]}
                            onChange={(event) => handleSoapSectionChange(section.key, event.target.value)}
                            rows={2}
                            placeholder={`${section.prefix} ...`}
                            className="w-full resize-none border-0 px-3 py-2 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prescriptions with Medication Autocomplete (P1) */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-secondary-700" />
                    <span className="text-sm font-semibold text-foreground">Suggested Prescriptions</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700">
                      <Sparkles className="h-3 w-3" />
                      Clara suggested
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPrescription}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground/80 hover:bg-muted transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>

                {prescriptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No prescriptions added. Click &ldquo;Add&rdquo; to create one.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {prescriptions.map((prescription, prescriptionIndex) => {
                      const medicationQuery = medicationSearchQueries[prescriptionIndex] ?? "";
                      const isMedicationDropdownVisible = medicationDropdownOpen[prescriptionIndex] ?? false;
                      const filteredMedications = getFilteredMedications(medicationQuery);
                      const selectedMedication = getSelectedMedication(prescription.medicationName);

                      return (
                        <div
                          key={prescriptionIndex}
                          className="rounded-lg border border-border bg-muted p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              Prescription #{prescriptionIndex + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePrescription(prescriptionIndex)}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-error-600 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {/* Medication autocomplete (P1) */}
                            <div
                              ref={(element) => { medicationSearchRefs.current[prescriptionIndex] = element; }}
                              className="relative"
                            >
                              {prescription.medicationName ? (
                                <div className="flex h-9 items-center gap-2 rounded-md border border-primary-200 bg-primary-50 px-3">
                                  <Pill className="h-3.5 w-3.5 flex-shrink-0 text-primary-600" />
                                  <span className="flex-1 truncate text-sm text-foreground">
                                    {prescription.medicationName}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handlePrescriptionChange(prescriptionIndex, "medicationName", "");
                                      handlePrescriptionChange(prescriptionIndex, "dosage", "");
                                      handlePrescriptionChange(prescriptionIndex, "frequency", "");
                                    }}
                                    className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground/80 transition-colors"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="relative">
                                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                      type="text"
                                      value={medicationQuery}
                                      onChange={(event) => {
                                        setMedicationSearchQueries((previous) => ({
                                          ...previous,
                                          [prescriptionIndex]: event.target.value,
                                        }));
                                        setMedicationDropdownOpen((previous) => ({
                                          ...previous,
                                          [prescriptionIndex]: event.target.value.length >= 1,
                                        }));
                                      }}
                                      onFocus={() => {
                                        if (medicationQuery.length >= 1) {
                                          setMedicationDropdownOpen((previous) => ({
                                            ...previous,
                                            [prescriptionIndex]: true,
                                          }));
                                        }
                                      }}
                                      placeholder="Search medication..."
                                      className="h-9 w-full rounded-md border border-border bg-card pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
                                    />
                                  </div>

                                  {isMedicationDropdownVisible && (
                                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                                      <ul className="max-h-[240px] overflow-y-auto py-1">
                                        {filteredMedications.length === 0 ? (
                                          <li className="px-3 py-2 text-sm text-muted-foreground">
                                            No matching medications.
                                          </li>
                                        ) : (
                                          filteredMedications.map((medication) => {
                                            const lowerQuery = medicationQuery.toLowerCase();
                                            const matchStart = medication.name.toLowerCase().indexOf(lowerQuery);

                                            return (
                                              <li key={medication.name}>
                                                <button
                                                  type="button"
                                                  onClick={() => handleSelectMedication(prescriptionIndex, medication)}
                                                  className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted transition-colors"
                                                >
                                                  <span className="text-sm font-medium text-foreground">
                                                    {matchStart >= 0 ? (
                                                      <>
                                                        {medication.name.slice(0, matchStart)}
                                                        <mark className="bg-warning-200 text-foreground">
                                                          {medication.name.slice(matchStart, matchStart + medicationQuery.length)}
                                                        </mark>
                                                        {medication.name.slice(matchStart + medicationQuery.length)}
                                                      </>
                                                    ) : (
                                                      medication.name
                                                    )}
                                                  </span>
                                                  <span className="text-xs text-muted-foreground">
                                                    {medication.commonDosages.join(", ")}
                                                  </span>
                                                </button>
                                              </li>
                                            );
                                          })
                                        )}
                                      </ul>
                                      <div className="border-t border-border px-3 py-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handlePrescriptionChange(prescriptionIndex, "medicationName", medicationQuery);
                                            setMedicationSearchQueries((previous) => ({ ...previous, [prescriptionIndex]: "" }));
                                            setMedicationDropdownOpen((previous) => ({ ...previous, [prescriptionIndex]: false }));
                                          }}
                                          className="text-xs font-medium text-primary-700 hover:text-primary-800 hover:underline transition-colors"
                                        >
                                          Use &ldquo;{medicationQuery}&rdquo; as custom name
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Dosage — dropdown if medication selected, else free text */}
                            {selectedMedication ? (
                              <select
                                value={prescription.dosage}
                                onChange={(event) =>
                                  handlePrescriptionChange(prescriptionIndex, "dosage", event.target.value)
                                }
                                className="h-9 rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
                              >
                                <option value="">Select dosage</option>
                                {selectedMedication.commonDosages.map((dosage) => (
                                  <option key={dosage} value={dosage}>{dosage}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={prescription.dosage}
                                onChange={(event) =>
                                  handlePrescriptionChange(prescriptionIndex, "dosage", event.target.value)
                                }
                                placeholder="Dosage (e.g. 500mg)"
                                className="h-9 rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
                              />
                            )}

                            {/* Frequency — dropdown if medication selected, else free text */}
                            {selectedMedication ? (
                              <select
                                value={prescription.frequency}
                                onChange={(event) =>
                                  handlePrescriptionChange(prescriptionIndex, "frequency", event.target.value)
                                }
                                className="h-9 rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
                              >
                                <option value="">Select frequency</option>
                                {selectedMedication.commonFrequencies.map((frequency) => (
                                  <option key={frequency} value={frequency}>{frequency}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={prescription.frequency}
                                onChange={(event) =>
                                  handlePrescriptionChange(prescriptionIndex, "frequency", event.target.value)
                                }
                                placeholder="Frequency (e.g. twice daily)"
                                className="h-9 rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
                              />
                            )}

                            <input
                              type="text"
                              value={prescription.durationDays}
                              onChange={(event) =>
                                handlePrescriptionChange(prescriptionIndex, "durationDays", event.target.value)
                              }
                              placeholder="Duration (days)"
                              className="h-9 rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
                            />
                          </div>
                          <input
                            type="text"
                            value={prescription.instructions}
                            onChange={(event) =>
                              handlePrescriptionChange(prescriptionIndex, "instructions", event.target.value)
                            }
                            placeholder="Instructions (optional)"
                            className="mt-3 h-9 w-full rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Follow-up with Schedule button (P2) */}
              <div>
                <label
                  htmlFor="followUp"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Recommended Follow-up
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    id="followUp"
                    type="text"
                    value={followUp}
                    onChange={(event) => setFollowUp(event.target.value)}
                    placeholder="e.g. Follow-up in 2 weeks if symptoms persist"
                    className="h-10 flex-1 rounded-lg border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-700 transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={handleScheduleFollowUp}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors whitespace-nowrap"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Schedule Follow-up
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer — fixed on mobile, relative on desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] lg:relative lg:bottom-auto lg:left-auto lg:right-auto lg:z-auto lg:mt-6 lg:px-0 lg:py-0 lg:shadow-none">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/clara")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-error-500 px-4 text-sm font-medium text-error-600 transition-colors hover:bg-error-50 hover:text-error-700"
          >
            <Trash2 className="h-4 w-4" />
            Discard Draft
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isCreating || !chiefComplaint.trim() || !diagnosisCode.trim()}
            className={clsxMerge(
              "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4",
              "bg-primary-700 text-sm font-medium text-white",
              "hover:bg-primary-600 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save as Medical Record
          </button>
        </div>
      </div>
    </>
  );
}
