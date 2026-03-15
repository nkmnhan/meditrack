import "temporal-polyfill/global";

/** ScheduleX time value — can be an ISO string or an object with epochMilliseconds. */
type ScheduleXTimeValue = string | { epochMilliseconds?: number };

/** Convert a UTC ISO string to a ZonedDateTime that ScheduleX renders at the correct local time.
 *  ScheduleX positions events by their UTC instant, so we re-wrap the local wall-clock time
 *  in the UTC timezone. This ensures a 9:00 AM Saigon appointment shows at 9:00, not 2:00 AM. */
export function utcIsoToCalendarZdt(utcIso: string): Temporal.ZonedDateTime {
  // Ensure UTC indicator — backend may omit the Z suffix
  const hasTimezoneIndicator = /(Z|[+-]\d{2}:\d{2})$/.test(utcIso);
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

/** Format a ScheduleX time value (ISO string or epochMilliseconds object) to a localized time string. */
export function formatEventTime(timeValue: ScheduleXTimeValue): string {
  try {
    if (typeof timeValue === "object" && timeValue.epochMilliseconds) {
      const date = new Date(timeValue.epochMilliseconds);
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    if (typeof timeValue === "string") {
      const date = new Date(timeValue.replace(" ", "T"));
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      }
    }
    return "";
  } catch {
    return "";
  }
}
