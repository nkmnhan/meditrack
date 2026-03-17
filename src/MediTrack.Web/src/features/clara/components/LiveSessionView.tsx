import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  Mic,
  MicOff,
  Square,
  Loader2,
  AlertCircle,
  Brain,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  ShieldAlert,
  Pill,
  User,
  X,
  AlertTriangle,
  FileText,
  UserX,
  TriangleAlert,
} from "lucide-react";
import { useSession } from "../hooks/useSession";
import { useAudioRecording } from "../hooks/useAudioRecording";
import { useEndSessionMutation, useRequestSuggestionsMutation, useGetSessionQuery } from "../store/claraApi";
import { useGetPatientByIdQuery } from "@/features/patients";
import { useGetMedicalRecordsByPatientIdQuery } from "@/features/medical-records";
import type { Patient } from "@/features/patients";
import type { MedicalRecordListItem } from "@/features/medical-records";
import { TranscriptPanel, detectUrgentKeyword } from "./TranscriptPanel";
import type { AudioQualityLevel } from "./TranscriptPanel";
import { SuggestionPanel } from "./SuggestionPanel";
import { PreviousSessionsList } from "./PreviousSessionsList";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useClaraPanel } from "@/shared/components/clara/ClaraPanelContext";
import { useVoiceCommands } from "../hooks/useVoiceCommands";
import type { ConnectionStatus } from "../types";

type ActiveTab = "transcript" | "suggestions";

/**
 * Main view for an active Clara session.
 * Shows live transcript and AI suggestions side-by-side on desktop,
 * with tab switching on mobile.
 * Includes a collapsible patient context sidebar for clinical safety —
 * allergies, medications, and recent diagnoses are always accessible.
 */
