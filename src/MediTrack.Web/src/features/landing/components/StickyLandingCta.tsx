import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

const DISMISSED_KEY = "meditrack-sticky-cta-dismissed";

export function StickyLandingCta() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDismissed) return;

    const handleScroll = () => {
      // Show after scrolling past the hero (~500px)
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // sessionStorage unavailable — ignore
    }
  };

  if (isDismissed) return null;

  return (
    <>
      {/* Mobile — bottom bar */}
      <div
        className={clsxMerge(
          "fixed inset-x-0 bottom-0 z-40 md:hidden",
          "transform transition-transform duration-300",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center gap-3 border-t border-accent-200 bg-white/95 px-4 py-3 backdrop-blur-sm shadow-lg">
          <a
            href="#clara-demo"
            className={clsxMerge(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-3",
              "bg-gradient-to-r from-accent-500 to-accent-700 text-sm font-semibold text-white",
              "shadow-md active:scale-[0.98]"
            )}
          >
            <Sparkles className="h-4 w-4" />
            Try Clara — No Sign-up
          </a>
          <button
            onClick={handleDismiss}
            className="rounded-lg p-2 text-neutral-400 hover:text-neutral-600"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Desktop — floating pill */}
      <div
        className={clsxMerge(
          "fixed bottom-6 right-6 z-40 hidden md:block",
          "transform transition-all duration-300",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-2 rounded-full border border-accent-200 bg-white/95 py-2 pl-4 pr-2 shadow-lg backdrop-blur-sm">
          <a
            href="#clara-demo"
            className="flex items-center gap-2 text-sm font-semibold text-accent-700 hover:text-accent-800"
          >
            <Sparkles className="h-4 w-4" />
            Try Clara — No Sign-up
          </a>
          <button
            onClick={handleDismiss}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
