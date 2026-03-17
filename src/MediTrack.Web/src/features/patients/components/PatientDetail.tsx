import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Pencil,
  UserCheck as UserCheckIcon,
  Loader2,
  AlertCircle,
  Phone,
  User,
  FileText,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  Shield,
  Hash,
  Clock,
  Ban,
  Pill,
  Stethoscope,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Weight,
  Ruler,
  Calculator,
  CalendarDays,
  Upload,
  Image,
  File,
  ClipboardCopy,
  Filter,
  Plus,
} from "lucide-react";
import {
  useGetPatientByIdQuery,
  useDeactivatePatientMutation,
  useActivatePatientMutation,
} from "../store/patientApi";
import { useStartSessionMutation } from "@/features/clara";
import {
  useGetMedicalRecordsByPatientIdQuery,
  useGetMedicalRecordByIdQuery,
} from "@/features/medical-records";
import type {
  VitalSignsResponse,
  PrescriptionResponse,
} from "@/features/medical-records";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useRoles } from "@/shared/auth/useRoles";
import { UserRole } from "@/shared/auth/roles";
import { Breadcrumb } from "@/shared/components";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { useClaraPanel } from "@/shared/components/clara/ClaraPanelContext";
import { PatientTimeline, EVENT_TYPE_CONFIG } from "./PatientTimeline";
import type { TimelineEventType } from "./PatientTimeline";

/* ── Avatar color rotation ── */

const AVATAR_COLORS = [
  "bg-primary-100 text-primary-700",
  "bg-success-100 text-success-700",
  "bg-error-100 text-error-700",
  "bg-warning-100 text-warning-700",
  "bg-accent-100 text-accent-700",
  "bg-info-100 text-info-700",
  "bg-secondary-100 text-secondary-700",
] as const;

function getAvatarColor(patientId: string): string {
  let hash = 0;
  for (let index = 0; index < patientId.length; index++) {
    hash = ((hash << 5) - hash + patientId.charCodeAt(index)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ── Sub-components ── */

function InfoField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "\u2014"}</p>
    </div>
  );
}

