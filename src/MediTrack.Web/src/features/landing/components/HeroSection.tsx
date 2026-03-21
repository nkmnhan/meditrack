import { useEffect, useState } from "react";
import {
  Sparkles, Stethoscope, CalendarDays, FileText, Mic,
  Activity, Users, LayoutDashboard,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-card pb-10 pt-10 md:pb-16 md:pt-16">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-primary-50 opacity-50 dark:opacity-[0.07] blur-3xl" />
        <div className="absolute -left-20 top-1/2 h-60 w-60 rounded-full bg-accent-50 opacity-40 dark:opacity-[0.07] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Left — Copy */}
          <div className="text-center lg:text-left">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-accent-500" />
              <span className="text-xs font-semibold text-accent-700">AI-Powered Clinical Platform</span>
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Clara{" "}
              <span className="bg-gradient-to-r from-accent-700 to-primary-700 bg-clip-text text-transparent">
                listens
              </span>{" "}
              to your consults and writes the notes
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              For doctors who spend more time on paperwork than patients.
              MediTrack&apos;s AI companion transcribes visits, suggests diagnoses, and
              generates SOAP notes — so you can{" "}
              <strong className="text-foreground">focus on care, not clicks</strong>.
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-success-50 px-3 py-1.5">
              <Activity className="h-4 w-4 text-success-600" />
              <span className="text-sm font-semibold text-success-700">Save 2+ hours daily on clinical documentation</span>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <a
                href="#clara-demo"
                className={clsxMerge(
                  "relative flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl px-8",
                  "bg-gradient-to-r from-accent-500 to-accent-700 text-base font-semibold text-white",
                  "shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
                )}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
                <Sparkles className="relative z-10 h-5 w-5" />
                <span className="relative z-10">Try Clara — No Sign-up</span>
              </a>
            </div>
          </div>

          {/* Right — Composed UI mockup */}
          <div className="relative hidden lg:block" aria-hidden="true">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Count-up hook for hero stats ── */

function useHeroCountUp(end: number, durationMs = 1500): string {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    let frameId: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(eased * end);
      setDisplay(current.toLocaleString());
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [end, durationMs]);

  return display;
}

function HeroStats() {
  const appointments = useHeroCountUp(12);
  const patients = useHeroCountUp(847);
  const recordsRaw = useHeroCountUp(2400);
  const recordsNum = parseInt(recordsRaw.replace(/,/g, ""), 10);
  const records = recordsNum >= 1000 ? `${(recordsNum / 1000).toFixed(1)}k` : recordsRaw;

  const stats = [
    { icon: CalendarDays, label: "Appointments", value: appointments, color: "text-primary-700", bg: "bg-primary-50" },
    { icon: Users, label: "Patients", value: patients, color: "text-secondary-700", bg: "bg-secondary-50" },
    { icon: FileText, label: "Records", value: records, color: "text-warning-600", bg: "bg-warning-50" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-border p-3">
          <div className={clsxMerge("mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg", stat.bg)}>
            <stat.icon className={clsxMerge("h-4 w-4", stat.color)} />
          </div>
          <p className="text-lg font-bold text-foreground">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Composed dashboard mockup (no screenshots, pure JSX) ── */

function DashboardMockup() {
  return (
    <div className="relative">
      {/* Main dashboard card */}
      <div className="animate-float rounded-xl border border-border bg-card p-6 shadow-md">
        {/* Header bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary-700" />
            <span className="text-sm font-semibold text-foreground">Dashboard</span>
          </div>
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-error-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-warning-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-success-400" />
          </div>
        </div>

        {/* Stat row with count-up animation */}
        <HeroStats />

        {/* Schedule preview */}
        <div className="mt-4 space-y-2">
          {[
            { time: "9:00 AM", name: "Sarah Johnson", type: "Follow-up" },
            { time: "10:30 AM", name: "Michael Chen", type: "Consultation" },
          ].map((appointment) => (
            <div key={appointment.time} className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
              <span className="w-16 text-xs font-mono font-medium text-muted-foreground">{appointment.time}</span>
              <div className="h-4 w-px bg-border" />
              <span className="text-xs font-medium text-foreground/80">{appointment.name}</span>
              <span className="ml-auto rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                {appointment.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Clara card */}
      <div className="absolute -bottom-6 -left-8 w-56 rounded-xl border border-accent-200 bg-card p-4 shadow-md" style={{ animationDelay: "1s", animation: "float 4s ease-in-out infinite" }}>
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-primary-700">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-xs font-semibold text-foreground">Clara AI</span>
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-success-500" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Mic className="h-3 w-3 text-accent-500" />
            <span className="text-[10px] text-muted-foreground">Transcribing...</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent-100">
            <div className="h-full w-3/4 rounded-full bg-accent-500" />
          </div>
        </div>
      </div>

      {/* Floating vitals card */}
      <div className="absolute -right-4 -top-4 w-44 rounded-xl border border-border bg-card p-3 shadow-md" style={{ animationDelay: "0.5s", animation: "float 3.5s ease-in-out infinite" }}>
        <div className="mb-1.5 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-success-500" />
          <span className="text-[10px] font-semibold text-foreground/80">Patient Vitals</span>
        </div>
        <div className="flex items-baseline gap-1">
          <Stethoscope className="h-3 w-3 text-primary-500" />
          <span className="text-xs font-bold text-foreground">120/80</span>
          <span className="text-[10px] text-muted-foreground">mmHg</span>
        </div>
      </div>
    </div>
  );
}
