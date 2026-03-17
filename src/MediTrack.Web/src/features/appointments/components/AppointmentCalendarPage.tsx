import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, CalendarDays, Clock, Bell } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useRoles } from "@/shared/auth/useRoles";
import { StaffRoles, UserRole } from "@/shared/auth/roles";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useAppointmentCalendar } from "../hooks/useAppointmentCalendar";
import { CalendarToolbar } from "./CalendarToolbar";
import { AppointmentCalendar } from "./AppointmentCalendar";
import { AppointmentDetailPanel } from "./AppointmentDetailPanel";
import { AppointmentForm } from "./AppointmentForm";
import { Breadcrumb } from "@/shared/components";
import type { AppointmentListItem, AppointmentType } from "../types";
import type { CalendarEvent } from "@schedule-x/calendar";

// --- Appointment type legend configuration ---

interface TypeLegendEntry {
  readonly type: AppointmentType;
  readonly label: string;
  readonly dotColor: string;
}

const APPOINTMENT_TYPE_LEGEND: TypeLegendEntry[] = [
  { type: "Consultation", label: "Consultation", dotColor: "bg-primary-700" },
  { type: "FollowUp", label: "Follow-up", dotColor: "bg-success-500" },
  { type: "UrgentCare", label: "Urgent", dotColor: "bg-error-500" },
  { type: "Telehealth", label: "Telehealth", dotColor: "bg-secondary-700" },
];

// --- Reschedule dialog state ---

interface RescheduleDialogState {
  readonly isOpen: boolean;
  readonly eventTitle: string;
  readonly oldTime: string;
  readonly newTime: string;
  readonly event: CalendarEvent | null;
}

const INITIAL_RESCHEDULE_STATE: RescheduleDialogState = {
  isOpen: false,
  eventTitle: "",
  oldTime: "",
  newTime: "",
  event: null,
};

// --- Helpers ---

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function formatTimeForDisplay(dateValue: string | { epochMilliseconds?: number }): string {
  try {
    if (typeof dateValue === "object" && dateValue.epochMilliseconds) {
      return new Date(dateValue.epochMilliseconds).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
    if (typeof dateValue === "string") {
      const date = new Date(dateValue.replace(" ", "T"));
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      }
    }
    return "";
  } catch {
    return "";
  }
}

function getUpcomingAppointmentCount(appointments: AppointmentListItem[]): number {
  const now = Date.now();
  return appointments.filter((appointment) => {
    const scheduledTime = new Date(appointment.scheduledDateTime).getTime();
    const timeUntil = scheduledTime - now;
    return (
      timeUntil > 0 &&
      timeUntil <= TWO_HOURS_MS &&
      appointment.status !== "Cancelled" &&
      appointment.status !== "Completed" &&
      appointment.status !== "NoShow"
    );
  }).length;
}

// --- Component ---

