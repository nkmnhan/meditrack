import { useState } from "react";
import {
  Stethoscope,
  TestTube2,
  Pill,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

/* ── Types ── */

export type TimelineEventType = "encounter" | "lab" | "medication" | "note" | "clara";

interface TimelineEvent {
  readonly id: string;
  readonly type: TimelineEventType;
  readonly title: string;
  readonly description: string;
  readonly detail: string;
  readonly date: string;
}

interface TimelineFilters {
  readonly enabledTypes: ReadonlySet<TimelineEventType>;
  readonly dateFrom: string;
  readonly dateTo: string;
}

interface PatientTimelineProps {
  readonly patientId: string;
  readonly filters?: TimelineFilters;
}

/* ── Event type configuration ── */

export const EVENT_TYPE_CONFIG: Record<
  TimelineEventType,
  {
    readonly icon: React.ElementType;
    readonly dotColor: string;
    readonly iconColor: string;
    readonly bgColor: string;
    readonly label: string;
  }
> = {
  encounter: {
    icon: Stethoscope,
    dotColor: "bg-primary-700",
    iconColor: "text-primary-700",
    bgColor: "bg-primary-50",
    label: "Encounter",
  },
  lab: {
    icon: TestTube2,
    dotColor: "bg-warning-500",
    iconColor: "text-warning-700",
    bgColor: "bg-warning-50",
    label: "Lab Result",
  },
  medication: {
    icon: Pill,
    dotColor: "bg-secondary-700",
    iconColor: "text-secondary-700",
    bgColor: "bg-secondary-50",
    label: "Medication",
  },
  note: {
    icon: FileText,
    dotColor: "bg-info-500",
    iconColor: "text-info-700",
    bgColor: "bg-info-50",
    label: "Note",
  },
  clara: {
    icon: Sparkles,
    dotColor: "bg-accent-500",
    iconColor: "text-accent-700",
    bgColor: "bg-accent-50",
    label: "Clara Session",
  },
};

/* ── Demo data ── */

function getDemoEvents(_patientId: string): TimelineEvent[] {
  return [
    {
      id: "evt-1",
      type: "clara",
      title: "Clara AI consultation",
      description: "Session summary generated for follow-up visit",
      detail:
        "Clara identified key symptoms: persistent cough (2 weeks), mild fatigue. Suggested CBC panel and chest X-ray. Documented differential diagnoses including upper respiratory infection and seasonal allergies.",
      date: "2026-03-10T14:30:00",
    },
    {
      id: "evt-2",
      type: "encounter",
      title: "Follow-up Visit",
      description: "Follow-up for respiratory symptoms",
      detail:
        "Patient presented with persistent cough lasting 2 weeks. Lungs clear on auscultation. No fever. Prescribed symptomatic treatment and ordered lab work. Follow-up in 2 weeks if symptoms persist.",
      date: "2026-03-10T14:00:00",
    },
    {
      id: "evt-3",
      type: "lab",
      title: "CBC Panel",
      description: "Complete blood count — results within normal limits",
      detail:
        "WBC: 7.2 (normal), RBC: 4.8 (normal), Hemoglobin: 14.1 g/dL (normal), Platelets: 250K (normal). No abnormalities detected. Results reviewed by Dr. Martinez.",
      date: "2026-03-08T09:15:00",
    },
    {
      id: "evt-4",
      type: "medication",
      title: "Started Lisinopril 10mg",
      description: "ACE inhibitor for blood pressure management",
      detail:
        "Initiated Lisinopril 10mg once daily for Stage 1 hypertension (BP 142/90). Patient counseled on potential side effects including dry cough and dizziness. Recheck BP in 4 weeks.",
      date: "2026-03-05T11:00:00",
    },
    {
      id: "evt-5",
      type: "note",
      title: "Progress note added",
      description: "Updated care plan for hypertension management",
      detail:
        "Care plan updated to include dietary modifications (DASH diet recommended), exercise prescription (150 min moderate activity/week), and medication therapy. Patient agrees with plan. Next review in 1 month.",
      date: "2026-03-05T11:30:00",
    },
    {
      id: "evt-6",
      type: "encounter",
      title: "Annual Physical",
      description: "Routine annual wellness examination",
      detail:
        "Comprehensive physical exam performed. BMI: 26.2 (slightly overweight). BP: 142/90 (elevated — new finding). All other vitals within normal limits. Screening labs ordered. Discussed lifestyle modifications.",
      date: "2026-02-20T10:00:00",
    },
    {
      id: "evt-7",
      type: "lab",
      title: "Metabolic Panel",
      description: "Basic metabolic panel — glucose slightly elevated",
      detail:
        "Glucose: 108 mg/dL (mildly elevated, pre-diabetic range), BUN: 15 (normal), Creatinine: 0.9 (normal), Sodium: 140 (normal), Potassium: 4.2 (normal). Recommend fasting glucose retest in 3 months.",
      date: "2026-02-21T08:45:00",
    },
    {
      id: "evt-8",
      type: "medication",
      title: "Adjusted Metformin",
      description: "Increased dosage from 500mg to 850mg daily",
      detail:
        "Based on HbA1c trending upward (6.1%), Metformin dose increased to 850mg once daily with dinner. Patient tolerating current dose well with no GI side effects. Recheck HbA1c in 3 months.",
      date: "2026-02-15T09:30:00",
    },
    {
      id: "evt-9",
      type: "note",
      title: "Referral letter",
      description: "Referral to endocrinology for glucose management",
      detail:
        "Referral sent to Dr. Patel (Endocrinology) for further evaluation of pre-diabetic state given family history of Type 2 diabetes (mother, maternal grandmother). Appointment pending scheduling.",
      date: "2026-02-10T16:00:00",
    },
    {
      id: "evt-10",
      type: "clara",
      title: "Session summary generated",
      description: "Clara summarized annual physical findings",
      detail:
        "Clara generated comprehensive visit summary highlighting: new hypertension diagnosis, pre-diabetic glucose levels, and updated medication list. Summary shared with patient via portal. Flagged elevated cardiovascular risk score for physician review.",
      date: "2026-02-20T10:45:00",
    },
  ];
}

/* ── Timeline item component ── */

interface TimelineItemProps {
  readonly event: TimelineEvent;
  readonly isLast: boolean;
}

function TimelineItem({ event, isLast }: TimelineItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = EVENT_TYPE_CONFIG[event.type];
  const Icon = config.icon;

  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formattedTime = new Date(event.date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="relative flex gap-4">
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <div
          className={clsxMerge(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
            config.bgColor
          )}
        >
          <div className={clsxMerge("h-3 w-3 rounded-full", config.dotColor)} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-border" />
        )}
      </div>

      {/* Content */}
      <div className={clsxMerge("flex-1 pb-6", isLast && "pb-0")}>
        <button
          type="button"
          onClick={() => setIsExpanded(previousState => !previousState)}
          className={clsxMerge(
            "w-full rounded-lg border border-border bg-card p-4 text-left shadow-sm",
            "transition-all hover:border-border hover:shadow-md"
          )}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Icon className={clsxMerge("mt-0.5 h-5 w-5 flex-shrink-0", config.iconColor)} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {event.title}
                  </h4>
                  <span
                    className={clsxMerge(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      config.bgColor,
                      config.iconColor
                    )}
                  >
                    {config.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium text-foreground/80">{formattedDate}</p>
                <p className="text-xs text-muted-foreground">{formattedTime}</p>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground/70" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground/70" />
              )}
            </div>
          </div>

          {/* Mobile date — visible only on small screens */}
          <p className="mt-2 text-xs text-muted-foreground sm:hidden">
            {formattedDate} at {formattedTime}
          </p>

          {/* Expanded detail */}
          {isExpanded && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-sm leading-relaxed text-foreground/80">
                {event.detail}
              </p>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Main component ── */

export function PatientTimeline({ patientId, filters }: PatientTimelineProps) {
  const events = getDemoEvents(patientId);

  const filteredEvents = events.filter((event) => {
    if (filters) {
      if (!filters.enabledTypes.has(event.type)) return false;
      if (filters.dateFrom) {
        const eventDate = new Date(event.date);
        const fromDate = new Date(filters.dateFrom);
        if (eventDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const eventDate = new Date(event.date);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (eventDate > toDate) return false;
      }
    }
    return true;
  });

  const sortedEvents = [...filteredEvents].sort(
    (eventA, eventB) => new Date(eventB.date).getTime() - new Date(eventA.date).getTime()
  );

  if (sortedEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">No timeline events yet</p>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="space-y-0">
        {sortedEvents.map((event, index) => (
          <TimelineItem
            key={event.id}
            event={event}
            isLast={index === sortedEvents.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
