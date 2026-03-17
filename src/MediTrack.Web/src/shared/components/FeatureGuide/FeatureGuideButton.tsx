import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/shared/components/ui/drawer";
import { useFeatureGuide } from "./useFeatureGuide";
import { FeatureGuidePanel } from "./FeatureGuidePanel";
import { FEATURE_GUIDE_STEPS } from "./FeatureGuideData";

/**
 * Single bookmark ribbon that animates between two positions:
 *
 * Closed — bottom-left edge with `>` arrow + pulsing dot
 * Open   — slides right to dock on the panel's right edge, arrow flips to `<`
 *
 * One element, CSS transition handles the movement.
 */
export function FeatureGuideButton() {
  const isMobile = useIsMobile();
  const guide = useFeatureGuide(FEATURE_GUIDE_STEPS.length);
  const [showLabel, setShowLabel] = useState(false);

  useEffect(() => {
    if (guide.isFirstVisit) {
      setShowLabel(true);
      const labelTimer = setTimeout(() => setShowLabel(false), 5000);
      return () => clearTimeout(labelTimer);
    }
  }, [guide.isFirstVisit]);

  useEffect(() => {
    if (guide.isOpen) {
      setShowLabel(false);
    }
  }, [guide.isOpen]);

  const showPulse = !guide.isOpen && !guide.isFullyCompleted;

  if (guide.isHidden) return null;

  const panelContent = (
    <FeatureGuidePanel
      completedStepIds={guide.completedStepIds}
      completionCount={guide.completionCount}
      onStepClick={guide.markStepCompleted}
      onDismiss={guide.dismissGuide}
      onClose={guide.closeGuide}
    />
  );

  /* ── Mobile: ribbon + Drawer ──────────────────────── */

  if (isMobile) {
    return (
      <>
        {/* Ribbon — stays bottom-left on mobile, subtle color */}
        <button
          onClick={guide.toggleGuide}
          className={clsxMerge(
            "fixed bottom-24 left-0 z-40",
            "group/tab flex w-3 h-14 items-center justify-center rounded-r-md",
            "bg-primary-700/20 text-white",
            "transition-all duration-300",
            "hover:bg-primary-700/35 hover:shadow-md",
            "focus:outline-none focus:ring-2 focus:ring-primary-500",
          )}
          aria-label={guide.isOpen ? "Close feature guide" : "Open feature guide"}
          aria-expanded={guide.isOpen}
        >
          {showLabel && <LabelPill />}
          {guide.isOpen ? (
            <ChevronLeft className="h-3.5 w-3.5 opacity-80" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 opacity-80" />
          )}
          {showPulse && (
            <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-500" />
            </span>
          )}
        </button>

        <Drawer
          open={guide.isOpen}
          onOpenChange={(open) => (open ? guide.openGuide() : guide.closeGuide())}
        >
          <DrawerContent className="max-h-[75vh]">
            <DrawerTitle className="sr-only">Feature Guide</DrawerTitle>
            {panelContent}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  /* ── Desktop: single ribbon that animates position ── */

  // Closed: left-[16rem] (past sidebar), bottom-20
  // Open:   left-[36rem] (right edge of panel: sidebar 16rem + panel 20rem), bottom-28
  return (
    <>
      {/* Single ribbon — thin, tall, arrow only. Transitions left to slide with panel */}
      <button
        onClick={guide.toggleGuide}
        className={clsxMerge(
          "fixed z-50 group/tab flex w-4 h-16 items-center justify-center rounded-r-md",
          "transition-all duration-300 ease-in-out",
          "focus:outline-none focus:ring-2 focus:ring-primary-500",
          guide.isOpen
            ? "bottom-20 left-[36rem] bg-primary-700/80 text-white shadow-md hover:bg-primary-700 hover:shadow-lg"
            : "bottom-20 left-[16rem] bg-primary-700/20 text-white hover:bg-primary-700/35 hover:shadow-md",
        )}
        aria-label={guide.isOpen ? "Close feature guide" : "Open feature guide"}
        aria-expanded={guide.isOpen}
      >
        {showLabel && !guide.isOpen && <LabelPill />}

        {guide.isOpen ? (
          <ChevronLeft className="h-3.5 w-3.5 opacity-80" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 opacity-80" />
        )}

        {showPulse && !guide.isOpen && (
          <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-500" />
          </span>
        )}

        {!showPulse && guide.completionCount > 0 && !guide.isFullyCompleted && !guide.isOpen && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500 text-[9px] font-bold text-white">
            {guide.completionCount}
          </span>
        )}
      </button>

      {/* Panel — positioned to the left of where the ribbon docks */}
      {guide.isOpen && (
        <div className="fixed bottom-20 left-[16rem] z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-80 rounded-xl border border-border bg-card dark:bg-popover shadow-xl">
            {panelContent}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Label pill (first-visit tooltip) ─────────────── */

function LabelPill() {
  return (
    <div className="absolute -top-8 left-0 whitespace-nowrap rounded-full bg-primary-700 px-3 py-1 text-[10px] font-semibold text-white shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
      Quick Tour
      <div className="absolute -bottom-1 left-2 h-2 w-2 rotate-45 bg-primary-700" />
    </div>
  );
}
