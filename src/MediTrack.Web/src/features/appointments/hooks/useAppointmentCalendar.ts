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

function appointmentToCalendarEvent(appointment: AppointmentListItem): CalendarEvent {
  const startDate = new Date(appointment.scheduledDateTime);
  const endDate = new Date(startDate.getTime() + appointment.durationMinutes * 60_000);

  const timeZone = Temporal.Now.timeZoneId();

  const startZdt = Temporal.ZonedDateTime.from({
    year: startDate.getFullYear(),
    month: startDate.getMonth() + 1,
    day: startDate.getDate(),
    hour: startDate.getHours(),
    minute: startDate.getMinutes(),
    timeZone,
  });

  const endZdt = Temporal.ZonedDateTime.from({
    year: endDate.getFullYear(),
    month: endDate.getMonth() + 1,
    day: endDate.getDate(),
    hour: endDate.getHours(),
    minute: endDate.getMinutes(),
    timeZone,
  });

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
      dayBoundaries: {
        start: "07:00",
        end: "20:00",
      },
      weekOptions: {
        gridHeight: 800,
        nDays: 5,
      },
      calendars: CALENDAR_STATUS_MAP,
      callbacks: {
        onEventClick: (event: CalendarEvent) => {
          if (onEventClick && event.appointmentId) {
            onEventClick(event.appointmentId as string);
          }
        },
        onClickDateTime: (dateTime: Temporal.ZonedDateTime) => {
          if (onDateTimeClick) {
            // Convert Temporal.ZonedDateTime to JS Date via epoch milliseconds
            onDateTimeClick(new Date(dateTime.epochMilliseconds));
          }
        },
        onRangeUpdate: (range) => {
          // Convert Temporal dates to UTC ISO strings for the backend
          const fromPlainDate = range.start instanceof Temporal.ZonedDateTime
            ? range.start.toPlainDate()
            : range.start;
          const toPlainDate = range.end instanceof Temporal.ZonedDateTime
            ? range.end.toPlainDate()
            : range.end;

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
