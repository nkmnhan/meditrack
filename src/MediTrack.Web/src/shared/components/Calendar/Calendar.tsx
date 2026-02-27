import { type ComponentType, type ReactNode } from "react";
import { ScheduleXCalendar } from "@schedule-x/react";
import "@schedule-x/theme-default/dist/index.css";
import "./calendar.css";
import type { CalendarApp } from "@schedule-x/calendar";

/** ScheduleX custom component map — matches the ScheduleXCalendar props type. */
type CustomComponents = {
  [key: string]: ComponentType<any> | undefined;
};

interface CalendarProps {
  /** Initialized ScheduleX CalendarApp instance. */
  readonly calendar: CalendarApp;
  /** Custom ScheduleX event components (timeGridEvent, dateGridEvent, monthGridEvent, etc.). */
  readonly customComponents?: CustomComponents;
  /** Fallback UI shown when calendar is not ready (null calendar handled by consumer). */
  readonly fallback?: ReactNode;
}

/**
 * Generic ScheduleX calendar wrapper. Handles CSS imports and renders the
 * ScheduleX component with the provided custom components.
 */
export function Calendar({ calendar, customComponents, fallback }: CalendarProps) {
  if (!calendar) {
    return fallback ?? null;
  }

  return (
    <div className="relative">
      <ScheduleXCalendar
        calendarApp={calendar}
        customComponents={customComponents}
      />
    </div>
  );
}
