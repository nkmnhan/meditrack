import { ScheduleXCalendar } from "@schedule-x/react";
import "@schedule-x/theme-default/dist/index.css";
import type { CalendarApp } from "@schedule-x/calendar";

interface AppointmentCalendarProps {
  readonly calendar: CalendarApp | null;
}

export function AppointmentCalendar({ calendar }: AppointmentCalendarProps) {
  if (!calendar) return null;

  return (
    <div className="sx-calendar-wrapper">
      <ScheduleXCalendar calendarApp={calendar} />
    </div>
  );
}
