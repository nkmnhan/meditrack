export { Calendar } from "./Calendar";
export { CalendarEventTooltip } from "./CalendarEventTooltip";
export { useCalendar } from "./useCalendar";
export { utcIsoToCalendarZdt, formatEventTime } from "./calendarTimeUtils";

// Re-export ScheduleX types and view creators for consumer convenience
export type { CalendarEvent, CalendarApp } from "@schedule-x/calendar";
export {
  createViewDay,
  createViewWeek,
  createViewMonthGrid,
} from "@schedule-x/calendar";
