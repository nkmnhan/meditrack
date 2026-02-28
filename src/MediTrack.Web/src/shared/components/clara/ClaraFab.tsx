import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useClaraPanel } from "./ClaraPanelContext";

export function ClaraFab() {
  const { isOpen, openPanel } = useClaraPanel();
  const location = useLocation();

  // Hide on Clara session pages (avoids overlap with ClaraStart bottom bar)
  const isOnClaraPage = location.pathname.startsWith("/clara");

  if (isOpen || isOnClaraPage) return null;

  return (
    <button
      onClick={() => openPanel()}
      className={clsxMerge(
        "fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6",
        "flex h-12 w-12 items-center justify-center md:h-14 md:w-14",
        "rounded-full shadow-lg",
        "bg-gradient-to-br from-accent-500 to-accent-700",
        "text-white transition-all duration-200",
        "hover:shadow-xl hover:scale-105",
        "focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2",
        "group"
      )}
      aria-label="Ask Clara"
      title="Ask Clara"
    >
      <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
      {/* Pulse indicator */}
      <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-300 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-accent-400" />
      </span>
    </button>
  );
}
