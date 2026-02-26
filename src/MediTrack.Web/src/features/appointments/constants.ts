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
  Scheduled: "bg-blue-100 border-l-blue-500 text-blue-900",
  Confirmed: "bg-blue-200 border-l-blue-600 text-blue-900",
  CheckedIn: "bg-teal-100 border-l-teal-600 text-teal-900",
  InProgress: "bg-amber-100 border-l-amber-500 text-amber-900",
  Completed: "bg-green-100 border-l-green-500 text-green-900",
  Cancelled: "bg-slate-100 border-l-slate-400 text-slate-700",
  NoShow: "bg-red-100 border-l-red-500 text-red-900",
  Rescheduled: "bg-purple-100 border-l-purple-500 text-purple-900",
};

export const DEFAULT_STATUS_STYLE = "bg-blue-100 border-l-blue-500 text-blue-900";

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
