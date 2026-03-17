import { useState, useRef } from "react";
import { GripVertical, Settings2, RotateCcw, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/shared/components/ui/switch";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import type { DashboardWidget } from "../hooks/useDashboardLayout";

interface DashboardCustomizerProps {
  readonly widgets: DashboardWidget[];
  readonly onMoveWidget: (fromIndex: number, toIndex: number) => void;
  readonly onToggleVisibility: (widgetId: string) => void;
  readonly onReset: () => void;
}

export function DashboardCustomizer({
  widgets,
  onMoveWidget,
  onToggleVisibility,
  onReset,
}: DashboardCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function handleDragStart(event: React.DragEvent<HTMLDivElement>, index: number) {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = "move";
    // Required for Firefox
    event.dataTransfer.setData("text/plain", String(index));
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>, toIndex: number) {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onMoveWidget(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  const visibleCount = widgets.filter((widget) => widget.isVisible).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((previous) => !previous)}
        className={clsxMerge(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          "border border-border bg-card",
          "text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground/80",
          isOpen && "bg-muted text-primary-700 border-primary-200"
        )}
        aria-label="Customize dashboard layout"
        aria-expanded={isOpen}
      >
        <Settings2 className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div
            ref={panelRef}
            className={clsxMerge(
              "absolute right-0 top-full z-50 mt-2",
              "w-72 rounded-lg border border-border bg-card shadow-lg",
              "overflow-hidden"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Customize Dashboard</h3>
                <p className="text-xs text-muted-foreground">
                  {visibleCount} of {widgets.length} widgets visible
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground/80"
              >
                Done
              </button>
            </div>

            {/* Widget list */}
            <div className="max-h-72 overflow-y-auto p-2">
              {widgets.map((widget, index) => (
                <div
                  key={widget.id}
                  draggable
                  onDragStart={(event) => handleDragStart(event, index)}
                  onDragOver={(event) => handleDragOver(event, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(event) => handleDrop(event, index)}
                  onDragEnd={handleDragEnd}
                  className={clsxMerge(
                    "flex items-center gap-2 rounded-md px-2 py-2",
                    "transition-colors",
                    draggedIndex === index && "opacity-40",
                    dragOverIndex === index && draggedIndex !== index && "bg-primary-50",
                    draggedIndex === null && "hover:bg-muted"
                  )}
                >
                  <div
                    className="flex h-8 w-8 flex-shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/70 hover:text-muted-foreground active:cursor-grabbing"
                    aria-label={`Drag to reorder ${widget.label}`}
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {widget.isVisible ? (
                      <Eye className="h-3.5 w-3.5 flex-shrink-0 text-primary-700" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
                    )}
                    <span
                      className={clsxMerge(
                        "truncate text-sm",
                        widget.isVisible
                          ? "font-medium text-foreground"
                          : "text-muted-foreground/70"
                      )}
                    >
                      {widget.label}
                    </span>
                  </div>

                  <Switch
                    checked={widget.isVisible}
                    onCheckedChange={() => onToggleVisibility(widget.id)}
                    aria-label={`Toggle ${widget.label} visibility`}
                    className="flex-shrink-0"
                  />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-3">
              <button
                onClick={onReset}
                className={clsxMerge(
                  "flex h-8 w-full items-center justify-center gap-2 rounded-md",
                  "border border-border bg-card",
                  "text-xs font-medium text-muted-foreground",
                  "transition-colors hover:bg-muted hover:text-foreground"
                )}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to Default
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
