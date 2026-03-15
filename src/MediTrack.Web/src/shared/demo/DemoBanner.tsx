import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Sparkles } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

const DEMO_BANNER_DISMISSED_KEY = "meditrack-demo-banner-dismissed";

export function DemoBanner() {
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem(DEMO_BANNER_DISMISSED_KEY) === "true";
  });

  useEffect(() => {
    if (isDismissed) {
      sessionStorage.setItem(DEMO_BANNER_DISMISSED_KEY, "true");
    }
  }, [isDismissed]);

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div
      className={clsxMerge(
        "flex items-center justify-between gap-3",
        "w-full px-4 py-2.5",
        "border-b border-accent-200",
        "bg-accent-50 text-accent-700",
        "text-sm"
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 flex-shrink-0" />
        <span>You're exploring a demo</span>
        <span className="hidden sm:inline">—</span>
        <Link
          to="/"
          className={clsxMerge(
            "inline-flex items-center gap-1",
            "font-semibold underline underline-offset-2",
            "hover:text-accent-800",
            "transition-colors"
          )}
        >
          <span className="hidden sm:inline">Sign up for full access</span>
          <span className="sm:hidden">Sign up</span>
        </Link>
      </div>
      <button
        onClick={handleDismiss}
        className={clsxMerge(
          "flex-shrink-0 rounded-md p-1",
          "text-accent-600 hover:text-accent-800 hover:bg-accent-100",
          "transition-colors"
        )}
        aria-label="Dismiss demo banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
