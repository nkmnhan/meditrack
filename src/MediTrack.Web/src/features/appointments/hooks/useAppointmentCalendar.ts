import { useState, useEffect } from "react";
import { Temporal } from "temporal-polyfill";
import { useCalendarApp } from "@schedule-x/react";
import {
  createViewDay,
  createViewWeek,
  createViewMonthGrid,
  toJSDate,
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

  const startZdt = Temporal.ZonedDateTime.from({
    year: startDate.getFullYear(),
    month: startDate.getMonth() + 1,
    day: startDate.getDate(),
    hour: startDate.getHours(),
    minute: startDate.getMinutes(),
    timeZone: Temporal.Now.timeZoneId(),
  });

  const endZdt = Temporal.ZonedDateTime.from({
    year: endDate.getFullYear(),
    month: endDate.getMonth() + 1,
    day: endDate.getDate(),
    hour: endDate.getHours(),
    minute: endDate.getMinutes(),
    timeZone: Temporal.Now.timeZoneId(),
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
    const startOfMonth = today.with({ day: 1 }).subtract({ days: 7 });
    const endOfMonth = today.with({ day: 1 }).add({ months: 1, days: 7 });
    return {
      fromDate: startOfMonth.toString(),
      toDate: endOfMonth.toString(),
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
            onDateTimeClick(toJSDate(dateTime.toString()));
          }
        },
        onRangeUpdate: (range) => {
          const rangeStart = range.start;
          const rangeEnd = range.end;

          // Convert Temporal dates to ISO strings for the API
          let fromDateStr: string;
          let toDateStr: string;

          if (rangeStart instanceof Temporal.ZonedDateTime) {
            fromDateStr = rangeStart.toPlainDate().toString();
          } else {
            fromDateStr = rangeStart.toString();
          }

          if (rangeEnd instanceof Temporal.ZonedDateTime) {
            toDateStr = rangeEnd.toPlainDate().toString();
          } else {
            toDateStr = rangeEnd.toString();
          }

          setDateRange({
            fromDate: fromDateStr,
            toDate: toDateStr,
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
