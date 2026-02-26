import { useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Clock, User, Stethoscope, MapPin, Activity } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { STATUS_STYLES, DEFAULT_STATUS_STYLE, STATUS_CONFIG } from "../constants";
import type { AppointmentStatus } from "../types";

interface CalendarEventProps {
  readonly calendarEvent: {
    readonly id: string;
    readonly title: string;
    readonly start: string | { epochMilliseconds?: number };
    readonly end: string | { epochMilliseconds?: number };
    readonly description?: string;
    readonly appointmentStatus?: AppointmentStatus;
  };
}

interface TooltipPosition {
  readonly top: number;
  readonly left: number;
  readonly anchorRight: number; // right edge of the anchor event, for left-flip fallback
}

function formatEventTime(timeValue: string | { epochMilliseconds?: number }): string {
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

const TOOLTIP_WIDTH = 240;
const TOOLTIP_GAP = 8;
const VIEWPORT_MARGIN = 8;

/**
 * Custom event component for ScheduleX calendar.
 * Tooltip is rendered via a React portal into document.body so it is never
 * clipped by overflow:hidden on any ScheduleX ancestor container.
 * Position is adjusted after mount so the tooltip never overflows any edge.
 */
export function CalendarEvent({ calendarEvent }: CalendarEventProps) {
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const status = calendarEvent.appointmentStatus;
  const statusStyle = status ? STATUS_STYLES[status] : DEFAULT_STATUS_STYLE;
  const statusLabel = status ? STATUS_CONFIG[status]?.label : undefined;

  const startTime = formatEventTime(calendarEvent.start);
  const endTime = formatEventTime(calendarEvent.end);
  const details = parseDescription(calendarEvent.description);

  // After the tooltip renders, measure its actual height and clamp so it
  // never overflows the bottom or top of the viewport.
  useLayoutEffect(() => {
    if (!tooltipRef.current || !tooltipPosition) return;
    const tooltipHeight = tooltipRef.current.offsetHeight;
    const maxTop = window.innerHeight - tooltipHeight - VIEWPORT_MARGIN;
    const clampedTop = Math.max(VIEWPORT_MARGIN, Math.min(tooltipPosition.top, maxTop));
    if (clampedTop !== tooltipPosition.top) {
      setTooltipPosition(prev => prev ? { ...prev, top: clampedTop } : null);
    }
  }, [tooltipPosition?.anchorRight]); // re-run only when a new anchor is set, not on every top adjustment

  function handleMouseEnter() {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();

    // Prefer right of event; flip left if it would overflow the right viewport edge
    const fitsOnRight = rect.right + TOOLTIP_GAP + TOOLTIP_WIDTH <= window.innerWidth - VIEWPORT_MARGIN;
    const left = fitsOnRight
      ? rect.right + TOOLTIP_GAP
      : rect.left - TOOLTIP_GAP - TOOLTIP_WIDTH;

    setTooltipPosition({ top: rect.top, left, anchorRight: rect.right });
  }

  function handleMouseLeave() {
    setTooltipPosition(null);
  }

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Event card */}
      <div
        className={clsxMerge(
          "h-full w-full overflow-hidden rounded-sm px-1.5 py-0.5",
          "border-l-[3px] text-xs leading-tight cursor-pointer",
          statusStyle
        )}
      >
        <div className="line-clamp-2 font-medium">
          {calendarEvent.title}
        </div>
      </div>

      {/* Tooltip — rendered in document.body to escape all overflow:hidden ancestors */}
      {tooltipPosition && createPortal(
        <div
          ref={tooltipRef}
          style={{
            position: "fixed",
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            zIndex: 9999,
            width: TOOLTIP_WIDTH,
          }}
          className="rounded-lg border border-neutral-200 bg-white p-3 shadow-xl pointer-events-none"
        >
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
                      status === "Completed" && "bg-green-500",
                      status === "Scheduled" && "bg-blue-500",
                      status === "Confirmed" && "bg-blue-600",
                      status === "CheckedIn" && "bg-teal-500",
                      status === "InProgress" && "bg-amber-500",
                      status === "Cancelled" && "bg-slate-400",
                      status === "NoShow" && "bg-red-500",
                      status === "Rescheduled" && "bg-purple-500"
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
        </div>,
        document.body
      )}
    </div>
  );
}
