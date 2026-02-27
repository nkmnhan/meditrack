import { useState, useEffect } from "react";
import "temporal-polyfill/global";
import {
  createViewDay,
  createViewWeek,
  createViewMonthGrid,
} from "@schedule-x/calendar";
import type { CalendarEvent } from "@schedule-x/calendar";
import { utcIsoToCalendarZdt } from "@/shared/components/Calendar/calendarTimeUtils";
import { useCalendar } from "@/shared/components/Calendar/useCalendar";
import { useGetAppointmentsQuery } from "../store/appointmentApi";
import type { AppointmentListItem, AppointmentSearchParams } from "../types";

function appointmentToCalendarEvent(appointment: AppointmentListItem): CalendarEvent {
  const startZdt = utcIsoToCalendarZdt(appointment.scheduledDateTime);
  const endZdt = startZdt.add({ minutes: appointment.durationMinutes });

  // Build description for hover tooltip (ScheduleX shows this on hover)
  const descriptionParts = [
    `Provider: ${appointment.providerName}`,
    `Type: ${appointment.type}`,
    `Status: ${appointment.status}`,
    appointment.location ? `Location: ${appointment.location}` : null,
  ].filter(Boolean);

  return {
    id: appointment.id,
    start: startZdt,
    end: endZdt,
    title: `${appointment.patientName} — ${appointment.reason}`,
    // Description shows on hover tooltip (full details)
    description: descriptionParts.join('\n'),
    // Custom data for click handler and custom event component
    appointmentId: appointment.id,
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

  const { calendar, setEvents } = useCalendar({
    config: {
      views: [createViewWeek(), createViewDay(), createViewMonthGrid()],
      selectedDate: today,
      locale: 'en-US',
      // Focus on business hours (6 AM - 10 PM) for better event visibility
      // Appointments outside this range are rare edge cases
      dayBoundaries: {
        start: "06:00",
        end: "22:00",
      },
      weekOptions: {
        // 16-hour day span with 1600px = 100px/hour = 50px per 30-min event
        // Enough for 3 lines of text (title, time, provider)
        gridHeight: 1600,
        nDays: 5,
      },
      isDark: false,
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
  });

  // Sync appointments data to ScheduleX events
  useEffect(() => {
    if (!appointments) return;

    const calendarEvents = appointments.map(appointmentToCalendarEvent);
    setEvents(calendarEvents);
  }, [appointments, setEvents]);

  return {
    calendar,
    isLoading,
    isFetching,
    error,
    appointments: appointments ?? [],
  };
}
