import { ScheduleXCalendar } from "@schedule-x/react";
import "@schedule-x/theme-default/dist/index.css";
import "./calendar.css";
import type { CalendarApp } from "@schedule-x/calendar";
import { CalendarEvent } from "./CalendarEvent";

interface AppointmentCalendarProps {
  readonly calendar: CalendarApp | null;
}

export function AppointmentCalendar({ calendar }: AppointmentCalendarProps) {
  if (!calendar) return null;

  return (
    <div className="relative">
      <ScheduleXCalendar
        calendarApp={calendar}
        customComponents={{
          timeGridEvent: CalendarEvent,
          dateGridEvent: CalendarEvent,
        }}
      />
    </div>
  );
}
