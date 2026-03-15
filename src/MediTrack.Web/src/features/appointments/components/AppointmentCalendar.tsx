import { Calendar } from "@/shared/components/Calendar";
import type { CalendarApp } from "@schedule-x/calendar";
import { AppointmentEvent } from "./AppointmentEvent";

interface AppointmentCalendarProps {
  readonly calendar: CalendarApp | null;
}

// Memoize customComponents object — ScheduleX only needs to be initialized once,
// and creating a new object on every render would cause it to re-process the entire event grid.
const APPOINTMENT_CUSTOM_COMPONENTS = {
  timeGridEvent: AppointmentEvent,
  dateGridEvent: AppointmentEvent,
  monthGridEvent: AppointmentEvent,
} as const;

export function AppointmentCalendar({ calendar }: AppointmentCalendarProps) {
  if (!calendar) return null;

  return (
    <Calendar
      calendar={calendar}
      customComponents={APPOINTMENT_CUSTOM_COMPONENTS}
    />
  );
}