export function LiveSessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("transcript");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPatientSidebarExpanded, setIsPatientSidebarExpanded] = useState(false);
  const [isMobilePatientSheetOpen, setIsMobilePatientSheetOpen] = useState(false);

  // Speaker correction state — maps lineId to corrected speaker
  const [speakerCorrections, setSpeakerCorrections] = useState<Map<string, "Doctor" | "Patient">>(new Map());

  // Audio quality — static "good" by default, can be driven by real metrics later
  const [audioQuality] = useState<AudioQualityLevel>("good");

  // Urgent keyword alert banner
  const [urgentBanner, setUrgentBanner] = useState<string | null>(null);

  const [requestSuggestions, { isLoading: isRequestingSuggestions }] =
    useRequestSuggestionsMutation();
  const [endSessionMutation] = useEndSessionMutation();

  // Fetch session data to get the linked patientId
  const { data: sessionData } = useGetSessionQuery(sessionId ?? "", {
    skip: !sessionId,
  });

  const linkedPatientId = sessionData?.patientId;

  // Fetch patient details when a patient is linked
  const { data: patient, isLoading: isPatientLoading } = useGetPatientByIdQuery(
    linkedPatientId ?? "",
    { skip: !linkedPatientId }
  );

  // Fetch medical records for the linked patient
  const { data: medicalRecords } = useGetMedicalRecordsByPatientIdQuery(
    linkedPatientId ?? "",
    { skip: !linkedPatientId }
  );

  // Parse allergies from the patient's allergies string field
  const allergyList = parseAllergies(patient?.allergies);
  const allergyCount = allergyList.length;

  // Extract active medications from recent medical records
  const activeMedications = extractActiveMedications(medicalRecords);
  const activeMedicationCount = activeMedications.length;

  // Recent diagnoses — last 3 from medical records
  const recentDiagnoses = extractRecentDiagnoses(medicalRecords, 3);

  // Count-up timer from session start
  useEffect(() => {
    const intervalId = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  const formattedTimer = [
    String(elapsedMinutes).padStart(2, "0"),
    String(elapsedSeconds % 60).padStart(2, "0"),
  ].join(":");

  // Timer warning thresholds
  const timerWarningLevel: "normal" | "pulse" | "warning" | "critical" =
    elapsedMinutes >= 45
      ? "critical"
      : elapsedMinutes >= 30
        ? "warning"
        : elapsedMinutes >= 15
          ? "pulse"
          : "normal";

  // Speaker correction handler
  const handleCorrectSpeaker = (lineId: string, newSpeaker: "Doctor" | "Patient") => {
    setSpeakerCorrections((previous) => {
      const updated = new Map(previous);
      updated.set(lineId, newSpeaker);
      return updated;
    });
  };

  // Short session ID for display — first 8 chars uppercased
  const shortSessionId = sessionId
    ? `#${sessionId.slice(0, 8).toUpperCase()}`
    : "#---";

  // Session management via SignalR
  const {
    connectionStatus,
    transcriptLines,
    suggestions,
    sendAudioChunk,
  } = useSession({
    sessionId: sessionId ?? "",
    onError: (sessionError) => {
      setError(sessionError.message);
    },
  });

  // Audio recording
  async function handleAudioChunk(data: ArrayBuffer) {
    try {
      await sendAudioChunk(data);
    } catch (chunkError) {
      console.error("Failed to send audio chunk:", chunkError);
    }
  }

  const {
    isRecording,
    isSupported: isAudioSupported,
    startRecording,
    stopRecording,
  } = useAudioRecording({
    onAudioChunk: handleAudioChunk,
    onError: (audioError) => {
      setError(audioError.message);
    },
  });

  // Urgent keyword detection — scan latest transcript line for urgent terms
  useEffect(() => {
    if (transcriptLines.length === 0) return;
    const latestLine = transcriptLines[transcriptLines.length - 1];
    const detectedKeyword = detectUrgentKeyword(latestLine.text);
    if (detectedKeyword) {
      setUrgentBanner(detectedKeyword);
    }
  }, [transcriptLines]);

  // Auto-dismiss urgent banner after 10 seconds
  useEffect(() => {
    if (!urgentBanner) return;
    const timerId = setTimeout(() => setUrgentBanner(null), 10_000);
    return () => clearTimeout(timerId);
  }, [urgentBanner]);

  // Page context (Enhancement 4)
  const { setPageContext } = useClaraPanel();
  useEffect(() => {
    setPageContext({
      type: "live-session",
      sessionId,
      patientId: linkedPatientId,
      patientName: patient?.fullName,
    });
    return () => setPageContext({ type: "default" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, linkedPatientId, patient?.fullName]);

  const isConnected = connectionStatus === "connected";
  const isConnecting =
    connectionStatus === "connecting" || connectionStatus === "reconnecting";

  const hasLinkedPatient = !!linkedPatientId;

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm("Are you sure you want to end this session? This action cannot be undone.")) {
      return;
    }
    try {
      stopRecording();
      if (sessionId) {
        await endSessionMutation(sessionId).unwrap();
      }
      navigate("/clara");
    } catch (endError) {
      console.error("Failed to end session:", endError);
      setError("Failed to end session");
    }
  };

  const handleRequestSuggestions = async () => {
    if (!sessionId) return;
    try {
      await requestSuggestions(sessionId).unwrap();
    } catch (suggestionError) {
      console.error("Failed to request suggestions:", suggestionError);
    }
  };

  // Voice commands (Enhancement 6)
  const { voiceCommands } = useVoiceCommands({
    transcriptLines,
    isEnabled: isRecording,
    onFlagSuggestion: () => {
      // Flag last suggestion — placeholder for when SuggestionPanel supports it
    },
    onEndSession: handleEndSession,
    onRequestSuggestions: handleRequestSuggestions,
  });

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Invalid session</p>
      </div>
    );
  }

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 flex flex-col bg-muted">
      {/* ── Top Bar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-card shadow-sm flex items-center justify-between h-14 px-4 flex-shrink-0 border-b border-border">
        {/* Left: Back + session ID */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/clara")}
            className="p-2 -ml-2 rounded-lg text-foreground/80 hover:bg-muted transition-colors"
            aria-label="Back to Clara"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-mono text-sm text-foreground hidden sm:inline">
            Session {shortSessionId}
          </span>
          <span className="font-mono text-sm text-foreground sm:hidden">
            {shortSessionId}
          </span>

          {/* Mobile: Patient name + allergy count in header */}
          {hasLinkedPatient && patient && (
            <button
              type="button"
              onClick={() => setIsMobilePatientSheetOpen(true)}
              className="lg:hidden flex items-center gap-1.5 ml-2 px-2 py-1 rounded-md bg-muted border border-border text-xs"
            >
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground/80 font-medium truncate max-w-[80px]">
                {patient.firstName}
              </span>
              {allergyCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-warning-100 text-warning-700 text-[10px] font-semibold h-4 min-w-[16px] px-1">
                  {allergyCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Center: Animated connection status */}
        <ConnectionDot status={connectionStatus} />

        {/* Right: Timer + End Session */}
        <div className="flex items-center gap-3">
          <div
            className={clsxMerge(
              "flex items-center gap-1.5",
              timerWarningLevel === "critical" && "text-error-600",
              timerWarningLevel === "warning" && "text-warning-600",
              timerWarningLevel === "pulse" && "text-foreground/80",
              timerWarningLevel === "normal" && "text-foreground/80"
            )}
          >
            <Clock
              className={clsxMerge(
                "w-4 h-4",
                timerWarningLevel === "critical" && "text-error-600",
                timerWarningLevel === "warning" && "text-warning-600",
                timerWarningLevel === "normal" && "text-muted-foreground",
                timerWarningLevel === "pulse" && "text-muted-foreground"
              )}
            />
            <span
              className={clsxMerge(
                "font-mono text-sm font-medium",
                (timerWarningLevel === "pulse" || timerWarningLevel === "warning") &&
                  "motion-safe:animate-pulse"
              )}
            >
              {formattedTimer}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{transcriptLines.length} lines</span>
            <span className="text-xs text-muted-foreground">{suggestions.length} suggestions</span>
            <div className="flex items-center gap-1 text-accent-700">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-medium">Clara</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEndSession}
            className="h-10 px-3 rounded-lg border border-error-500 text-error-600 text-sm font-medium hover:bg-error-50 transition-colors inline-flex items-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">End Session</span>
          </button>
        </div>
      </header>

      {/* ── Desktop Patient Context Banner ──────────────── */}
      {hasLinkedPatient && (
        <div className="hidden lg:flex items-center justify-between px-4 py-2 bg-card border-b border-border flex-shrink-0">
          {isPatientLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading patient data...</span>
            </div>
          ) : patient ? (
            <>
              {/* Left: Patient name, age, MRN */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-700" />
                  <span className="text-sm font-semibold text-foreground">
                    {patient.fullName}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {patient.age}y &middot; {patient.gender}
                </span>
                <span className="text-xs font-mono text-muted-foreground/70">
                  MRN: {patient.medicalRecordNumber}
                </span>
              </div>

              {/* Middle: Allergy + Medication badges */}
              <div className="flex items-center gap-3">
                <PatientBadge
                  icon={<ShieldAlert className="w-3.5 h-3.5" />}
                  label={`${allergyCount} ${allergyCount === 1 ? "Allergy" : "Allergies"}`}
                  variant={allergyCount > 0 ? "warning" : "neutral"}
                />
                <PatientBadge
                  icon={<Pill className="w-3.5 h-3.5" />}
                  label={`${activeMedicationCount} Active ${activeMedicationCount === 1 ? "Med" : "Meds"}`}
                  variant="neutral"
                />
              </div>

              {/* Right: Toggle expand */}
              <button
                type="button"
                onClick={() => setIsPatientSidebarExpanded(!isPatientSidebarExpanded)}
                className="flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800 transition-colors px-2 py-1 rounded-md hover:bg-primary-50"
              >
                <span>{isPatientSidebarExpanded ? "Hide Details" : "View Details"}</span>
                <ChevronRight
                  className={clsxMerge(
                    "w-4 h-4 transition-transform",
                    isPatientSidebarExpanded && "rotate-180"
                  )}
                />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Patient data unavailable</span>
            </div>
          )}
        </div>
      )}

      {/* ── No Patient Linked Banner ───────────────────── */}
      {!hasLinkedPatient && sessionData && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-muted text-muted-foreground text-sm flex-shrink-0 border-b border-border">
          <UserX className="w-4 h-4 text-muted-foreground/70" />
          <span>No patient linked to this session.</span>
          <Link
            to="/clara"
            className="text-primary-700 hover:text-primary-800 font-medium underline underline-offset-2"
          >
            Go back to select one
          </Link>
        </div>
      )}

      {/* ── Error Banner ─────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-error-50 text-error-700 text-sm flex-shrink-0">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-error-600 hover:text-error-800 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Urgent Keyword Banner ──────────────────────────── */}
      {urgentBanner && (
        <div className="flex items-center gap-2 px-4 py-2 bg-error-50 text-error-700 text-sm font-medium flex-shrink-0 border-b border-error-200">
          <TriangleAlert className="h-4 w-4 flex-shrink-0 text-error-600" />
          <span>Urgent keyword detected: {urgentBanner}</span>
          <button
            type="button"
            onClick={() => setUrgentBanner(null)}
            className="ml-auto text-error-600 hover:text-error-800 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Connecting Banner ────────────────────────────── */}
      {isConnecting && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-info-50 text-info-700 text-sm flex-shrink-0">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            {connectionStatus === "reconnecting"
              ? "Reconnecting..."
              : "Connecting to session..."}
          </span>
        </div>
      )}

      {/* ── Mobile Tab Toggle ────────────────────────────── */}
      <div className="lg:hidden flex items-center bg-card border-b border-border px-4 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("transcript")}
          className={clsxMerge(
            "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors",
            activeTab === "transcript"
              ? "border-accent-500 text-accent-700"
              : "border-transparent text-muted-foreground hover:text-foreground/80"
          )}
        >
          Transcript
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("suggestions")}
          className={clsxMerge(
            "flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors inline-flex items-center justify-center gap-2",
            activeTab === "suggestions"
              ? "border-accent-500 text-accent-700"
              : "border-transparent text-muted-foreground hover:text-foreground/80"
          )}
        >
          Clara&apos;s Notes
          {suggestions.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-accent-100 text-accent-700 text-xs font-semibold h-5 w-5">
              {suggestions.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Main Content ─────────────────────────────────── */}
      <main className="overflow-auto lg:overflow-hidden p-4 lg:p-6 pb-24 lg:pb-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Transcript Panel */}
          <TranscriptPanel
            lines={transcriptLines}
            isRecording={isRecording}
            onToggleRecording={handleToggleRecording}
            onAskClara={handleRequestSuggestions}
            isConnected={isConnected}
            isRequestingSuggestions={isRequestingSuggestions}
            speakerCorrections={speakerCorrections}
            onCorrectSpeaker={handleCorrectSpeaker}
            audioQuality={audioQuality}
            voiceCommands={voiceCommands}
            className={clsxMerge(
              isPatientSidebarExpanded
                ? "lg:w-[45%]"
                : "lg:w-[60%]",
              "min-h-[65vh] lg:min-h-[calc(100dvh-12rem)]",
              activeTab !== "transcript" ? "hidden lg:flex" : ""
            )}
          />

          {/* Suggestions Panel */}
          <SuggestionPanel
            suggestions={suggestions}
            isLoading={isRequestingSuggestions}
            count={suggestions.length}
            className={clsxMerge(
              isPatientSidebarExpanded
                ? "lg:w-[27%]"
                : "lg:w-[40%]",
              "min-h-[65vh] lg:min-h-[calc(100dvh-12rem)]",
              activeTab !== "suggestions" ? "hidden lg:flex" : ""
            )}
          />

          {/* Desktop Patient Context Sidebar */}
          {isPatientSidebarExpanded && (
            <PatientContextSidebar
              patient={patient ?? null}
              allergyList={allergyList}
              activeMedications={activeMedications}
              recentDiagnoses={recentDiagnoses}
              onClose={() => setIsPatientSidebarExpanded(false)}
              currentSessionId={sessionId}
            />
          )}
        </div>
      </main>

      {/* ── Mobile Patient Bottom Sheet ────────────────── */}
      {isMobilePatientSheetOpen && (
        <MobilePatientSheet
          patient={patient ?? null}
          isLoading={isPatientLoading}
          allergyList={allergyList}
          activeMedications={activeMedications}
          recentDiagnoses={recentDiagnoses}
          onClose={() => setIsMobilePatientSheetOpen(false)}
        />
      )}

      {/* ── Mobile Floating Actions ──────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-3 z-40 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleRequestSuggestions}
          disabled={!isConnected || isRequestingSuggestions}
          className="h-10 px-4 rounded-lg bg-accent-700 text-white text-sm font-medium hover:bg-accent-600 transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRequestingSuggestions ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Brain className="w-4 h-4" />
          )}
          Ask Clara
        </button>

        <button
          type="button"
          onClick={handleToggleRecording}
          disabled={!isConnected || !isAudioSupported}
          aria-label={isRecording ? "Mute microphone" : "Unmute microphone"}
          className={clsxMerge(
            "h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all flex-shrink-0",
            isRecording
              ? "bg-accent-500 text-white ring-4 ring-accent-500/20"
              : "bg-border text-foreground/80",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isRecording ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>

        {isRecording ? (
          <span className="text-xs text-accent-700 font-medium w-16">Listening...</span>
        ) : (
          <span className="w-16" />
        )}
      </div>
    </div>
  );
}

/* ── Helper Functions ─────────────────────────────────── */

/**
 * Parses a comma-separated allergies string into an array.
 * Returns empty array if no allergies on file.
 */
function parseAllergies(allergiesString?: string): string[] {
  if (!allergiesString || allergiesString.trim() === "") {
    return [];
  }
  return allergiesString
    .split(",")
    .map((allergy) => allergy.trim())
    .filter((allergy) => allergy.length > 0);
}

/**
 * Extracts active medication names and dosages from medical records prescriptions.
 * Returns an empty array if no records or prescriptions exist.
 */
function extractActiveMedications(
  records?: MedicalRecordListItem[]
): Array<{ name: string; dosage: string }> {
  // MedicalRecordListItem does not include prescriptions — this is a placeholder
  // that will work once we have full record data. For now, return empty.
  if (!records || records.length === 0) {
    return [];
  }
  // Records list items don't carry prescription details, so we gracefully
  // show "No medications on file" until the API provides them at this level.
  return [];
}

/**
 * Extracts recent diagnoses from medical records, sorted by most recent first.
 */
function extractRecentDiagnoses(
  records?: MedicalRecordListItem[],
  limit = 3
): Array<{ code: string; description: string; date: string }> {
  if (!records || records.length === 0) {
    return [];
  }
  const sorted = [...records].sort(
    (recordA, recordB) =>
      new Date(recordB.recordedAt).getTime() - new Date(recordA.recordedAt).getTime()
  );
  return sorted.slice(0, limit).map((record) => ({
    code: record.diagnosisCode,
    description: record.diagnosisDescription,
    date: record.recordedAt,
  }));
}

/**
 * Formats an ISO date string to a short display format (e.g., "Jan 15, 2026").
 */
function formatShortDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/* ── Sub-components ─────────────────────────────────── */

interface ConnectionDotProps {
  readonly status: ConnectionStatus;
}

function ConnectionDot({ status }: ConnectionDotProps) {
  const dotColor =
    status === "connected"
      ? "bg-success-500"
      : status === "connecting" || status === "reconnecting"
        ? "bg-warning-500"
        : "bg-error-500";

  const labelColor =
    status === "connected"
      ? "text-success-600"
      : status === "connecting" || status === "reconnecting"
        ? "text-warning-600"
        : "text-error-600";

  const label =
    status === "connected"
      ? "Connected"
      : status === "connecting"
        ? "Connecting"
        : status === "reconnecting"
          ? "Reconnecting"
          : "Disconnected";

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={clsxMerge(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            dotColor
          )}
        />
        <span
          className={clsxMerge(
            "relative inline-flex rounded-full h-2.5 w-2.5",
            dotColor
          )}
        />
      </span>
      <span className={clsxMerge("text-sm font-medium hidden sm:inline", labelColor)}>
        {label}
      </span>
    </div>
  );
}

/* ── Patient Badge ─────────────────────────────────── */

interface PatientBadgeProps {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly variant: "warning" | "neutral";
}

function PatientBadge({ icon, label, variant }: PatientBadgeProps) {
  return (
    <span
      className={clsxMerge(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        variant === "warning"
          ? "bg-warning-100 text-warning-700"
          : "bg-muted text-muted-foreground"
      )}
    >
      {icon}
      {label}
    </span>
  );
}

/* ── Patient Context Sidebar (Desktop) ─────────────── */

interface PatientContextSidebarProps {
  readonly patient: Patient | null;
  readonly allergyList: string[];
  readonly activeMedications: Array<{ name: string; dosage: string }>;
  readonly recentDiagnoses: Array<{ code: string; description: string; date: string }>;
  readonly onClose: () => void;
  readonly currentSessionId?: string;
}

function PatientContextSidebar({
  patient,
  allergyList,
  activeMedications,
  recentDiagnoses,
  onClose,
  currentSessionId,
}: PatientContextSidebarProps) {
  if (!patient) {
    return null;
  }

  return (
    <aside className="hidden lg:flex flex-col w-72 min-h-[65vh] lg:min-h-[calc(100dvh-12rem)] bg-card rounded-xl border border-border shadow-sm overflow-y-auto flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Patient Context</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Close patient sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-5 p-4">
        {/* Demographics */}
        <section>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Demographics
          </h4>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">{patient.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {patient.age} years old &middot; {patient.gender}
            </p>
            <p className="text-xs text-muted-foreground">
              DOB: {formatShortDate(patient.dateOfBirth)}
            </p>
            <p className="text-xs font-mono text-muted-foreground/70">
              MRN: {patient.medicalRecordNumber}
            </p>
          </div>
        </section>

        {/* Allergies */}
        <section>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-warning-600" />
            Allergies
          </h4>
          {allergyList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {allergyList.map((allergy) => (
                <span
                  key={allergy}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-warning-50 text-warning-700 text-xs font-medium border border-warning-200"
                >
                  {allergy}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/70 italic">No allergies on file</p>
          )}
        </section>

        {/* Active Medications */}
        <section>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Pill className="w-3.5 h-3.5 text-primary-700" />
            Active Medications
          </h4>
          {activeMedications.length > 0 ? (
            <ul className="space-y-1.5">
              {activeMedications.map((medication) => (
                <li
                  key={`${medication.name}-${medication.dosage}`}
                  className="text-xs text-foreground/80"
                >
                  <span className="font-medium">{medication.name}</span>
                  {medication.dosage && (
                    <span className="text-muted-foreground"> — {medication.dosage}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground/70 italic">No medications on file</p>
          )}
        </section>

        {/* Recent Diagnoses */}
        <section>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-info-600" />
            Recent Diagnoses
          </h4>
          {recentDiagnoses.length > 0 ? (
            <ul className="space-y-2">
              {recentDiagnoses.map((diagnosis) => (
                <li
                  key={`${diagnosis.code}-${diagnosis.date}`}
                  className="text-xs"
                >
                  <p className="font-medium text-foreground/80">
                    {diagnosis.description}
                  </p>
                  <p className="text-muted-foreground/70">
                    {diagnosis.code} &middot; {formatShortDate(diagnosis.date)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground/70 italic">No recent diagnoses</p>
          )}
        </section>

        {/* Previous Sessions (Enhancement 5) */}
        {patient && (
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary-700" />
              Previous Sessions
            </h4>
            <PreviousSessionsList
              patientId={patient.id}
              currentSessionId={currentSessionId}
            />
          </section>
        )}
      </div>
    </aside>
  );
}

/* ── Mobile Patient Bottom Sheet ───────────────────── */

interface MobilePatientSheetProps {
  readonly patient: Patient | null;
  readonly isLoading: boolean;
  readonly allergyList: string[];
  readonly activeMedications: Array<{ name: string; dosage: string }>;
  readonly recentDiagnoses: Array<{ code: string; description: string; date: string }>;
  readonly onClose: () => void;
}

function MobilePatientSheet({
  patient,
  isLoading,
  allergyList,
  activeMedications,
  recentDiagnoses,
  onClose,
}: MobilePatientSheetProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="lg:hidden fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
        role="presentation"
      />

      {/* Sheet */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-xl max-h-[75dvh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border flex-shrink-0">
          <h3 className="text-base font-semibold text-foreground">Patient Context</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Close patient details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-4 py-4 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/70" />
            </div>
          ) : patient ? (
            <>
              {/* Demographics */}
              <section>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Demographics
                </h4>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-foreground">{patient.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {patient.age} years old &middot; {patient.gender}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    DOB: {formatShortDate(patient.dateOfBirth)}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground/70">
                    MRN: {patient.medicalRecordNumber}
                  </p>
                </div>
              </section>

              {/* Allergies */}
              <section>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-warning-600" />
                  Allergies
                </h4>
                {allergyList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allergyList.map((allergy) => (
                      <span
                        key={allergy}
                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-warning-50 text-warning-700 text-xs font-medium border border-warning-200"
                      >
                        {allergy}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/70 italic">No allergies on file</p>
                )}
              </section>

              {/* Active Medications */}
              <section>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-primary-700" />
                  Active Medications
                </h4>
                {activeMedications.length > 0 ? (
                  <ul className="space-y-1.5">
                    {activeMedications.map((medication) => (
                      <li
                        key={`${medication.name}-${medication.dosage}`}
                        className="text-xs text-foreground/80"
                      >
                        <span className="font-medium">{medication.name}</span>
                        {medication.dosage && (
                          <span className="text-muted-foreground"> — {medication.dosage}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground/70 italic">No medications on file</p>
                )}
              </section>

              {/* Recent Diagnoses */}
              <section>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-info-600" />
                  Recent Diagnoses
                </h4>
                {recentDiagnoses.length > 0 ? (
                  <ul className="space-y-2">
                    {recentDiagnoses.map((diagnosis) => (
                      <li
                        key={`${diagnosis.code}-${diagnosis.date}`}
                        className="text-xs"
                      >
                        <p className="font-medium text-foreground/80">
                          {diagnosis.description}
                        </p>
                        <p className="text-muted-foreground/70">
                          {diagnosis.code} &middot; {formatShortDate(diagnosis.date)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground/70 italic">No recent diagnoses</p>
                )}
              </section>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/70">
              <AlertTriangle className="w-6 h-6 mb-2" />
              <p className="text-sm">Patient data unavailable</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