function DetailCard({
  icon: Icon,
  title,
  children,
  accent,
}: {
  readonly icon: React.ElementType;
  readonly title: string;
  readonly children: React.ReactNode;
  readonly accent?: string;
}) {
  return (
    <div className={clsxMerge(
      "rounded-lg border border-border bg-card p-6 shadow-sm",
      accent && `border-l-4 ${accent}`
    )}>
      <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
        <Icon className="h-5 w-5 text-primary-700" />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ── Vital sign config (matches MedicalRecordDetail) ── */

const VITAL_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  "Blood Pressure": { icon: Heart, color: "text-warning-600" },
  "Heart Rate": { icon: Activity, color: "text-error-600" },
  "Temperature": { icon: Thermometer, color: "text-info-600" },
  "Respiratory Rate": { icon: Wind, color: "text-primary-600" },
  "O2 Saturation": { icon: Droplets, color: "text-info-600" },
  "Weight": { icon: Weight, color: "text-secondary-600" },
  "Height": { icon: Ruler, color: "text-secondary-600" },
  "BMI": { icon: Calculator, color: "text-accent-600" },
};

const DEFAULT_VITAL_CONFIG = { icon: Activity, color: "text-muted-foreground" };

interface VitalCardProps {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly warning?: boolean;
  readonly vitalKey: string;
}

function VitalCard({ label, value, unit, warning, vitalKey }: VitalCardProps) {
  const config = VITAL_CONFIG[vitalKey] || DEFAULT_VITAL_CONFIG;
  const VitalIcon = config.icon;
  const colorClass = warning ? "text-warning-600" : config.color;

  return (
    <div className="rounded-lg bg-muted p-4">
      <VitalIcon className={clsxMerge("mb-2 h-4 w-4", colorClass)} />
      <p className={clsxMerge("text-2xl font-bold", colorClass)}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {label}
        {unit && <span className="ml-1 text-muted-foreground/70">{unit}</span>}
      </p>
    </div>
  );
}

/* ── Severity badge helper ── */

const SEVERITY_STYLES: Record<string, string> = {
  Mild: "bg-success-50 text-success-700 border-success-200",
  Moderate: "bg-warning-50 text-warning-700 border-warning-200",
  Severe: "bg-error-50 text-error-700 border-error-200",
  Critical: "bg-error-100 text-error-800 border-error-300",
};

function SeverityBadge({ severity }: { readonly severity: string }) {
  return (
    <span
      className={clsxMerge(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        SEVERITY_STYLES[severity] || "bg-muted text-foreground/80 border-border"
      )}
    >
      {severity}
    </span>
  );
}

/* ── Demo data: Upcoming Appointments ── */

interface DemoAppointment {
  readonly id: string;
  readonly date: string;
  readonly type: string;
  readonly providerName: string;
}

const DEMO_APPOINTMENTS: DemoAppointment[] = [
  {
    id: "apt-1",
    date: "2026-03-18T10:00:00",
    type: "Follow-up",
    providerName: "Dr. Sarah Martinez",
  },
  {
    id: "apt-2",
    date: "2026-03-25T14:30:00",
    type: "Consultation",
    providerName: "Dr. James Chen",
  },
  {
    id: "apt-3",
    date: "2026-04-05T09:00:00",
    type: "Follow-up",
    providerName: "Dr. Sarah Martinez",
  },
];

/* ── Demo data: Documents ── */

interface DemoDocument {
  readonly id: string;
  readonly filename: string;
  readonly fileType: "pdf" | "image" | "other";
  readonly uploadDate: string;
  readonly fileSize: string;
}

const DEMO_DOCUMENTS: DemoDocument[] = [
  {
    id: "doc-1",
    filename: "Consent Form.pdf",
    fileType: "pdf",
    uploadDate: "2026-02-20",
    fileSize: "245 KB",
  },
  {
    id: "doc-2",
    filename: "Lab Report 2026-03.pdf",
    fileType: "pdf",
    uploadDate: "2026-03-08",
    fileSize: "1.2 MB",
  },
  {
    id: "doc-3",
    filename: "Insurance Card.jpg",
    fileType: "image",
    uploadDate: "2026-01-15",
    fileSize: "380 KB",
  },
];

function getDocumentIcon(fileType: DemoDocument["fileType"]) {
  switch (fileType) {
    case "pdf":
      return FileText;
    case "image":
      return Image;
    default:
      return File;
  }
}

/* ── Upcoming Appointments card ── */

function UpcomingAppointmentsCard({ patientId }: { readonly patientId: string }) {
  return (
    <DetailCard icon={CalendarDays} title="Upcoming Appointments" accent="border-l-primary-500">
      {DEMO_APPOINTMENTS.length > 0 ? (
        <div className="space-y-3">
          {DEMO_APPOINTMENTS.map((appointment) => {
            const appointmentDate = new Date(appointment.date);
            const formattedDate = appointmentDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            const formattedTime = appointmentDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <Link
                key={appointment.id}
                to={`/appointments/${appointment.id}`}
                className={clsxMerge(
                  "flex items-center gap-3 rounded-md border border-border bg-muted p-3",
                  "transition-colors hover:border-primary-300 hover:bg-primary-50"
                )}
              >
                <div className="flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                  <span className="text-xs font-bold leading-none">
                    {appointmentDate.getDate()}
                  </span>
                  <span className="text-[10px] uppercase leading-none">
                    {appointmentDate.toLocaleDateString("en-US", { month: "short" })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{appointment.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {formattedDate} at {formattedTime} &middot; {appointment.providerName}
                  </p>
                </div>
              </Link>
            );
          })}
          <Link
            to={`/appointments/new?patientId=${patientId}`}
            className={clsxMerge(
              "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg",
              "border border-dashed border-primary-300 bg-primary-50",
              "text-sm font-medium text-primary-700",
              "transition-colors hover:bg-primary-100"
            )}
          >
            <Plus className="h-4 w-4" />
            Book New Appointment
          </Link>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">No upcoming appointments</p>
      )}
    </DetailCard>
  );
}

/* ── Documents card ── */

function DocumentsCard() {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    toast.info("Document upload is a demo feature.");
  };

  const handleUploadClick = () => {
    toast.info("Document upload is a demo feature.");
  };

  return (
    <DetailCard icon={FileText} title="Documents" accent="border-l-secondary-500">
      <div className="space-y-3">
        {DEMO_DOCUMENTS.map((document) => {
          const DocIcon = getDocumentIcon(document.fileType);
          return (
            <div
              key={document.id}
              className="flex items-center gap-3 rounded-md border border-border bg-muted p-3"
            >
              <DocIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {document.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(document.uploadDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  &middot; {document.fileSize}
                </p>
              </div>
            </div>
          );
        })}

        {/* Upload drag-drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={clsxMerge(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6",
            "transition-colors",
            isDragOver
              ? "border-primary-400 bg-primary-50"
              : "border-border bg-muted"
          )}
        >
          <Upload className="h-6 w-6 text-muted-foreground/70" />
          <p className="text-sm text-muted-foreground">
            Drag files here or{" "}
            <button
              type="button"
              onClick={handleUploadClick}
              className="font-medium text-primary-700 hover:underline"
            >
              browse
            </button>
          </p>
        </div>
      </div>
    </DetailCard>
  );
}

/* ── Timeline filter controls ── */

const ALL_EVENT_TYPES: TimelineEventType[] = [
  "encounter",
  "lab",
  "medication",
  "note",
  "clara",
];

function TimelineFilterBar({
  enabledTypes,
  dateFrom,
  dateTo,
  onToggleType,
  onDateFromChange,
  onDateToChange,
}: {
  readonly enabledTypes: ReadonlySet<TimelineEventType>;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly onToggleType: (eventType: TimelineEventType) => void;
  readonly onDateFromChange: (value: string) => void;
  readonly onDateToChange: (value: string) => void;
}) {
  return (
    <div className="mb-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground/80">Filters</p>
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        {/* Type checkboxes */}
        <div className="flex-1">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Event Types
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_EVENT_TYPES.map((eventType) => {
              const config = EVENT_TYPE_CONFIG[eventType];
              const isEnabled = enabledTypes.has(eventType);
              return (
                <label
                  key={eventType}
                  className={clsxMerge(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                    "transition-colors select-none",
                    isEnabled
                      ? `${config.bgColor} ${config.iconColor} border-current`
                      : "border-border bg-muted text-muted-foreground/70"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => onToggleType(eventType)}
                    className="sr-only"
                  />
                  {config.label}
                </label>
              );
            })}
          </div>
        </div>

        {/* Date range */}
        <div className="flex items-end gap-2">
          <div>
            <label
              htmlFor="timeline-date-from"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              From
            </label>
            <input
              id="timeline-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => onDateFromChange(event.target.value)}
              className="h-9 rounded-md border border-border px-2 text-sm text-foreground/80 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label
              htmlFor="timeline-date-to"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              To
            </label>
            <input
              id="timeline-date-to"
              type="date"
              value={dateTo}
              onChange={(event) => onDateToChange(event.target.value)}
              className="h-9 rounded-md border border-border px-2 text-sm text-foreground/80 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Clara context prompts for patient ── */

const CLARA_PATIENT_PROMPTS = [
  "Summarize recent visits",
  "Check medication interactions",
  "Review lab trends",
  "Suggest follow-up plan",
] as const;

/* ── Clinical tab ── */

function PatientClinicalTab({
  patientId,
  allergies,
}: {
  readonly patientId: string;
  readonly allergies?: string;
}) {
  const {
    data: medicalRecords,
    isLoading: isLoadingRecords,
  } = useGetMedicalRecordsByPatientIdQuery(patientId);

  // Get the most recent record's ID to fetch full details (with prescriptions + vitals)
  const sortedRecords = medicalRecords
    ? [...medicalRecords].sort(
        (recordA, recordB) =>
          new Date(recordB.recordedAt).getTime() - new Date(recordA.recordedAt).getTime()
      )
    : [];

  const mostRecentRecordId = sortedRecords.length > 0 ? sortedRecords[0].id : undefined;

  const {
    data: latestFullRecord,
    isLoading: isLoadingFullRecord,
  } = useGetMedicalRecordByIdQuery(mostRecentRecordId!, {
    skip: !mostRecentRecordId,
  });

  const isLoading = isLoadingRecords || isLoadingFullRecord;

  // Active problems: non-archived, non-resolved records
  const activeProblems = sortedRecords.filter(
    (record) => record.status !== "Resolved" && record.status !== "Archived"
  );

  // Active prescriptions from the most recent full record
  const activePrescriptions = latestFullRecord
    ? latestFullRecord.prescriptions.filter(
        (prescription) => prescription.status === "Active"
      )
    : [];

  // Deduplicate by medication name (keep most recent)
  const uniquePrescriptionMap = new Map<string, PrescriptionResponse>();
  for (const prescription of activePrescriptions) {
    if (!uniquePrescriptionMap.has(prescription.medicationName)) {
      uniquePrescriptionMap.set(prescription.medicationName, prescription);
    }
  }
  const uniqueActivePrescriptions = Array.from(uniquePrescriptionMap.values());

  // Latest vital signs from the most recent record that has them
  const latestVitals: VitalSignsResponse | undefined =
    latestFullRecord && latestFullRecord.vitalSigns.length > 0
      ? latestFullRecord.vitalSigns[0]
      : undefined;

  // Parse allergies from comma-separated string
  const allergyItems = allergies
    ? allergies
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-700" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Allergies & Contraindications */}
      <DetailCard icon={AlertTriangle} title="Allergies & Contraindications" accent="border-l-warning-500">
        {allergyItems.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allergyItems.map((allergy) => (
              <span
                key={allergy}
                className="inline-flex items-center rounded-full bg-warning-50 px-3 py-1 text-sm font-medium text-warning-700"
              >
                {allergy}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">No allergies on file</p>
        )}
      </DetailCard>

      {/* Active Medications */}
      <DetailCard icon={Pill} title="Active Medications" accent="border-l-secondary-500">
        {uniqueActivePrescriptions.length > 0 ? (
          <div className="space-y-3">
            {uniqueActivePrescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="rounded-md border border-border bg-muted p-3"
              >
                <p className="font-medium text-foreground">{prescription.medicationName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {prescription.dosage} &middot; {prescription.frequency}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">No active medications on file</p>
        )}
      </DetailCard>

      {/* Active Problems / Diagnoses */}
      <DetailCard icon={Stethoscope} title="Active Problems" accent="border-l-primary-500">
        {activeProblems.length > 0 ? (
          <div className="space-y-3">
            {activeProblems.map((record) => (
              <div
                key={record.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{record.diagnosisDescription}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {record.diagnosisCode}
                  </p>
                </div>
                <SeverityBadge severity={record.severity} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">No active problems on file</p>
        )}
      </DetailCard>

      {/* Recent Vital Signs */}
      <DetailCard icon={Activity} title="Recent Vital Signs" accent="border-l-info-500">
        {latestVitals ? (
          <div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {latestVitals.bloodPressureFormatted != null && (
                <VitalCard
                  vitalKey="Blood Pressure"
                  label="Blood Pressure"
                  value={latestVitals.bloodPressureFormatted}
                  unit="mmHg"
                  warning={
                    (latestVitals.bloodPressureSystolic != null &&
                      latestVitals.bloodPressureSystolic > 140) ||
                    (latestVitals.bloodPressureDiastolic != null &&
                      latestVitals.bloodPressureDiastolic > 90)
                  }
                />
              )}
              {latestVitals.heartRate != null && (
                <VitalCard
                  vitalKey="Heart Rate"
                  label="Heart Rate"
                  value={String(latestVitals.heartRate)}
                  unit="bpm"
                  warning={latestVitals.heartRate > 100 || latestVitals.heartRate < 60}
                />
              )}
              {latestVitals.temperature != null && (
                <VitalCard
                  vitalKey="Temperature"
                  label="Temperature"
                  value={String(latestVitals.temperature)}
                  unit="°F"
                  warning={latestVitals.temperature > 100.4 || latestVitals.temperature < 97}
                />
              )}
              {latestVitals.respiratoryRate != null && (
                <VitalCard
                  vitalKey="Respiratory Rate"
                  label="Respiratory Rate"
                  value={String(latestVitals.respiratoryRate)}
                  unit="/min"
                  warning={
                    latestVitals.respiratoryRate > 20 || latestVitals.respiratoryRate < 12
                  }
                />
              )}
              {latestVitals.oxygenSaturation != null && (
                <VitalCard
                  vitalKey="O2 Saturation"
                  label="O₂ Saturation"
                  value={String(latestVitals.oxygenSaturation)}
                  unit="%"
                  warning={latestVitals.oxygenSaturation < 95}
                />
              )}
              {latestVitals.weight != null && (
                <VitalCard
                  vitalKey="Weight"
                  label="Weight"
                  value={String(latestVitals.weight)}
                  unit="lbs"
                />
              )}
              {latestVitals.height != null && (
                <VitalCard
                  vitalKey="Height"
                  label="Height"
                  value={String(latestVitals.height)}
                  unit="in"
                />
              )}
              {latestVitals.bmi != null && (
                <VitalCard
                  vitalKey="BMI"
                  label="BMI"
                  value={latestVitals.bmi.toFixed(1)}
                  warning={latestVitals.bmi > 30 || latestVitals.bmi < 18.5}
                />
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Recorded by {latestVitals.recordedByName} on{" "}
              {new Date(latestVitals.recordedAt).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">No vital signs recorded</p>
        )}
      </DetailCard>
    </div>
  );
}

/* ── Main component ── */

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: patient, isLoading, error } = useGetPatientByIdQuery(id!);
  const [deactivatePatient, { isLoading: isDeactivating }] = useDeactivatePatientMutation();
  const [activatePatient, { isLoading: isActivating }] = useActivatePatientMutation();
  const [startSession, { isLoading: isStartingSession }] = useStartSessionMutation();
  const { hasAnyRole } = useRoles();
  const canManagePatientStatus = hasAnyRole([UserRole.Admin, UserRole.Receptionist]);
  const canStartClaraSession = hasAnyRole([UserRole.Doctor, UserRole.Admin]);
  const [isMrnCopied, setIsMrnCopied] = useState(false);
  const [isSummaryCopied, setIsSummaryCopied] = useState(false);
  const [isClaraContextOpen, setIsClaraContextOpen] = useState(false);
  const { openPanel: openClaraPanel, setPageContext } = useClaraPanel();

  // Page context for Clara (Enhancement 4)
  useEffect(() => {
    if (patient) {
      setPageContext({
        type: "patient-detail",
        patientId: patient.id,
        patientName: patient.fullName,
      });
    }
    return () => setPageContext({ type: "default" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id, patient?.fullName]);

  // Timeline filter state
  const [timelineEnabledTypes, setTimelineEnabledTypes] = useState<Set<TimelineEventType>>(
    () => new Set<TimelineEventType>(ALL_EVENT_TYPES)
  );
  const [timelineDateFrom, setTimelineDateFrom] = useState("");
  const [timelineDateTo, setTimelineDateTo] = useState("");

  const handleToggleTimelineType = (eventType: TimelineEventType) => {
    setTimelineEnabledTypes((previous) => {
      const updated = new Set(previous);
      if (updated.has(eventType)) {
        updated.delete(eventType);
      } else {
        updated.add(eventType);
      }
      return updated;
    });
  };

  const handleStartClaraSession = async () => {
    if (!patient) return;
    try {
      const result = await startSession({ patientId: patient.id }).unwrap();
      navigate(`/clara/session/${result.id}`);
    } catch {
      toast.error("Failed to start Clara session. Please try again.");
    }
  };

  const handleCopyMrn = () => {
    if (!patient) return;
    navigator.clipboard.writeText(patient.medicalRecordNumber);
    setIsMrnCopied(true);
    setTimeout(() => setIsMrnCopied(false), 2000);
  };

  const handleCopySummary = () => {
    if (!patient) return;
    const allergyList = patient.allergies
      ? patient.allergies.split(",").map((item) => item.trim()).filter((item) => item.length > 0).join(", ")
      : "None on file";
    const summaryParts = [
      `Name: ${patient.firstName} ${patient.lastName}`,
      `DOB: ${new Date(patient.dateOfBirth).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      `MRN: ${patient.medicalRecordNumber}`,
      `Gender: ${patient.gender || "Not specified"}`,
      `Blood Type: ${patient.bloodType || "Not specified"}`,
      `Allergies: ${allergyList}`,
    ];
    navigator.clipboard.writeText(summaryParts.join("\n"));
    setIsSummaryCopied(true);
    toast.success("Patient summary copied to clipboard.");
    setTimeout(() => setIsSummaryCopied(false), 2000);
  };

  const handleClaraPromptClick = (prompt: string) => {
    setIsClaraContextOpen(false);
    openClaraPanel(prompt);
  };

  const handleDeactivate = async () => {
    if (
      confirm(
        "Are you sure you want to deactivate this patient? They won't appear in default searches."
      )
    ) {
      try {
        await deactivatePatient(id!).unwrap();
        toast.success("Patient deactivated successfully.");
      } catch {
        toast.error("Failed to deactivate patient. Please try again.");
      }
    }
  };

  const handleActivate = async () => {
    try {
      await activatePatient(id!).unwrap();
      toast.success("Patient activated successfully.");
    } catch {
      toast.error("Failed to activate patient. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="mb-3 h-12 w-12 text-muted-foreground/50" />
        <p className="text-lg font-semibold text-foreground/80">Patient not found</p>
        <Link to="/patients" className="mt-2 text-sm text-primary-700 hover:underline">
          &larr; Back to Patients
        </Link>
      </div>
    );
  }

  const fullName = `${patient.firstName} ${patient.lastName}`;
  const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase();

  const formattedDOB = new Date(patient.dateOfBirth).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const age = Math.floor(
    (Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const formattedCreatedAt = new Date(patient.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
  const formattedUpdatedAt = patient.updatedAt
    ? new Date(patient.updatedAt).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      })
    : "\u2014";

  const addressString = typeof patient.address === "string"
    ? patient.address
    : (() => {
        const street2Part = patient.address.street2 ? `, ${patient.address.street2}` : "";
        return `${patient.address.street}${street2Part}, ${patient.address.city}, ${patient.address.state} ${patient.address.zipCode}`;
      })();

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Patients", href: "/patients" },
          { label: fullName },
        ]}
      />

      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-center gap-4">
          <div className={clsxMerge("flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-semibold", getAvatarColor(patient.id))}>
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
              <span
                className={clsxMerge(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  patient.isActive
                    ? "border border-success-500/30 bg-success-50 text-success-700"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {patient.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-sm text-muted-foreground">{patient.medicalRecordNumber}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            to={`/patients/${patient.id}/edit`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
          >
            <Pencil className="h-4 w-4" /> Edit
          </Link>
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
          >
            {isSummaryCopied ? (
              <Check className="h-4 w-4 text-success-500" />
            ) : (
              <ClipboardCopy className="h-4 w-4" />
            )}
            {isSummaryCopied ? "Copied!" : "Copy Summary"}
          </button>
          <Link
            to={`/patients/${patient.id}/medical-records`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <FileText className="h-4 w-4" /> View Medical Records
          </Link>
          {canStartClaraSession && (
            <button
              type="button"
              onClick={handleStartClaraSession}
              disabled={isStartingSession}
              className={clsxMerge(
                "relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg px-4",
                "bg-gradient-to-r from-accent-500 to-accent-700",
                "text-sm font-medium text-white shadow-md",
                "transition-all hover:shadow-lg disabled:opacity-50"
              )}
            >
              {isStartingSession ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Start with Clara
            </button>
          )}
          {canManagePatientStatus && (
            patient.isActive ? (
              <button
                onClick={handleDeactivate}
                disabled={isDeactivating}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-error-500 px-4 text-sm font-medium text-error-700 transition-colors hover:bg-error-50 disabled:opacity-50"
              >
                {isDeactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Deactivate
              </button>
            ) : (
              <button
                onClick={handleActivate}
                disabled={isActivating}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-success-300 px-4 text-sm font-medium text-success-700 transition-colors hover:bg-success-50 disabled:opacity-50"
              >
                {isActivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheckIcon className="h-4 w-4" />}
                Activate
              </button>
            )
          )}
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="details">
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="details" className="flex-1 sm:flex-initial">Details</TabsTrigger>
          <TabsTrigger value="timeline" className="flex-1 sm:flex-initial">Timeline</TabsTrigger>
          <TabsTrigger value="clinical" className="flex-1 sm:flex-initial">Clinical</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <DetailCard icon={User} title="Basic Information">
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Full Name" value={fullName} />
                <InfoField label="Date of Birth" value={`${formattedDOB} (${age} years)`} />
                <InfoField label="Gender" value={patient.gender || "\u2014"} />
                <InfoField label="Blood Type" value={patient.bloodType || "\u2014"} />
              </div>
            </DetailCard>

            <DetailCard icon={Phone} title="Contact Information">
              <div className="space-y-3">
                <InfoField label="Phone" value={patient.phoneNumber} />
                <InfoField label="Email" value={patient.email} />
                <InfoField label="Address" value={addressString} />
              </div>
            </DetailCard>

            <DetailCard icon={AlertTriangle} title="Emergency Contact" accent="border-l-warning-500">
              {patient.emergencyContact && typeof patient.emergencyContact !== "string" ? (
                <div className="space-y-3">
                  <InfoField label="Name" value={patient.emergencyContact.name} />
                  <InfoField label="Relationship" value={patient.emergencyContact.relationship} />
                  <InfoField label="Phone" value={patient.emergencyContact.phoneNumber} />
                  {patient.emergencyContact.email && (
                    <InfoField label="Email" value={patient.emergencyContact.email} />
                  )}
                </div>
              ) : (
                <p className="text-sm italic text-muted-foreground">No emergency contact on file</p>
              )}
            </DetailCard>

            <DetailCard icon={Hash} title="Medical Record Number">
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-md bg-muted p-3 font-mono text-lg font-semibold text-foreground">
                  {patient.medicalRecordNumber}
                </div>
                <button
                  onClick={handleCopyMrn}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted"
                  aria-label="Copy MRN to clipboard"
                >
                  {isMrnCopied ? <Check className="h-4 w-4 text-success-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </DetailCard>

            <DetailCard icon={Shield} title="Insurance Information">
              {patient.insurance && typeof patient.insurance !== "string" ? (
                <div className="space-y-3">
                  <InfoField label="Provider" value={patient.insurance.provider} />
                  <InfoField label="Policy Number" value={patient.insurance.policyNumber} />
                  <InfoField label="Group Number" value={patient.insurance.groupNumber} />
                  {patient.insurance.planName && (
                    <InfoField label="Plan Name" value={patient.insurance.planName} />
                  )}
                </div>
              ) : (
                <p className="text-sm italic text-muted-foreground">No insurance on file</p>
              )}
            </DetailCard>

            <DetailCard icon={Clock} title="Metadata">
              <div className="space-y-3">
                <InfoField label="Created" value={formattedCreatedAt} />
                <InfoField label="Last Updated" value={formattedUpdatedAt} />
              </div>
            </DetailCard>

            {/* Upcoming Appointments (P1) */}
            <UpcomingAppointmentsCard patientId={patient.id} />

            {/* Documents (P2) */}
            <DocumentsCard />
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineFilterBar
            enabledTypes={timelineEnabledTypes}
            dateFrom={timelineDateFrom}
            dateTo={timelineDateTo}
            onToggleType={handleToggleTimelineType}
            onDateFromChange={setTimelineDateFrom}
            onDateToChange={setTimelineDateTo}
          />
          <PatientTimeline
            patientId={patient.id}
            filters={{
              enabledTypes: timelineEnabledTypes,
              dateFrom: timelineDateFrom,
              dateTo: timelineDateTo,
            }}
          />
        </TabsContent>

        <TabsContent value="clinical">
          <PatientClinicalTab patientId={patient.id} allergies={patient.allergies} />
        </TabsContent>
      </Tabs>

      {/* Clara Context FAB (P1 + CC.2) */}
      <button
        type="button"
        onClick={() => setIsClaraContextOpen(true)}
        className={clsxMerge(
          "fixed bottom-20 right-4 z-40 md:bottom-24 md:right-6",
          "flex h-14 w-14 items-center justify-center",
          "rounded-full shadow-lg",
          "bg-gradient-to-br from-accent-500 to-accent-700",
          "text-white transition-all duration-200",
          "hover:shadow-xl hover:scale-105",
          "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
        )}
        aria-label="Ask Clara about this patient"
        title="Ask Clara about this patient"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Clara Context Panel Overlay */}
      {isClaraContextOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/40 md:bg-transparent"
            onClick={() => setIsClaraContextOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-label="Clara Patient Context"
            className={clsxMerge(
              "fixed z-50",
              // Mobile: bottom sheet
              "inset-x-0 bottom-0 rounded-t-2xl md:rounded-t-none",
              // Desktop: right panel
              "md:inset-y-0 md:right-0 md:left-auto md:w-80",
              "flex flex-col bg-card shadow-xl",
              "animate-in slide-in-from-bottom md:slide-in-from-right duration-200"
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-foreground">
                  Ask Clara about {patient.firstName}
                </h2>
                <p className="text-xs text-muted-foreground">AI Medical Secretary</p>
              </div>
              <button
                onClick={() => setIsClaraContextOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground/80 transition-colors"
                aria-label="Close Clara context panel"
              >
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* Recent Clara Sessions (demo) */}
              <div className="mb-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recent Clara Sessions
                </p>
                <div className="space-y-2">
                  <div className="rounded-lg border border-border bg-accent-50 p-3">
                    <p className="text-sm font-medium text-foreground">
                      Follow-up Visit Summary
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Mar 10, 2026 &middot; Persistent cough, labs ordered
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-accent-50 p-3">
                    <p className="text-sm font-medium text-foreground">
                      Annual Physical Summary
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Feb 20, 2026 &middot; New HTN diagnosis, pre-diabetic
                    </p>
                  </div>
                </div>
              </div>

              {/* Suggested prompts */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Suggested Prompts
                </p>
                <div className="space-y-2">
                  {CLARA_PATIENT_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleClaraPromptClick(prompt)}
                      className={clsxMerge(
                        "flex w-full items-center gap-2 rounded-lg border border-border p-3",
                        "bg-card text-left text-sm font-medium text-foreground/80",
                        "transition-all hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700"
                      )}
                    >
                      <Sparkles className="h-4 w-4 flex-shrink-0 text-accent-500" />
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
