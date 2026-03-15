import { useState, useEffect } from "react";

export interface DashboardWidget {
  readonly id: string;
  readonly label: string;
  readonly isVisible: boolean;
}

const STORAGE_KEY = "meditrack-dashboard-layout";

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: "stats", label: "Stats Overview", isVisible: true },
  { id: "schedule", label: "Today's Schedule", isVisible: true },
  { id: "quick-actions", label: "Quick Actions", isVisible: true },
  { id: "recent-patients", label: "Recent Patients", isVisible: true },
  { id: "clara-suggestions", label: "Clara's Suggestions", isVisible: true },
];

function loadWidgets(): DashboardWidget[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_WIDGETS;

    const parsed = JSON.parse(stored) as DashboardWidget[];

    // Validate structure: must be an array with expected widget IDs
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_WIDGETS;

    const defaultIds = new Set(DEFAULT_WIDGETS.map((widget) => widget.id));
    const parsedIds = new Set(parsed.map((widget) => widget.id));

    // If stored widget IDs don't match defaults (e.g., new widget added), reset
    const hasAllIds = DEFAULT_WIDGETS.every((widget) => parsedIds.has(widget.id));
    const hasNoExtra = parsed.every((widget) => defaultIds.has(widget.id));

    if (!hasAllIds || !hasNoExtra) return DEFAULT_WIDGETS;

    return parsed;
  } catch {
    return DEFAULT_WIDGETS;
  }
}

function persistWidgets(widgets: DashboardWidget[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch {
    // localStorage may be full or unavailable — silently ignore
  }
}

export function useDashboardLayout() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(loadWidgets);

  useEffect(() => {
    persistWidgets(widgets);
  }, [widgets]);

  function moveWidget(fromIndex: number, toIndex: number) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= widgets.length ||
      toIndex >= widgets.length
    ) {
      return;
    }

    const reordered = [...widgets];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setWidgets(reordered);
  }

  function toggleWidgetVisibility(widgetId: string) {
    setWidgets((previous) =>
      previous.map((widget) =>
        widget.id === widgetId
          ? { ...widget, isVisible: !widget.isVisible }
          : widget
      )
    );
  }

  function resetLayout() {
    setWidgets(DEFAULT_WIDGETS);
  }

  return { widgets, moveWidget, toggleWidgetVisibility, resetLayout };
}
