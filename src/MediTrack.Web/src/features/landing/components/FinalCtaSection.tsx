import { Sparkles, ArrowRight } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useScrollReveal } from "../hooks/useScrollReveal";

interface FinalCtaSectionProps {
  readonly onSignIn: () => void;
}

export function FinalCtaSection({ onSignIn }: FinalCtaSectionProps) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.3 });

  return (
    <section className="bg-gradient-to-b from-card to-background py-10 md:py-16">
      <div
        ref={ref}
        className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(1.5rem)",
          transition: "opacity 500ms ease-out, transform 500ms ease-out",
        }}
      >
        <div className="rounded-2xl border border-accent-200 bg-gradient-to-br from-accent-50 dark:from-accent-900/20 to-card p-8 shadow-sm md:p-12">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-primary-700">
            <Sparkles className="h-7 w-7 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Ready to let Clara handle the paperwork?
          </h2>

          <p className="mt-4 text-lg text-muted-foreground">
            Sign in to explore the full platform — dashboard, patient records,
            appointment scheduling, and Clara AI sessions with real clinical workflows.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={onSignIn}
              className={clsxMerge(
                "flex h-12 items-center justify-center gap-2 rounded-xl px-8",
                "bg-gradient-to-r from-accent-500 to-accent-700 text-base font-semibold text-white",
                "shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
              )}
            >
              Sign In to Explore
              <ArrowRight className="h-5 w-5" />
            </button>
            <a
              href="#clara-demo"
              className={clsxMerge(
                "flex h-12 items-center justify-center gap-2 rounded-xl border border-border px-8",
                "text-base font-semibold text-foreground/80 transition-colors hover:bg-muted"
              )}
            >
              <Sparkles className="h-5 w-5 text-accent-500" />
              Try Clara Demo First
            </a>
          </div>

          <p className="mt-6 text-xs text-muted-foreground/70">
            Portfolio project — free to explore. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
