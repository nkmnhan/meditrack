import { useState, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface TooltipPosition {
  readonly top: number;
  readonly left: number;
}

interface CalendarEventTooltipProps {
  /** Content rendered inside the event card (visible on the calendar grid). */
  readonly children: ReactNode;
  /** Content rendered inside the floating tooltip. */
  readonly tooltipContent: ReactNode;
  /** Additional class names applied to the event card container (e.g. status colors). */
  readonly eventClassName?: string;
}

const TOOLTIP_WIDTH = 240;
const CURSOR_OFFSET_X = 14;
const CURSOR_OFFSET_Y = 16;
const VIEWPORT_MARGIN = 8;

/**
 * Generic mouse-tracking tooltip for calendar events.
 * Renders the tooltip via a React portal to escape overflow:hidden ancestors.
 * Positions the tooltip near the cursor and clamps it to viewport edges.
 * Dismisses on mouseLeave or mouseDown (so click-through works for detail panels).
 */
export function CalendarEventTooltip({
  children,
  tooltipContent,
  eventClassName,
}: CalendarEventTooltipProps) {
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(event: React.MouseEvent) {
    // Use actual rendered height if available, fall back to estimate
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 220;

    // Prefer below-right of cursor; flip when near viewport edges
    const fitsOnRight = event.clientX + CURSOR_OFFSET_X + TOOLTIP_WIDTH <= window.innerWidth - VIEWPORT_MARGIN;
    const fitsBelow = event.clientY + CURSOR_OFFSET_Y + tooltipHeight <= window.innerHeight - VIEWPORT_MARGIN;

    const left = fitsOnRight
      ? event.clientX + CURSOR_OFFSET_X
      : event.clientX - CURSOR_OFFSET_X - TOOLTIP_WIDTH;

    const top = fitsBelow
      ? event.clientY + CURSOR_OFFSET_Y
      : event.clientY - CURSOR_OFFSET_Y - tooltipHeight;

    setTooltipPosition({
      top: Math.max(VIEWPORT_MARGIN, top),
      left: Math.max(VIEWPORT_MARGIN, left),
    });
  }

  function handleMouseLeave() {
    setTooltipPosition(null);
  }

  function handleMouseDown() {
    setTooltipPosition(null);
  }

  return (
    <div
      className="relative h-full w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
    >
      {/* Event card */}
      <div
        className={clsxMerge(
          "h-full w-full overflow-hidden rounded-sm px-1.5 py-0.5",
          "border-l-[3px] text-xs leading-tight cursor-pointer",
          eventClassName
        )}
      >
        {children}
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
          {tooltipContent}
        </div>,
        document.body
      )}
    </div>
  );
}
