import { useNavigate } from "react-router-dom";
import { Sparkles, X, Mic, ArrowRight } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useClaraPanel } from "./ClaraPanelContext";

export function ClaraPanel() {
  const { isOpen, closePanel } = useClaraPanel();
  const navigate = useNavigate();

  const handleStartSession = () => {
    closePanel();
    navigate("/clara");
  };

  const handleOverlayClick = () => {
    closePanel();
  };

  const handlePanelClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={clsxMerge(
          "fixed inset-0 z-50 bg-black/40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={handleOverlayClick}
        aria-hidden={!isOpen}
      />

      {/* Slide-in panel */}
      <div
        role="dialog"
        aria-label="Clara AI Assistant"
        aria-modal="true"
        className={clsxMerge(
          "fixed inset-y-0 right-0 z-50",
          "w-[85vw] sm:max-w-[440px]",
          "flex flex-col bg-white shadow-lg",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        onClick={handlePanelClick}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-neutral-900">Clara</h2>
            <p className="text-xs text-neutral-500">AI Medical Secretary</p>
          </div>
          <button
            onClick={closePanel}
            className={clsxMerge(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700",
              "transition-colors"
            )}
            aria-label="Close Clara panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {/* Start Clinical Session CTA */}
          <button
            onClick={handleStartSession}
            className={clsxMerge(
              "flex w-full items-center gap-3 rounded-lg p-3",
              "bg-gradient-to-r from-accent-500 to-accent-700",
              "text-white transition-opacity hover:opacity-90"
            )}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
              <Mic className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Start Clinical Session</p>
              <p className="text-xs text-white/80">
                Real-time transcription and AI suggestions
              </p>
            </div>
            <ArrowRight className="h-4 w-4 flex-shrink-0" />
          </button>

          {/* Informational message */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm font-medium text-neutral-900 mb-1">
              Clara is ready during your sessions
            </p>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Start a clinical session to get real-time evidence-based suggestions, automatic speaker detection, and live transcription. Clara works alongside you as you consult.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

