import { ScheduleXCalendar } from "@schedule-x/react";
import "@schedule-x/theme-default/dist/index.css";
import "./calendar.css";
import type { CalendarApp } from "@schedule-x/calendar";
import { CalendarEvent } from "./CalendarEvent";

interface AppointmentCalendarProps {
  readonly calendar: CalendarApp | null;
}

// Memoize customComponents object — ScheduleX only needs to be initialized once,
// and creating a new object on every render would cause it to re-process the entire event grid.
const CUSTOM_COMPONENTS = {
  timeGridEvent: CalendarEvent,
  dateGridEvent: CalendarEvent,
  monthGridEvent: CalendarEvent,
} as const;

export function AppointmentCalendar({ calendar }: AppointmentCalendarProps) {
  if (!calendar) return null;

  return (
    <div className="relative">
      <ScheduleXCalendar
        calendarApp={calendar}
        customComponents={CUSTOM_COMPONENTS}
      />
    </div>
  );
}