export function AppointmentCalendarPage() {
  const { hasAnyRole, hasRole } = useRoles();
  const isStaff = hasAnyRole(StaffRoles);
  const isPatient = hasRole(UserRole.Patient);

  // UI state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDefaultDate, setFormDefaultDate] = useState<Date | undefined>();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [rescheduleDialog, setRescheduleDialog] = useState<RescheduleDialogState>(INITIAL_RESCHEDULE_STATE);

  // Memoized callbacks — useCalendarApp captures callbacks on first initialization only,
  // so we must provide stable references via useCallback. Inline arrow functions would be
  // recreated on every render, causing stale closures that don't reflect state changes.
  const handleEventClick = useCallback((appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
  }, []);

  const handleDateTimeClick = useCallback((dateTime: Date) => {
    if (isStaff) {
      setFormDefaultDate(dateTime);
      setIsFormOpen(true);
    }
  }, [isStaff]);

  // DnD rescheduling: When an event is dragged to a new time, ScheduleX fires onEventUpdate.
  // This opens a confirmation dialog before committing the reschedule.
  // NOTE: @schedule-x/drag-and-drop v4 is not yet published (only v3 exists as of 2026-03).
  // When a v4-compatible DnD plugin is released:
  //   1. Install: npm install @schedule-x/drag-and-drop@^4
  //   2. Import createDragAndDropPlugin in useAppointmentCalendar.ts
  //   3. Add it to the plugins array alongside createCurrentTimePlugin()
  // The onEventUpdate callback below is already wired and will handle the confirmation flow.
  const handleEventUpdate = useCallback((event: CalendarEvent) => {
    const eventTitle = (event.title as string) || "this appointment";
    const newTime = formatTimeForDisplay(event.start as string | { epochMilliseconds?: number });

    setRescheduleDialog({
      isOpen: true,
      eventTitle,
      oldTime: "", // ScheduleX does not provide the original time in onEventUpdate
      newTime,
      event,
    });
  }, []);

  function handleRescheduleConfirm() {
    // TODO: Call rescheduleAppointment mutation with the new time from rescheduleDialog.event
    setRescheduleDialog(INITIAL_RESCHEDULE_STATE);
  }

  function handleRescheduleCancel() {
    // TODO: Revert the event position in the calendar when DnD is enabled
    setRescheduleDialog(INITIAL_RESCHEDULE_STATE);
  }

  const {
    calendar,
    isLoading,
    isFetching,
    error,
    appointments,
  } = useAppointmentCalendar({
    providerId: selectedProviderId ?? undefined,
    onEventClick: handleEventClick,
    onDateTimeClick: handleDateTimeClick,
    onEventUpdate: handleEventUpdate,
  });

  const upcomingCount = getUpcomingAppointmentCount(appointments);

  // Close panels on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isFormOpen) {
          setIsFormOpen(false);
        } else if (selectedAppointmentId) {
          setSelectedAppointmentId(null);
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFormOpen, selectedAppointmentId]);

  function handleNewAppointment() {
    setFormDefaultDate(undefined);
    setIsFormOpen(true);
  }

  function handleFormClose() {
    setIsFormOpen(false);
    setFormDefaultDate(undefined);
  }

  function handleDetailClose() {
    setSelectedAppointmentId(null);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <AlertCircle className="h-10 w-10 text-error-500" />
        <p className="text-lg font-medium text-foreground">Failed to load appointments</p>
        <p className="text-sm text-muted-foreground">Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Appointments" },
        ]}
      />

      {/* Toolbar */}
      <CalendarToolbar
        selectedProviderId={selectedProviderId}
        onProviderSelect={setSelectedProviderId}
        onNewAppointment={handleNewAppointment}
        isStaff={isStaff}
        isPatient={isPatient}
        isFetching={isFetching}
      />

      {/* Enhancement 1: Color Legend for Appointment Types */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-2 md:gap-5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Types:</span>
        {APPOINTMENT_TYPE_LEGEND.map((entry) => (
          <div key={entry.type} className="flex items-center gap-1.5">
            <span className={clsxMerge("h-2.5 w-2.5 shrink-0 rounded-full", entry.dotColor)} />
            <span className="text-xs text-foreground/80">{entry.label}</span>
          </div>
        ))}
      </div>

      {/* Enhancement 5: Upcoming Appointments Banner */}
      {upcomingCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning-200 bg-warning-50 px-4 py-2.5">
          <Bell className="h-4 w-4 shrink-0 text-warning-600" />
          <p className="text-sm font-medium text-warning-800">
            {upcomingCount} appointment{upcomingCount !== 1 ? "s" : ""} in the next 2 hours
          </p>
          <Clock className="ml-auto h-4 w-4 shrink-0 text-warning-400" />
        </div>
      )}

      {/* Calendar — Enhancement 3 (current time indicator) is enabled via the
          createCurrentTimePlugin in useAppointmentCalendar. The plugin renders a
          red horizontal line at the current time in day/week views automatically.
          Enhancement 4 (provider availability): ScheduleX's dayBoundaries config
          already restricts the visible grid to 6AM-10PM. Business hours (8AM-6PM)
          visual graying would require backgroundEvents or custom CSS. The provider
          filter dropdown is in CalendarToolbar via ProviderSearchDropdown. */}
      {calendar ? (
        <AppointmentCalendar calendar={calendar} />
      ) : (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card">
          <CalendarDays className="h-10 w-10 text-muted-foreground/70" />
          <p className="text-muted-foreground">Calendar is loading...</p>
        </div>
      )}

      {/* Detail panel */}
      {selectedAppointmentId && (
        <AppointmentDetailPanel
          appointmentId={selectedAppointmentId}
          onClose={handleDetailClose}
          isStaff={isStaff}
          isPatient={isPatient}
        />
      )}

      {/* Create/Edit form modal */}
      {isFormOpen && (
        <AppointmentForm
          onClose={handleFormClose}
          defaultDate={formDefaultDate}
        />
      )}

      {/* Enhancement 2: DnD Reschedule Confirmation Dialog */}
      <AlertDialog
        open={rescheduleDialog.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleRescheduleCancel();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reschedule Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              {rescheduleDialog.newTime
                ? `Move "${rescheduleDialog.eventTitle}" to ${rescheduleDialog.newTime}?`
                : `Reschedule "${rescheduleDialog.eventTitle}" to the new time?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRescheduleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRescheduleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
