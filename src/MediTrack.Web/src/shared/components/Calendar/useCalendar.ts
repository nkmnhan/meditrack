import { useState } from "react";
import { useCalendarApp } from "@schedule-x/react";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import type { CalendarEvent, CalendarConfig } from "@schedule-x/calendar";

/** ScheduleX plugin instance (the events service or any third-party plugin). */
type ScheduleXPlugin = ReturnType<typeof createEventsServicePlugin>;

interface UseCalendarOptions {
  /** ScheduleX calendar config (views, locale, dayBoundaries, callbacks, etc.).
   *  Do NOT include plugins here — pass them via the `plugins` option instead. */
  readonly config: CalendarConfig;
  /** Additional ScheduleX plugins (drag-and-drop, resize, etc.). The events
   *  service plugin is always included automatically. */
  readonly plugins?: ScheduleXPlugin[];
}

interface UseCalendarReturn {
  /** The initialized ScheduleX CalendarApp instance (null until ready). */
  readonly calendar: ReturnType<typeof useCalendarApp>;
  /** Replace all calendar events. Delegates to the internal events service plugin. */
  readonly setEvents: (events: CalendarEvent[]) => void;
}

/**
 * Generic hook wrapping ScheduleX `useCalendarApp` + `createEventsServicePlugin`.
 * Consumers provide config and optional extra plugins. The hook owns the events
 * service plugin lifecycle and exposes a `setEvents` function.
 */
export function useCalendar({ config, plugins = [] }: UseCalendarOptions): UseCalendarReturn {
  const [eventsPlugin] = useState(() => createEventsServicePlugin());

  const calendar = useCalendarApp(config, [eventsPlugin, ...plugins]);

  function setEvents(events: CalendarEvent[]) {
    eventsPlugin.set(events);
  }

  return { calendar, setEvents };
}
