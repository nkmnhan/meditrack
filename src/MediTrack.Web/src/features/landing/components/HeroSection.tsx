import {
  Sparkles, Stethoscope, CalendarDays, FileText, Mic,
  Activity, Users, LayoutDashboard,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { GitHubIcon } from "@/shared/components/BrandIcons";

interface HeroSectionProps {
  readonly onSignIn: () => void;
}

export function HeroSection({ onSignIn }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-neutral-50 to-white pb-16 pt-12 md:pb-24 md:pt-20">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-primary-50 opacity-50 blur-3xl" />
        <div className="absolute -left-20 top-1/2 h-60 w-60 rounded-full bg-accent-50 opacity-40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Left — Copy */}
          <div className="text-center lg:text-left">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-accent-500" />
              <span className="text-xs font-semibold text-accent-700">AI-Powered Clinical Platform</span>
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
              Healthcare,{" "}
              <span className="bg-gradient-to-r from-accent-700 to-primary-700 bg-clip-text text-transparent">
                reimagined
              </span>{" "}
              with AI
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-neutral-600 sm:text-xl">
              MediTrack combines electronic medical records, appointment scheduling, and an
              AI clinical companion — <strong className="text-neutral-900">Clara</strong> — that
              listens, transcribes, and suggests in real time.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <button
                onClick={onSignIn}
                className={clsxMerge(
                  "relative flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl px-8",
                  "bg-gradient-to-r from-accent-500 to-accent-700 text-base font-semibold text-white",
                  "shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
                )}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
                <span className="relative z-10">Sign In to MediTrack</span>
              </button>
              <a
                href="https://github.com/nkmnhan/meditrack"
                target="_blank"
                rel="noopener noreferrer"
                className={clsxMerge(
                  "flex h-12 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-8",
                  "text-base font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
                )}
              >
                <GitHubIcon className="h-5 w-5" />
                View on GitHub
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

/* ── Composed dashboard mockup (no screenshots, pure JSX) ── */

function DashboardMockup() {
  return (
    <div className="relative">
      {/* Main dashboard card */}
      <div className="animate-float rounded-xl border border-neutral-200 bg-white p-6 shadow-md">
        {/* Header bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary-700" />
            <span className="text-sm font-semibold text-neutral-900">Dashboard</span>
          </div>
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-error-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-warning-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-success-400" />
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: CalendarDays, label: "Appointments", value: "12", color: "text-primary-700", bg: "bg-primary-50" },
            { icon: Users, label: "Patients", value: "847", color: "text-secondary-700", bg: "bg-secondary-50" },
            { icon: FileText, label: "Records", value: "2.4k", color: "text-warning-600", bg: "bg-warning-50" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-neutral-100 p-3">
              <div className={clsxMerge("mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg", stat.bg)}>
                <stat.icon className={clsxMerge("h-4 w-4", stat.color)} />
              </div>
              <p className="text-lg font-bold text-neutral-900">{stat.value}</p>
              <p className="text-xs text-neutral-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Schedule preview */}
        <div className="mt-4 space-y-2">
          {[
            { time: "9:00 AM", name: "Sarah Johnson", type: "Follow-up" },
            { time: "10:30 AM", name: "Michael Chen", type: "Consultation" },
          ].map((appointment) => (
            <div key={appointment.time} className="flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2">
              <span className="w-16 text-xs font-mono font-medium text-neutral-600">{appointment.time}</span>
              <div className="h-4 w-px bg-neutral-200" />
              <span className="text-xs font-medium text-neutral-700">{appointment.name}</span>
              <span className="ml-auto rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                {appointment.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Clara card */}
      <div className="absolute -bottom-6 -left-8 w-56 rounded-xl border border-accent-200 bg-white p-4 shadow-md" style={{ animationDelay: "1s", animation: "float 4s ease-in-out infinite" }}>
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-primary-700">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-xs font-semibold text-neutral-900">Clara AI</span>
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-success-500" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Mic className="h-3 w-3 text-accent-500" />
            <span className="text-[10px] text-neutral-600">Transcribing...</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent-100">
            <div className="h-full w-3/4 rounded-full bg-accent-500" />
          </div>
        </div>
      </div>

      {/* Floating vitals card */}
      <div className="absolute -right-4 -top-4 w-44 rounded-xl border border-neutral-200 bg-white p-3 shadow-md" style={{ animationDelay: "0.5s", animation: "float 3.5s ease-in-out infinite" }}>
        <div className="mb-1.5 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-success-500" />
          <span className="text-[10px] font-semibold text-neutral-700">Patient Vitals</span>
        </div>
        <div className="flex items-baseline gap-1">
          <Stethoscope className="h-3 w-3 text-primary-500" />
          <span className="text-xs font-bold text-neutral-900">120/80</span>
          <span className="text-[10px] text-neutral-500">mmHg</span>
        </div>
      </div>
    </div>
  );
}
