import { useState } from "react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { STATUS_CONFIG, TYPE_LABELS } from "../constants";
import type { AppointmentStatus, AppointmentType } from "../types";

interface CalendarEventTooltipProps {
  readonly calendarEvent: {
    readonly id: string;
    readonly title: string;
    readonly start: string;
    readonly end: string;
    readonly patientName?: string;
    readonly providerName?: string;
    readonly appointmentType?: AppointmentType;
    readonly appointmentStatus?: AppointmentStatus;
    readonly location?: string;
    readonly _customContent?: {
      readonly timeGrid?: string;
    };
  };
}

export function CalendarEventTooltip({ calendarEvent }: CalendarEventTooltipProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const status = calendarEvent.appointmentStatus as AppointmentStatus | undefined;
  const type = calendarEvent.appointmentType as AppointmentType | undefined;
  const statusLabel = status ? STATUS_CONFIG[status]?.label : undefined;
  const typeLabel = type ? TYPE_LABELS[type] : undefined;

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const startTime = formatTime(calendarEvent.start);
  const endTime = formatTime(calendarEvent.end);

  return (
    <div
      className="relative h-full w-full overflow-hidden px-1 py-0.5 text-xs leading-tight"
      onMouseEnter={() => setIsTooltipVisible(true)}
      onMouseLeave={() => setIsTooltipVisible(false)}
    >
      {/* Default event content */}
      <div className="truncate font-medium">
        {calendarEvent.patientName ?? calendarEvent.title}
      </div>
      <div className="truncate opacity-80">
        {startTime}
        {typeLabel ? ` - ${typeLabel}` : ""}
      </div>

      {/* Tooltip */}
      {isTooltipVisible && (
        <div
          className={clsxMerge(
            "absolute left-full top-0 z-50 ml-2",
            "w-56 rounded-lg border border-neutral-200 bg-white p-3 shadow-xl",
            "pointer-events-none"
          )}
        >
          <div className="space-y-1.5">
            <p className="font-semibold text-sm text-neutral-900 truncate">
              {calendarEvent.patientName ?? calendarEvent.title}
            </p>

            <div className="text-xs text-neutral-600 space-y-1">
              <p>
                <span className="font-medium text-neutral-700">Time:</span>{" "}
                {startTime} - {endTime}
              </p>

              {calendarEvent.providerName && (
                <p>
                  <span className="font-medium text-neutral-700">Provider:</span>{" "}
                  {calendarEvent.providerName}
                </p>
              )}

              {typeLabel && (
                <p>
                  <span className="font-medium text-neutral-700">Type:</span>{" "}
                  {typeLabel}
                </p>
              )}

              {statusLabel && (
                <p>
                  <span className="font-medium text-neutral-700">Status:</span>{" "}
                  {statusLabel}
                </p>
              )}

              {calendarEvent.location && (
                <p>
                  <span className="font-medium text-neutral-700">Location:</span>{" "}
                  {calendarEvent.location}
                </p>
              )}
            </div>

            <p className="text-[10px] text-neutral-400 pt-1">
              Click for full details
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
