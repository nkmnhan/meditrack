import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import {
  Sparkles, Lightbulb, Mic, Search,
  Play, History, ChevronRight, FileText, Shield, Save,
  AlertCircle, Loader2, CalendarDays, Clock,
  User, Pill, AlertTriangle, ArrowRight, LayoutTemplate, Keyboard,
} from "lucide-react";
import { useStartSessionMutation, useGetSessionsQuery } from "../store/claraApi";
import { useLazySearchPatientsQuery } from "@/features/patients";
import type { PatientListItem } from "@/features/patients";
import type { SessionType } from "../types";
import { clsxMerge } from "@/shared/utils/clsxMerge";

/* ── Static data ────────────────────────────────────────── */

const featureCards = [
  { icon: Mic, title: "Live Transcription", description: "Real-time speech-to-text with automatic speaker identification", stat: "98.5% accuracy" },
  { icon: Lightbulb, title: "AI Suggestions", description: "Evidence-based clinical recommendations as you consult", stat: "12 accepted today" },
  { icon: FileText, title: "Auto SOAP Notes", description: "Automatic clinical note generation from session transcript", stat: "~2 min saved per note" },
];

const howItWorksSteps = [
  { icon: Play, label: "Start", description: "Hit start and begin consulting" },
  { icon: Mic, label: "Speak", description: "Talk naturally — Clara identifies speakers" },
  { icon: Sparkles, label: "Insights", description: "Get evidence-based suggestions in real time" },
  { icon: Save, label: "Save", description: "Export notes directly to the patient record" },
];

const upcomingAppointments = [
  { time: "10:30 AM", patient: "Sarah Johnson", type: "Follow-up" as SessionType, patientId: "demo-patient-001" },
  { time: "11:15 AM", patient: "Michael Chen", type: "Consultation" as SessionType, patientId: "demo-patient-002" },
  { time: "2:00 PM", patient: "Emily Davis", type: "Review" as SessionType, patientId: "demo-patient-003" },
];

const SESSION_TYPES = ["Consultation", "Follow-up", "Review"] as const;

/** Avatar color palette — deterministic from patient ID */
const AVATAR_COLORS = [
  "bg-primary-100 text-primary-700",
  "bg-secondary-100 text-secondary-700",
  "bg-accent-100 text-accent-700",
  "bg-success-50 text-success-700",
  "bg-warning-50 text-warning-700",
];

/* ── Session Templates ──────────────────────────────────── */

interface SessionTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly estimatedMinutes: number;
}

const SESSION_TEMPLATES: SessionTemplate[] = [
  { id: "annual-physical", name: "Annual Physical", description: "Comprehensive yearly wellness exam and screening review", estimatedMinutes: 30 },
  { id: "chronic-disease", name: "Chronic Disease Management", description: "Ongoing monitoring and medication adjustment for chronic conditions", estimatedMinutes: 20 },
  { id: "post-op-followup", name: "Post-Op Follow-up", description: "Surgical recovery assessment, wound check, and rehab planning", estimatedMinutes: 15 },
  { id: "mental-health", name: "Mental Health Evaluation", description: "Psychiatric assessment, mood screening, and therapy progress", estimatedMinutes: 45 },
  { id: "pediatric-well", name: "Pediatric Well-Visit", description: "Growth milestones, immunizations, and developmental screening", estimatedMinutes: 25 },
];

/* ── Helpers ────────────────────────────────────────────── */

function getTimeGreeting(displayName?: string): string {
  const hour = new Date().getHours();
  const namePrefix = displayName ? `, ${displayName}` : "";
  if (hour < 12) return `Good morning${namePrefix}. Ready to start your first session?`;
  if (hour < 18) return `Good afternoon${namePrefix}. Clara is ready to assist your consultations.`;
  return `Good evening${namePrefix}. Wrapping up? I can help with your session notes.`;
}

