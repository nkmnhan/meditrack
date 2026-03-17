import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2, AlertCircle, Calendar, Clock, User,
  Sparkles, Hash, Stethoscope, Video, MessageSquare,
  FileText, ChevronDown, ChevronUp, Heart,
  Activity, Brain, Pill, ShieldAlert,
  ClipboardList, CheckCircle2,
} from "lucide-react";
import { useGetAppointmentByIdQuery } from "../store/appointmentApi";
import { useStartSessionMutation } from "@/features/clara";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useRoles } from "@/shared/auth/useRoles";
import { UserRole } from "@/shared/auth/roles";
import { Breadcrumb } from "@/shared/components";
import type { AppointmentStatus } from "../types";

/* ── Types ── */

interface VitalsData {
  readonly bloodPressureSystolic: string;
  readonly bloodPressureDiastolic: string;
  readonly heartRate: string;
  readonly temperature: string;
  readonly spO2: string;
  readonly weight: string;
  readonly height: string;
}

interface VisitOutcomeData {
  readonly primaryDiagnosis: string;
  readonly followUpPlan: string;
  readonly disposition: string;
}

/* ── Demo data ── */

const DEMO_MEDICATIONS = [
  { name: "Metformin 500mg", frequency: "Twice daily", since: "2025-03-01" },
  { name: "Lisinopril 10mg", frequency: "Once daily", since: "2024-11-15" },
  { name: "Atorvastatin 20mg", frequency: "At bedtime", since: "2025-01-10" },
];

const DEMO_ALLERGIES = [
  { allergen: "Penicillin", severity: "Severe", reaction: "Anaphylaxis" },
  { allergen: "Sulfa drugs", severity: "Moderate", reaction: "Rash" },
];

const DEMO_DIAGNOSES = [
  { code: "E11.9", description: "Type 2 diabetes mellitus", date: "2025-03-01" },
  { code: "I10", description: "Essential hypertension", date: "2024-11-15" },
  { code: "E78.5", description: "Hyperlipidemia", date: "2025-01-10" },
];

const DEMO_LAST_VITALS = {
  bloodPressure: "128/82",
  heartRate: "74 bpm",
  temperature: "98.4 °F",
  spO2: "97%",
  weight: "185 lbs",
  recordedDate: "2026-02-28",
};

const DISPOSITION_OPTIONS = [
  { value: "", label: "Select disposition..." },
  { value: "Discharged", label: "Discharged" },
  { value: "FollowUpScheduled", label: "Follow-up Scheduled" },
  { value: "Referred", label: "Referred" },
  { value: "Admitted", label: "Admitted" },
];

const EMPTY_VITALS: VitalsData = {
  bloodPressureSystolic: "",
  bloodPressureDiastolic: "",
  heartRate: "",
  temperature: "",
  spO2: "",
  weight: "",
  height: "",
};

/* ── Status config ── */

const STATUS_CONFIG: Record<AppointmentStatus, { badge: string }> = {
  Scheduled:   { badge: "bg-primary-100 text-primary-700" },
  Confirmed:   { badge: "bg-accent-100 text-accent-700" },
  CheckedIn:   { badge: "bg-info-50 text-info-700" },
  InProgress:  { badge: "bg-warning-50 text-warning-700" },
  Completed:   { badge: "bg-success-50 text-success-700" },
  Cancelled:   { badge: "bg-muted text-muted-foreground" },
  NoShow:      { badge: "bg-error-50 text-error-700" },
  Rescheduled: { badge: "bg-muted text-muted-foreground" },
};

/* ── Sub-components ── */

function DetailCard({
  icon: Icon,
  title,
  children,
}: {
  readonly icon: React.ElementType;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
        <Icon className="h-5 w-5 text-primary-700" />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "\u2014"}</p>
    </div>
  );
}

/* ── Patient Summary (P1) ── */

