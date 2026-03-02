import { Clock, User, Stethoscope, MapPin, Activity } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { CalendarEventTooltip } from "@/shared/components/Calendar/CalendarEventTooltip";
import { formatEventTime } from "@/shared/components/Calendar/calendarTimeUtils";
import { STATUS_STYLES, DEFAULT_STATUS_STYLE, STATUS_CONFIG } from "../constants";
import type { AppointmentStatus } from "../types";

interface AppointmentEventProps {
  readonly calendarEvent: {
    readonly id: string;
    readonly title: string;
    readonly start: string | { epochMilliseconds?: number };
    readonly end: string | { epochMilliseconds?: number };
    readonly description?: string;
    readonly appointmentStatus?: AppointmentStatus;
  };
}

function parseDescription(description: string | undefined): Record<string, string> {
  if (!description) return {};
  const result: Record<string, string> = {};
  for (const line of description.split("\n")) {
    const colonIndex = line.indexOf(": ");
    if (colonIndex > 0) {
      result[line.slice(0, colonIndex).trim()] = line.slice(colonIndex + 2).trim();
    }
  }
  return result;
}

export function AppointmentEvent({ calendarEvent }: AppointmentEventProps) {
  const status = calendarEvent.appointmentStatus;
  const statusStyle = status ? STATUS_STYLES[status] : DEFAULT_STATUS_STYLE;
  const statusLabel = status ? STATUS_CONFIG[status]?.label : undefined;

  const startTime = formatEventTime(calendarEvent.start);
  const endTime = formatEventTime(calendarEvent.end);
  const details = parseDescription(calendarEvent.description);

  const tooltipContent = (
    <div className="space-y-2">
      {/* Patient name */}
      <div className="flex items-start gap-2">
        <User className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
        <p className="text-sm font-semibold text-neutral-900">
          {calendarEvent.title}
        </p>
      </div>

      <div className="space-y-1.5 text-xs text-neutral-600">
        {/* Time */}
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          <span>{startTime} – {endTime}</span>
        </div>

        {/* Provider */}
        {details.Provider && (
          <div className="flex items-center gap-2">
            <Stethoscope className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span>{details.Provider}</span>
          </div>
        )}

        {/* Type */}
        {details.Type && (
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span>{details.Type}</span>
          </div>
        )}

        {/* Status */}
        {statusLabel && (
          <div className="flex items-center gap-2">
            <div
              className={clsxMerge(
                "h-2 w-2 shrink-0 rounded-full",
                status === "Completed" && "bg-success-500",
                status === "Scheduled" && "bg-primary-700",
                status === "Confirmed" && "bg-accent-700",
                status === "CheckedIn" && "bg-info-700",
                status === "InProgress" && "bg-warning-500",
                status === "Cancelled" && "bg-neutral-400",
                status === "NoShow" && "bg-error-500",
                status === "Rescheduled" && "bg-neutral-500"
              )}
            />
            <span>{statusLabel}</span>
          </div>
        )}

        {/* Location */}
        {details.Location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span>{details.Location}</span>
          </div>
        )}
      </div>

      <p className="pt-1 text-[10px] text-neutral-400">
        Click for full details
      </p>
    </div>
  );

  return (
    <CalendarEventTooltip
      eventClassName={statusStyle}
      tooltipContent={tooltipContent}
    >
      <div className="line-clamp-2 font-medium">
        {calendarEvent.title}
      </div>
    </CalendarEventTooltip>
  );
}