function getAvatarColor(id: string): string {
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/* ── Component ──────────────────────────────────────────── */

interface SessionStartScreenProps {
  readonly className?: string;
}

export function SessionStartScreen({ className }: SessionStartScreenProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const displayName = auth.user?.profile?.name
    ? `Dr. ${auth.user.profile.name.split(" ").pop()}`
    : undefined;
  const [startSession, { isLoading, error }] = useStartSessionMutation();
  const { data: recentSessions = [] } = useGetSessionsQuery();
  const [triggerSearch, { data: searchResults = [], isFetching: isSearching }] =
    useLazySearchPatientsQuery();

  const [selectedSessionType, setSelectedSessionType] = useState<SessionType>("Consultation");
  const [patientSearchText, setPatientSearchText] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SessionTemplate | null>(null);
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);

  const patientSearchInputRef = useRef<HTMLInputElement>(null);

  /* ── Keyboard shortcut: Ctrl+Shift+C → focus patient search ── */
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && event.key === "C") {
        event.preventDefault();
        patientSearchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handlePatientSearchChange(value: string) {
    setPatientSearchText(value);
    setSelectedPatient(null);
    setIsDropdownOpen(true);
    if (value.trim().length >= 2) {
      triggerSearch({ searchTerm: value.trim() });
    }
  }

  function handleSelectPatient(patient: PatientListItem) {
    setSelectedPatient(patient);
    setPatientSearchText(patient.fullName);
    setIsDropdownOpen(false);
  }

  function handleClearPatient() {
    setSelectedPatient(null);
    setPatientSearchText("");
    patientSearchInputRef.current?.focus();
  }

  const handleStartSession = async () => {
    try {
      const result = await startSession({
        patientId: selectedPatient?.id ?? undefined,
        sessionType: selectedSessionType,
      }).unwrap();
      navigate(`/clara/session/${result.id}`);
    } catch (startError) {
      console.error("Failed to start session:", startError);
    }
  };

  const handleQuickStartFromAppointment = async (patientId: string, sessionType: SessionType) => {
    try {
      const result = await startSession({
        patientId,
        sessionType,
      }).unwrap();
      navigate(`/clara/session/${result.id}`);
    } catch (quickStartError) {
      console.error("Failed to start session from appointment:", quickStartError);
    }
  };

  const showDropdown = isDropdownOpen && patientSearchText.trim().length >= 2 && !selectedPatient;

  return (
    <div className={clsxMerge("min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 px-4 sm:px-6 lg:px-8 pt-4 pb-24 md:pb-8 bg-gradient-to-b from-background to-accent-50/30 dark:to-background", className)}>

      {/* ── Hero Section ──────────────────────────────────── */}
      <div className="text-center pt-6 md:pt-10 pb-6 max-w-2xl mx-auto">
        {/* Clara avatar with animated rings */}
        <div className="relative mx-auto w-[72px] h-[72px]">
          <span className="absolute inset-0 -m-3 rounded-full border-2 border-accent-100 animate-ping opacity-10 dark:opacity-[0.07]" style={{ animationDuration: "3s", animationDelay: "0.5s" }} />
          <span className="absolute inset-0 -m-1 rounded-full border-2 border-accent-200 animate-ping opacity-20 dark:opacity-10" style={{ animationDuration: "2.5s" }} />
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-accent-500 to-primary-700 flex items-center justify-center shadow-lg">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mt-4 bg-gradient-to-r from-accent-700 to-primary-700 bg-clip-text text-transparent">
          Clara
        </h1>
        <p className="text-xs font-semibold text-accent-500 uppercase tracking-widest mt-1">
          Your AI Medical Secretary
        </p>
        <p className="text-lg text-foreground/80 mt-3">
          {getTimeGreeting(displayName)}
        </p>

        {/* Daily stats bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-6">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-accent-500" />
            <span className="text-xs md:text-sm font-medium text-foreground/80">
              {recentSessions.length} session{recentSessions.length !== 1 ? "s" : ""} today
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4 text-success-500" />
            <span className="text-xs md:text-sm font-medium text-foreground/80">12 suggestions accepted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary-700" />
            <span className="text-xs md:text-sm font-medium text-foreground/80">1.2 hrs saved</span>
          </div>
        </div>
      </div>

      {/* ── Start Session Card ─────────────────────────────── */}
      <div className="mx-0 md:max-w-lg md:mx-auto mt-8 bg-card rounded-xl md:rounded-2xl shadow-md border border-accent-200/50 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Start New Session</h2>
          <div className="relative h-8 w-8 rounded-full bg-accent-50 flex items-center justify-center">
            <Mic className="h-4 w-4 text-accent-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success-500 ring-2 ring-card" />
          </div>
        </div>

        {/* Patient search */}
        <div className="mt-4">
          <label htmlFor="patientSearch" className="text-sm font-medium text-foreground/80">
            Link a patient <span className="text-muted-foreground">(optional)</span>
          </label>
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={patientSearchInputRef}
              id="patientSearch"
              type="text"
              autoComplete="off"
              value={patientSearchText}
              onChange={(event) => handlePatientSearchChange(event.target.value)}
              onFocus={() => {
                if (patientSearchText.trim().length >= 2 && !selectedPatient) {
                  setIsDropdownOpen(true);
                }
              }}
              onBlur={() => {
                // Delay to allow click on dropdown items
                setTimeout(() => setIsDropdownOpen(false), 200);
              }}
              placeholder="Search by name or MRN..."
              className={clsxMerge(
                "w-full h-11 pl-10 pr-3 rounded-lg border border-border text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent",
                "transition-shadow bg-card"
              )}
            />
          </div>

          {/* Patient search dropdown */}
          {showDropdown && (
            <div className="mt-1 bg-card rounded-lg border border-border shadow-lg overflow-hidden">
              {isSearching && (
                <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              )}
              {!isSearching && searchResults.length === 0 && (
                <div className="px-3 py-2.5 text-sm text-muted-foreground">No patients found</div>
              )}
              {!isSearching && searchResults.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onMouseDown={(event) => {
                    // Prevent blur before click registers
                    event.preventDefault();
                    handleSelectPatient(patient);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent-50 dark:hover:bg-accent-900/20 cursor-pointer transition-colors text-left"
                >
                  <div
                    className={clsxMerge(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                      getAvatarColor(patient.id)
                    )}
                  >
                    {getInitials(patient.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{patient.fullName}</p>
                    <span className="text-xs font-mono text-muted-foreground">{patient.medicalRecordNumber}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Keyboard shortcut hint */}
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
            <Sparkles className="h-3 w-3 text-accent-500" />
            Clara provides better suggestions with patient context
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-0.5">
            <Keyboard className="h-3 w-3" />
            Tip: Press <kbd className="mx-0.5 px-1 py-0.5 rounded bg-muted border border-border text-muted-foreground font-mono text-[10px]">Ctrl+Shift+C</kbd> to quick-start
          </p>
        </div>

        {/* ── Patient Context Preview ─────────────────────── */}
        {selectedPatient && (
          <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50/50 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={clsxMerge(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
                    getAvatarColor(selectedPatient.id)
                  )}
                >
                  {getInitials(selectedPatient.fullName)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedPatient.fullName}</p>
                  <p className="text-xs font-mono text-muted-foreground">{selectedPatient.medicalRecordNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearPatient}
                className="text-xs text-accent-700 hover:underline flex-shrink-0"
              >
                Change Patient
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-foreground/80">
                  {selectedPatient.age}y, {selectedPatient.gender}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Pill className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-foreground/80">
                  {selectedPatient.medications?.length ?? 0} medication{(selectedPatient.medications?.length ?? 0) !== 1 ? "s" : ""}
                </span>
              </div>
              {selectedPatient.diagnosisTags && selectedPatient.diagnosisTags.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning-600 flex-shrink-0" />
                  <span className="text-xs text-warning-700 font-medium">
                    {selectedPatient.diagnosisTags.length} alert{selectedPatient.diagnosisTags.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {selectedPatient.lastVisitDate && (
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-foreground/80">
                    Last: {new Date(selectedPatient.lastVisitDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
              )}
            </div>

            {selectedPatient.isCritical && (
              <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded bg-error-50 border border-error-200">
                <AlertTriangle className="h-3.5 w-3.5 text-error-600 flex-shrink-0" />
                <span className="text-xs font-medium text-error-700">Critical patient — review alerts before session</span>
              </div>
            )}
          </div>
        )}

        {/* Session type selector */}
        <div className="mt-4">
          <label className="text-sm font-medium text-foreground/80">Session type</label>
          <div className="flex gap-2 mt-1.5">
            {SESSION_TYPES.map((sessionType) => (
              <button
                key={sessionType}
                type="button"
                onClick={() => setSelectedSessionType(sessionType)}
                className={clsxMerge(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  selectedSessionType === sessionType
                    ? "bg-accent-500 text-white"
                    : "bg-card border border-border text-foreground/80 hover:border-accent-300"
                )}
              >
                {sessionType}
              </button>
            ))}
          </div>
        </div>

        {/* ── Session Template Selector ────────────────────── */}
        <div className="mt-4">
          <label className="text-sm font-medium text-foreground/80">Template <span className="text-muted-foreground">(optional)</span></label>
          <div className="relative mt-1.5">
            <button
              type="button"
              onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
              onBlur={() => setTimeout(() => setIsTemplateDropdownOpen(false), 200)}
              className={clsxMerge(
                "w-full h-11 px-3 rounded-lg border text-sm text-left flex items-center justify-between",
                "transition-shadow bg-card",
                "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent",
                selectedTemplate ? "border-accent-300 text-foreground" : "border-border text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <LayoutTemplate className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
                <span className="truncate">{selectedTemplate ? selectedTemplate.name : "Choose a session template..."}</span>
              </div>
              <ChevronRight className={clsxMerge("h-4 w-4 text-muted-foreground/70 flex-shrink-0 transition-transform", isTemplateDropdownOpen && "rotate-90")} />
            </button>

            {isTemplateDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-card rounded-lg border border-border shadow-lg overflow-hidden">
                {selectedTemplate && (
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setSelectedTemplate(null);
                      setIsTemplateDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-xs text-muted-foreground hover:bg-muted text-left border-b border-border"
                  >
                    Clear selection
                  </button>
                )}
                {SESSION_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setSelectedTemplate(template);
                      setIsTemplateDropdownOpen(false);
                    }}
                    className={clsxMerge(
                      "w-full px-3 py-2.5 text-left transition-colors",
                      "hover:bg-accent-50 dark:hover:bg-accent-900/20",
                      selectedTemplate?.id === template.id && "bg-accent-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{template.name}</p>
                      <span className="text-xs font-mono text-muted-foreground flex-shrink-0 ml-2">~{template.estimatedMinutes} min</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected template card */}
          {selectedTemplate && !isTemplateDropdownOpen && (
            <div className="mt-2 flex items-center gap-3 rounded-lg border border-accent-100 bg-accent-50/50 px-3 py-2">
              <LayoutTemplate className="h-4 w-4 text-accent-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{selectedTemplate.name}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedTemplate.description}</p>
              </div>
              <span className="text-xs font-mono text-accent-700 flex-shrink-0">~{selectedTemplate.estimatedMinutes} min</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 mt-4 rounded-lg bg-error-50 text-error-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Failed to start session. Please try again.</span>
          </div>
        )}

        {/* Start button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handleStartSession}
            disabled={isLoading}
            className={clsxMerge(
              "relative w-full h-12 flex items-center justify-center gap-2 rounded-xl",
              "bg-gradient-to-r from-accent-500 to-accent-700 text-white font-semibold text-base",
              "shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-200 overflow-hidden",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            )}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin relative z-10" />
                <span className="relative z-10">Starting...</span>
              </>
            ) : (
              <>
                <Play className="h-5 w-5 relative z-10" />
                <span className="relative z-10">Start Session with Clara</span>
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Clara will listen, transcribe, and suggest — all in real-time
          </p>
        </div>
      </div>

      {/* ── Upcoming Appointments ─────────────────────────── */}
      <div className="max-w-lg mx-auto mt-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Upcoming Appointments</h3>
          </div>
          <Link to="/appointments" className="text-xs text-accent-700 hover:underline">View all</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:flex-col snap-x snap-mandatory md:snap-none">
          {upcomingAppointments.map((appointment) => (
            <div
              key={appointment.time}
              className="min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink snap-start rounded-xl border border-border bg-card p-4 flex items-center justify-between transition-all hover:border-accent-200 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="min-w-[72px] font-mono text-sm font-semibold text-foreground">{appointment.time}</span>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-sm font-medium text-foreground">{appointment.patient}</p>
                  <p className="text-xs text-muted-foreground">{appointment.type}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleQuickStartFromAppointment(appointment.patientId, appointment.type)}
                disabled={isLoading}
                className="ml-3 flex flex-shrink-0 items-center gap-1.5 rounded-full border border-accent-200 px-3 py-1.5 text-xs font-medium text-accent-700 transition-colors hover:bg-accent-50"
              >
                <Play className="h-3 w-3" />
                Start with Clara
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Sessions ───────────────────────────────── */}
      {recentSessions.length > 0 && (
        <div className="max-w-lg mx-auto mt-8">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Recent Sessions</h3>
          </div>
          <div className="space-y-2">
            {recentSessions.map((session) => {
              const isCompleted = session.status === "completed";
              const startedDate = new Date(session.startedAt);
              const formattedDate = startedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
              const formattedTime = startedDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

              return (
                <Link
                  key={session.id}
                  to={`/clara/session/${session.id}/summary`}
                  className="block bg-card rounded-xl border border-border p-4 hover:border-accent-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={clsxMerge("w-2.5 h-2.5 rounded-full flex-shrink-0", isCompleted ? "bg-success-500" : "bg-warning-500")} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{session.sessionType}</p>
                        <p className="text-xs text-muted-foreground">{formattedDate} at {formattedTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-accent-100 text-accent-700 rounded-full px-2 py-0.5">
                        {session.suggestionCount} suggestions
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/70 group-hover:text-accent-500 transition-colors" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 ml-5.5">
                    <p className="text-xs text-muted-foreground/70 italic truncate max-w-[200px] sm:max-w-[280px]">
                      Session transcript preview...
                    </p>
                    <span className="flex items-center gap-1 text-xs text-accent-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                      View Summary <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Feature Cards ────────────────────────────────── */}
      <div className="max-w-3xl mx-auto mt-10">
        <h3 className="text-sm font-semibold text-foreground mb-4 text-center">What Clara Can Do</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className="bg-card rounded-xl border border-border p-5 text-center hover:shadow-md hover:border-accent-200 transition-all duration-200 group"
            >
              <div className="bg-accent-50 rounded-xl p-2.5 mx-auto w-fit">
                <card.icon className="h-8 w-8 text-accent-500" />
              </div>
              <p className="text-sm font-semibold text-foreground mt-3">{card.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              <p className="text-xs font-mono text-accent-700 mt-2">{card.stat}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── How It Works ──────────────────────────────────── */}
      <div className="max-w-2xl mx-auto mt-10 mb-6">
        <h3 className="text-sm font-semibold text-foreground text-center mb-6">How It Works</h3>

        {/* Desktop: horizontal stepper */}
        <div className="hidden md:flex items-start justify-between relative">
          <div className="absolute top-[44px] left-[10%] right-[10%] border-t-2 border-dashed border-border" />
          {howItWorksSteps.map((step, stepIndex) => (
            <div key={step.label} className="flex flex-col items-center text-center relative z-10 w-1/4">
              <div className="bg-card rounded-xl p-2.5 mb-3">
                <step.icon className="h-5 w-5 text-accent-500" />
              </div>
              <div className="h-7 w-7 rounded-full bg-accent-500 text-white text-xs font-bold flex items-center justify-center">
                {stepIndex + 1}
              </div>
              <p className="text-sm font-medium text-foreground mt-2">{step.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Mobile: vertical stepper */}
        <div className="md:hidden relative pl-10">
          <div className="absolute left-[14px] top-4 bottom-4 border-l-2 border-dashed border-border" />
          <div className="space-y-6">
            {howItWorksSteps.map((step, stepIndex) => (
              <div key={step.label} className="relative flex items-start gap-4">
                <div className="absolute -left-10 flex flex-col items-center">
                  <div className="h-7 w-7 rounded-full bg-accent-500 text-white text-xs font-bold flex items-center justify-center relative z-10">
                    {stepIndex + 1}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <step.icon className="h-4 w-4 text-accent-500" />
                    <p className="text-sm font-medium text-foreground">{step.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HIPAA Footer ──────────────────────────────────── */}
      <div className="text-center mt-6 mb-8 max-w-md mx-auto">
        <div className="flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            End-to-end encrypted. HIPAA-compliant. Clara never stores audio recordings.
          </p>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-1">Clara v1.0 — Powered by MediTrack AI</p>
      </div>

      {/* ── Mobile Fixed Bottom Bar ───────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-3 z-40">
        <button
          type="button"
          onClick={handleStartSession}
          disabled={isLoading}
          className={clsxMerge(
            "w-full h-12 flex items-center justify-center gap-2 rounded-xl",
            "bg-gradient-to-r from-accent-500 to-accent-700 text-white font-semibold transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Play className="h-5 w-5" />
          )}
          Start Session
        </button>
      </div>

    </div>
  );
}
