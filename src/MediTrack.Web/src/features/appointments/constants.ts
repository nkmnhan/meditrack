import type { AppointmentStatus, AppointmentType } from "./types";

// --- Status display labels and colors ---

interface StatusConfig {
  readonly label: string;
  readonly lightColors: {
    readonly main: string;
    readonly container: string;
    readonly onContainer: string;
  };
}

/** Tailwind classes for calendar event status styling */
export const STATUS_STYLES: Record<AppointmentStatus, string> = {
  Scheduled: "bg-primary-100 border-l-primary-700 text-primary-900",
  Confirmed: "bg-accent-100 border-l-accent-700 text-accent-900",
  CheckedIn: "bg-info-50 border-l-info-700 text-info-900",
  InProgress: "bg-warning-50 border-l-warning-500 text-warning-900",
  Completed: "bg-success-50 border-l-success-500 text-success-900",
  Cancelled: "bg-neutral-100 border-l-neutral-400 text-neutral-700",
  NoShow: "bg-error-50 border-l-error-500 text-error-900",
  Rescheduled: "bg-neutral-100 border-l-neutral-500 text-neutral-800",
};

export const DEFAULT_STATUS_STYLE = "bg-primary-100 border-l-primary-700 text-primary-900";

export const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  Scheduled: {
    label: "Scheduled",
    lightColors: {
      main: "#3b82f6",
      container: "#dbeafe",
      onContainer: "#1e3a5f",
    },
  },
  Confirmed: {
    label: "Confirmed",
    lightColors: {
      main: "#2563eb",
      container: "#bfdbfe",
      onContainer: "#1e3a5f",
    },
  },
  CheckedIn: {
    label: "Checked In",
    lightColors: {
      main: "#0d9488",
      container: "#ccfbf1",
      onContainer: "#134e4a",
    },
  },
  InProgress: {
    label: "In Progress",
    lightColors: {
      main: "#f59e0b",
      container: "#fef3c7",
      onContainer: "#78350f",
    },
  },
  Completed: {
    label: "Completed",
    lightColors: {
      main: "#22c55e",
      container: "#dcfce7",
      onContainer: "#14532d",
    },
  },
  Cancelled: {
    label: "Cancelled",
    lightColors: {
      main: "#94a3b8",
      container: "#f1f5f9",
      onContainer: "#334155",
    },
  },
  NoShow: {
    label: "No Show",
    lightColors: {
      main: "#ef4444",
      container: "#fee2e2",
      onContainer: "#7f1d1d",
    },
  },
  Rescheduled: {
    label: "Rescheduled",
    lightColors: {
      main: "#a855f7",
      container: "#f3e8ff",
      onContainer: "#3b0764",
    },
  },
};

/** Build ScheduleX `calendars` config from status config */
export function buildCalendarStatusMap(): Record<string, { colorName: string; label?: string; lightColors: { main: string; container: string; onContainer: string } }> {
  const calendars: Record<string, { colorName: string; label?: string; lightColors: { main: string; container: string; onContainer: string } }> = {};
  for (const [status, config] of Object.entries(STATUS_CONFIG)) {
    calendars[status.toLowerCase()] = {
      colorName: status.toLowerCase(),
      label: config.label,
      lightColors: config.lightColors,
    };
  }
  return calendars;
}

// --- Type display labels ---

export const TYPE_LABELS: Record<AppointmentType, string> = {
  Consultation: "Consultation",
  FollowUp: "Follow-Up",
  AnnualPhysical: "Annual Physical",
  UrgentCare: "Urgent Care",
  Specialist: "Specialist",
  LabWork: "Lab Work",
  Imaging: "Imaging",
  Vaccination: "Vaccination",
  Telehealth: "Telehealth",
  Procedure: "Procedure",
};

// --- Status workflow transitions ---
// Maps current status → list of allowed next statuses

export const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  Scheduled: ["Confirmed", "Cancelled", "Rescheduled", "NoShow"],
  Confirmed: ["CheckedIn", "Cancelled", "Rescheduled", "NoShow"],
  CheckedIn: ["InProgress", "Cancelled"],
  InProgress: ["Completed"],
  Completed: [],
  Cancelled: [],
  NoShow: [],
  Rescheduled: [],
};

// --- Duration options for the appointment form ---

export const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
] as const;

// --- Type options for the appointment form ---

export const TYPE_OPTIONS: { value: AppointmentType; label: string }[] = Object.entries(TYPE_LABELS).map(
  ([value, label]) => ({ value: value as AppointmentType, label }),
);
