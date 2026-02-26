import { useState, useEffect } from "react";
import "temporal-polyfill/global";
import { useCalendarApp } from "@schedule-x/react";
import {
  createViewDay,
  createViewWeek,
  createViewMonthGrid,
} from "@schedule-x/calendar";
import type { CalendarEvent } from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { useGetAppointmentsQuery } from "../store/appointmentApi";
import { buildCalendarStatusMap } from "../constants";
import type { AppointmentListItem, AppointmentSearchParams } from "../types";

const CALENDAR_STATUS_MAP = buildCalendarStatusMap();

/** Convert a UTC ISO string to a ZonedDateTime that ScheduleX renders at the correct local time.
 *  ScheduleX positions events by their UTC instant, so we re-wrap the local wall-clock time
 *  in the UTC timezone. This ensures a 9:00 AM Saigon appointment shows at 9:00, not 2:00 AM. */
function utcIsoToCalendarZdt(utcIso: string): Temporal.ZonedDateTime {
  // Ensure UTC indicator — backend may omit the Z suffix
  const hasTimezoneIndicator = /Z|[+-]\d{2}:\d{2}$/.test(utcIso);
  const normalized = hasTimezoneIndicator ? utcIso : `${utcIso}Z`;
  const instant = Temporal.Instant.from(normalized);
  const localZdt = instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());

  // Re-create as UTC ZonedDateTime with local wall-clock values.
  // ScheduleX uses the epoch/instant to position events on the grid,
  // so the UTC instant must equal the desired display time.
  return Temporal.ZonedDateTime.from({
    timeZone: "UTC",
    year: localZdt.year,
    month: localZdt.month,
    day: localZdt.day,
    hour: localZdt.hour,
    minute: localZdt.minute,
    second: 0,
  });
}

function appointmentToCalendarEvent(appointment: AppointmentListItem): CalendarEvent {
  const startZdt = utcIsoToCalendarZdt(appointment.scheduledDateTime);
  const endZdt = startZdt.add({ minutes: appointment.durationMinutes });

  return {
    id: appointment.id,
    start: startZdt,
    end: endZdt,
    title: `${appointment.patientName} — ${appointment.reason}`,
    location: appointment.location ?? undefined,
    calendarId: appointment.status.toLowerCase(),
    people: [appointment.providerName],
    // Custom data for detail panel
    appointmentId: appointment.id,
    patientName: appointment.patientName,
    providerName: appointment.providerName,
    appointmentType: appointment.type,
    appointmentStatus: appointment.status,
  };
}

interface UseAppointmentCalendarOptions {
  readonly providerId?: string;
  readonly onEventClick?: (appointmentId: string) => void;
  readonly onDateTimeClick?: (dateTime: Date) => void;
}

export function useAppointmentCalendar({
  providerId,
  onEventClick,
  onDateTimeClick,
}: UseAppointmentCalendarOptions = {}) {
  const [eventsPlugin] = useState(() => createEventsServicePlugin());

  const today = Temporal.Now.plainDateISO();

  const [dateRange, setDateRange] = useState<{ fromDate: string; toDate: string }>(() => {
    // Default: current month range with buffer
    // Send UTC ISO strings — backend stores/queries in UTC
    const startOfMonth = today.with({ day: 1 }).subtract({ days: 7 });
    const endOfMonth = today.with({ day: 1 }).add({ months: 1, days: 7 });
    return {
      fromDate: `${startOfMonth.toString()}T00:00:00Z`,
      toDate: `${endOfMonth.toString()}T23:59:59Z`,
    };
  });

  const searchParams: AppointmentSearchParams = {
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate,
    ...(providerId && { providerId }),
  };

  const {
    data: appointments,
    isLoading,
    isFetching,
    error,
  } = useGetAppointmentsQuery(searchParams);

  const calendar = useCalendarApp(
    {
      views: [createViewWeek(), createViewDay(), createViewMonthGrid()],
      selectedDate: today,
      locale: 'en-US',
      dayBoundaries: {
        start: "00:00",
        end: "24:00",
      },
      weekOptions: {
        gridHeight: 1600,
        nDays: 5,
      },
      calendars: CALENDAR_STATUS_MAP,
      // Highlight standard business hours (7 AM - 7 PM)
      // Non-business hours will be visually dimmed
      isDark: false,
      minDate: undefined,
      maxDate: undefined,
      // Business hours configuration - times outside this will be shaded
      // This supports patients in different timezones while visually indicating normal office hours
      callbacks: {
        onEventClick: (event: CalendarEvent) => {
          if (onEventClick && event.appointmentId) {
            onEventClick(event.appointmentId as string);
          }
        },
        onClickDateTime: (dateTime: Temporal.ZonedDateTime) => {
          if (onDateTimeClick) {
            onDateTimeClick(new Date(dateTime.epochMilliseconds));
          }
        },
        onRangeUpdate: (range) => {
          const fromPlainDate = range.start.toPlainDate();
          const toPlainDate = range.end.toPlainDate();

          setDateRange({
            fromDate: `${fromPlainDate.toString()}T00:00:00Z`,
            toDate: `${toPlainDate.toString()}T23:59:59Z`,
          });
        },
      },
    },
    [eventsPlugin],
  );

  // Sync appointments data to ScheduleX events
  useEffect(() => {
    if (!appointments) return;

    const calendarEvents = appointments.map(appointmentToCalendarEvent);
    eventsPlugin.set(calendarEvents);
  }, [appointments, eventsPlugin]);

  return {
    calendar,
    isLoading,
    isFetching,
    error,
    appointments: appointments ?? [],
  };
}