function PatientSummaryCard({
  patientName,
  isExpanded,
  onToggle,
}: {
  readonly patientName: string;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
}) {
  const ToggleIcon = isExpanded ? ChevronUp : ChevronDown;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-6"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary-700" />
          <h3 className="font-semibold text-foreground">Patient Summary</h3>
          <span className="text-xs text-muted-foreground">{patientName}</span>
        </div>
        <ToggleIcon className="h-5 w-5 text-muted-foreground/70" />
      </button>

      {isExpanded && (
        <div className="border-t border-border p-6 pt-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Active Medications */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <Pill className="h-4 w-4 text-primary-700" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Medications</p>
              </div>
              <ul className="space-y-1.5">
                {DEMO_MEDICATIONS.map((medication) => (
                  <li key={medication.name} className="text-sm text-foreground/80">
                    <span className="font-medium">{medication.name}</span>
                    <span className="text-muted-foreground"> &mdash; {medication.frequency}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Allergies */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-error-600" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Allergies</p>
              </div>
              <ul className="space-y-1.5">
                {DEMO_ALLERGIES.map((allergy) => (
                  <li key={allergy.allergen} className="text-sm">
                    <span className="font-medium text-error-700">{allergy.allergen}</span>
                    <span className="text-muted-foreground"> &mdash; {allergy.severity} ({allergy.reaction})</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recent Diagnoses */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4 text-primary-700" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent Diagnoses</p>
              </div>
              <ul className="space-y-1.5">
                {DEMO_DIAGNOSES.map((diagnosis) => (
                  <li key={diagnosis.code} className="text-sm text-foreground/80">
                    <span className="font-mono text-xs text-muted-foreground">{diagnosis.code}</span>{" "}
                    <span className="font-medium">{diagnosis.description}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Last Vital Signs */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-success-600" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Last Vitals ({DEMO_LAST_VITALS.recordedDate})
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <p className="text-sm text-foreground/80">
                  <span className="text-muted-foreground">BP:</span> {DEMO_LAST_VITALS.bloodPressure}
                </p>
                <p className="text-sm text-foreground/80">
                  <span className="text-muted-foreground">HR:</span> {DEMO_LAST_VITALS.heartRate}
                </p>
                <p className="text-sm text-foreground/80">
                  <span className="text-muted-foreground">Temp:</span> {DEMO_LAST_VITALS.temperature}
                </p>
                <p className="text-sm text-foreground/80">
                  <span className="text-muted-foreground">SpO2:</span> {DEMO_LAST_VITALS.spO2}
                </p>
                <p className="text-sm text-foreground/80">
                  <span className="text-muted-foreground">Weight:</span> {DEMO_LAST_VITALS.weight}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Quick Vitals Entry (P1) ── */

function VitalsEntryCard({
  vitals,
  savedVitals,
  onVitalsChange,
  onSaveVitals,
}: {
  readonly vitals: VitalsData;
  readonly savedVitals: VitalsData | null;
  readonly onVitalsChange: (field: keyof VitalsData, value: string) => void;
  readonly onSaveVitals: () => void;
}) {
  if (savedVitals) {
    return (
      <DetailCard icon={Heart} title="Vitals (Recorded)">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <InfoField label="Blood Pressure" value={`${savedVitals.bloodPressureSystolic}/${savedVitals.bloodPressureDiastolic} mmHg`} />
          <InfoField label="Heart Rate" value={`${savedVitals.heartRate} bpm`} />
          <InfoField label="Temperature" value={`${savedVitals.temperature} °F`} />
          <InfoField label="SpO2" value={`${savedVitals.spO2}%`} />
          <InfoField label="Weight" value={`${savedVitals.weight} lbs`} />
          <InfoField label="Height" value={`${savedVitals.height} in`} />
        </div>
        <p className="mt-3 text-xs text-success-600 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> Vitals saved successfully
        </p>
      </DetailCard>
    );
  }

  return (
    <DetailCard icon={Heart} title="Quick Vitals Entry">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            BP Systolic
          </label>
          <input
            type="number"
            placeholder="120"
            value={vitals.bloodPressureSystolic}
            onChange={(event) => onVitalsChange("bloodPressureSystolic", event.target.value)}
            className="h-10 w-full rounded-md border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            BP Diastolic
          </label>
          <input
            type="number"
            placeholder="80"
            value={vitals.bloodPressureDiastolic}
            onChange={(event) => onVitalsChange("bloodPressureDiastolic", event.target.value)}
            className="h-10 w-full rounded-md border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Heart Rate
          </label>
          <div className="relative">
            <input
              type="number"
              placeholder="72"
              value={vitals.heartRate}
              onChange={(event) => onVitalsChange("heartRate", event.target.value)}
              className="h-10 w-full rounded-md border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Temp (°F)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              placeholder="98.6"
              value={vitals.temperature}
              onChange={(event) => onVitalsChange("temperature", event.target.value)}
              className="h-10 w-full rounded-md border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            SpO2 (%)
          </label>
          <input
            type="number"
            placeholder="98"
            value={vitals.spO2}
            onChange={(event) => onVitalsChange("spO2", event.target.value)}
            className="h-10 w-full rounded-md border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Weight (lbs)
          </label>
          <input
            type="number"
            placeholder="170"
            value={vitals.weight}
            onChange={(event) => onVitalsChange("weight", event.target.value)}
            className="h-10 w-full rounded-md border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Height (in)
          </label>
          <input
            type="number"
            placeholder="68"
            value={vitals.height}
            onChange={(event) => onVitalsChange("height", event.target.value)}
            className="h-10 w-full rounded-md border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="mt-4">
        <button
          type="button"
          onClick={onSaveVitals}
          className={clsxMerge(
            "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-5",
            "bg-primary-700 text-sm font-medium text-white",
            "transition-colors hover:bg-primary-800"
          )}
        >
          <CheckCircle2 className="h-4 w-4" /> Save Vitals
        </button>
      </div>
    </DetailCard>
  );
}

/* ── Visit Outcome (P1) ── */

function VisitOutcomeCard({
  outcome,
  savedOutcome,
  hasClaraSession,
  onOutcomeChange,
  onSaveOutcome,
}: {
  readonly outcome: VisitOutcomeData;
  readonly savedOutcome: VisitOutcomeData | null;
  readonly hasClaraSession: boolean;
  readonly onOutcomeChange: (field: keyof VisitOutcomeData, value: string) => void;
  readonly onSaveOutcome: () => void;
}) {
  if (savedOutcome) {
    return (
      <DetailCard icon={FileText} title="Visit Outcome">
        <div className="space-y-3">
          <InfoField label="Primary Diagnosis" value={savedOutcome.primaryDiagnosis} />
          <InfoField label="Follow-up Plan" value={savedOutcome.followUpPlan} />
          <InfoField label="Disposition" value={savedOutcome.disposition} />
          {hasClaraSession && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-medium text-accent-700">
              <Sparkles className="h-3 w-3" /> Auto-populated from Clara
            </span>
          )}
          <p className="text-xs text-success-600 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Outcome saved successfully
          </p>
        </div>
      </DetailCard>
    );
  }

  return (
    <DetailCard icon={FileText} title="Visit Outcome">
      {hasClaraSession && (
        <div className="mb-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-medium text-accent-700">
            <Sparkles className="h-3 w-3" /> Auto-populated from Clara
          </span>
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Primary Diagnosis
          </label>
          <input
            type="text"
            placeholder="Enter primary diagnosis..."
            value={outcome.primaryDiagnosis}
            onChange={(event) => onOutcomeChange("primaryDiagnosis", event.target.value)}
            className="h-10 w-full rounded-md border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Follow-up Plan
          </label>
          <textarea
            placeholder="Describe follow-up plan..."
            value={outcome.followUpPlan}
            onChange={(event) => onOutcomeChange("followUpPlan", event.target.value)}
            rows={3}
            className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Disposition
          </label>
          <select
            value={outcome.disposition}
            onChange={(event) => onOutcomeChange("disposition", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {DISPOSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={onSaveOutcome}
          className={clsxMerge(
            "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-5",
            "bg-primary-700 text-sm font-medium text-white",
            "transition-colors hover:bg-primary-800"
          )}
        >
          <CheckCircle2 className="h-4 w-4" /> Save Outcome
        </button>
      </div>
    </DetailCard>
  );
}

/* ── Telehealth Status Indicator (P2) ── */

type TelehealthConnectionStatus = "connected" | "waiting" | "not_started";

function TelehealthStatusIndicator({ connectionStatus }: { readonly connectionStatus: TelehealthConnectionStatus }) {
  const statusMap: Record<TelehealthConnectionStatus, { label: string; dotClass: string; textClass: string }> = {
    connected: {
      label: "Patient Connected",
      dotClass: "bg-success-500",
      textClass: "text-success-700",
    },
    waiting: {
      label: "Waiting for Patient",
      dotClass: "bg-warning-500",
      textClass: "text-warning-700",
    },
    not_started: {
      label: "Not Started",
      dotClass: "bg-muted-foreground/70",
      textClass: "text-muted-foreground",
    },
  };

  const statusInfo = statusMap[connectionStatus];

  return (
    <div className="flex items-center gap-2">
      <span className={clsxMerge("inline-block h-2.5 w-2.5 rounded-full", statusInfo.dotClass)} />
      <span className={clsxMerge("text-xs font-medium", statusInfo.textClass)}>{statusInfo.label}</span>
    </div>
  );
}

/* ── Clara FAB (CC.2) ── */

function ClaraFab({
  patientName,
  appointmentType,
  isOpen,
  onToggle,
  onStartSession,
  isStartingSession,
}: {
  readonly patientName: string;
  readonly appointmentType: string;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly onStartSession: () => void;
  readonly isStartingSession: boolean;
}) {
  const suggestedPrompts = [
    "Summarize this patient's recent visits",
    "Review current medications for interactions",
    "Suggest differential diagnoses based on symptoms",
  ];

  return (
    <>
      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-border bg-card shadow-xl sm:right-6">
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-accent-600" />
              <h4 className="font-semibold text-foreground">Clara AI Assistant</h4>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Patient Context</p>
              <p className="text-sm text-foreground/80">{patientName} &mdash; {appointmentType}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Suggested Prompts</p>
              <div className="space-y-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="w-full text-left rounded-lg border border-border px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={onStartSession}
              disabled={isStartingSession}
              className={clsxMerge(
                "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg",
                "bg-gradient-to-r from-accent-500 to-accent-700",
                "text-sm font-medium text-white shadow-md",
                "transition-all hover:shadow-lg disabled:opacity-50"
              )}
            >
              {isStartingSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Start Clara Session
            </button>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        type="button"
        onClick={onToggle}
        className={clsxMerge(
          "fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg sm:right-6",
          "bg-gradient-to-br from-accent-500 to-accent-700",
          "text-white transition-all hover:shadow-xl hover:scale-105",
          isOpen && "rotate-45"
        )}
        aria-label={isOpen ? "Close Clara panel" : "Open Clara assistant"}
      >
        <Brain className="h-6 w-6" />
      </button>
    </>
  );
}

/* ── Main component ── */

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: appointment, isLoading, error } = useGetAppointmentByIdQuery(id!);
  const [startSession, { isLoading: isStartingSession }] = useStartSessionMutation();
  const { hasAnyRole } = useRoles();
  const canStartClaraSession = hasAnyRole([UserRole.Doctor, UserRole.Admin]);

  // Patient summary state
  const [isPatientSummaryExpanded, setIsPatientSummaryExpanded] = useState(false);

  // Vitals state
  const [vitalsForm, setVitalsForm] = useState<VitalsData>(EMPTY_VITALS);
  const [savedVitals, setSavedVitals] = useState<VitalsData | null>(null);

  // Visit outcome state
  const [outcomeForm, setOutcomeForm] = useState<VisitOutcomeData>({
    primaryDiagnosis: "",
    followUpPlan: "",
    disposition: "",
  });
  const [savedOutcome, setSavedOutcome] = useState<VisitOutcomeData | null>(null);

  // Clara FAB state
  const [isClaraOpen, setIsClaraOpen] = useState(false);

  // Demo telehealth status
  const telehealthStatus: TelehealthConnectionStatus = "waiting";

  // Demo: simulate Clara session exists for completed appointments
  const hasClaraSession = appointment?.status === "Completed";

  const handleStartClaraSession = async () => {
    if (!appointment) return;
    try {
      const result = await startSession({ patientId: appointment.patientId }).unwrap();
      navigate(`/clara/session/${result.id}`);
    } catch {
      toast.error("Failed to start Clara session. Please try again.");
    }
  };

  const handleVitalsChange = (field: keyof VitalsData, value: string) => {
    setVitalsForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSaveVitals = () => {
    setSavedVitals(vitalsForm);
    toast.success("Vitals saved successfully");
  };

  const handleOutcomeChange = (field: keyof VisitOutcomeData, value: string) => {
    setOutcomeForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSaveOutcome = () => {
    setSavedOutcome(outcomeForm);
    toast.success("Visit outcome saved successfully");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-3 h-12 w-12 text-muted-foreground/50" />
        <p className="text-lg font-semibold text-foreground/80">Appointment not found</p>
        <Link to="/appointments" className="mt-2 text-sm text-primary-700 hover:underline">
          &larr; Back to Appointments
        </Link>
      </div>
    );
  }

  const scheduledDate = new Date(appointment.scheduledDateTime);
  const formattedDate = scheduledDate.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });
  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.Scheduled;

  const patientInitials = appointment.patientName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isCheckedIn = appointment.status === "CheckedIn" || appointment.status === "InProgress";
  const isCompleted = appointment.status === "Completed";

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Appointments", href: "/appointments" },
          { label: `${appointment.patientName} \u2014 ${appointment.type}` },
        ]}
      />

      {/* Patient Summary (P1) — collapsible, above header */}
      <div className="mb-6">
        <PatientSummaryCard
          patientName={appointment.patientName}
          isExpanded={isPatientSummaryExpanded}
          onToggle={() => setIsPatientSummaryExpanded((previous) => !previous)}
        />
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-secondary-100 text-lg font-semibold text-secondary-700">
            {patientInitials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{appointment.patientName}</h1>
              <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                {appointment.patientId.slice(0, 8).toUpperCase()}
              </span>
              <span className={clsxMerge("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusConfig.badge)}>
                {appointment.status}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {appointment.type} &middot; {appointment.providerName}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            to={`/patients/${appointment.patientId}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
          >
            <User className="h-4 w-4" /> View Patient
          </Link>
          {canStartClaraSession && (
            <button
              type="button"
              onClick={handleStartClaraSession}
              disabled={isStartingSession}
              className={clsxMerge(
                "relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-xl px-6",
                "bg-gradient-to-r from-accent-500 to-accent-700",
                "text-sm font-medium text-white shadow-md",
                "transition-all hover:shadow-lg disabled:opacity-50"
              )}
            >
              <span className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              {isStartingSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Start with Clara
            </button>
          )}
        </div>
      </div>

      {/* Quick Vitals Entry (P1) — shown when CheckedIn or InProgress */}
      {isCheckedIn && (
        <div className="mb-6">
          <VitalsEntryCard
            vitals={vitalsForm}
            savedVitals={savedVitals}
            onVitalsChange={handleVitalsChange}
            onSaveVitals={handleSaveVitals}
          />
        </div>
      )}

      {/* Visit Outcome (P1) — shown when Completed */}
      {isCompleted && (
        <div className="mb-6">
          <VisitOutcomeCard
            outcome={outcomeForm}
            savedOutcome={savedOutcome}
            hasClaraSession={hasClaraSession}
            onOutcomeChange={handleOutcomeChange}
            onSaveOutcome={handleSaveOutcome}
          />
        </div>
      )}

      {/* Detail grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DetailCard icon={Calendar} title="Appointment Details">
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="Date" value={formattedDate} />
            <InfoField label="Time" value={formattedTime} />
            <InfoField label="Duration" value={`${appointment.durationMinutes} minutes`} />
            <InfoField label="Type" value={appointment.type} />
          </div>
        </DetailCard>

        <DetailCard icon={Stethoscope} title="Provider & Location">
          <div className="space-y-3">
            <InfoField label="Provider" value={appointment.providerName} />
            <InfoField label="Location" value={appointment.location || "Not specified"} />
            {appointment.telehealthLink && (
              <div className="space-y-2">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Telehealth</p>
                <TelehealthStatusIndicator connectionStatus={telehealthStatus} />
                <a
                  href={appointment.telehealthLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={clsxMerge(
                    "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4",
                    "bg-primary-700 text-sm font-medium text-white",
                    "transition-colors hover:bg-primary-800"
                  )}
                >
                  <Video className="h-4 w-4" /> Join Meeting
                </a>
              </div>
            )}
          </div>
        </DetailCard>

        <DetailCard icon={Hash} title="Reason for Visit">
          <p className="text-sm text-foreground/80">{appointment.reason || "No reason specified"}</p>
        </DetailCard>

        {(appointment.patientNotes || appointment.internalNotes) && (
          <DetailCard icon={MessageSquare} title="Notes">
            <div className="space-y-3">
              {appointment.patientNotes && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Patient Notes</p>
                  <p className="text-sm text-foreground/80">{appointment.patientNotes}</p>
                </div>
              )}
              {appointment.internalNotes && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Internal Notes</p>
                  <p className="text-sm text-foreground/80">{appointment.internalNotes}</p>
                </div>
              )}
            </div>
          </DetailCard>
        )}

        {appointment.cancellationReason && (
          <DetailCard icon={AlertCircle} title="Cancellation">
            <div className="space-y-3">
              <InfoField label="Reason" value={appointment.cancellationReason} />
              {appointment.cancelledAt && (
                <InfoField
                  label="Cancelled At"
                  value={new Date(appointment.cancelledAt).toLocaleString("en-US", {
                    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                />
              )}
            </div>
          </DetailCard>
        )}

        {isCompleted && (
          <DetailCard icon={FileText} title="Meeting Record">
            <p className="mb-3 text-sm text-foreground/80">
              A medical record was generated from this appointment.
            </p>
            <Link
              to={`/patients/${appointment.patientId}/medical-records`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:underline"
            >
              <FileText className="h-4 w-4" /> View Medical Records &rarr;
            </Link>
          </DetailCard>
        )}

        <DetailCard icon={Clock} title="Metadata">
          <div className="space-y-3">
            <InfoField
              label="Created"
              value={new Date(appointment.createdAt).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
              })}
            />
            <InfoField
              label="Last Updated"
              value={new Date(appointment.updatedAt).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
              })}
            />
          </div>
        </DetailCard>
      </div>

      {/* Clara FAB (CC.2) */}
      {canStartClaraSession && (
        <ClaraFab
          patientName={appointment.patientName}
          appointmentType={appointment.type}
          isOpen={isClaraOpen}
          onToggle={() => setIsClaraOpen((previous) => !previous)}
          onStartSession={handleStartClaraSession}
          isStartingSession={isStartingSession}
        />
      )}
    </>
  );
}
