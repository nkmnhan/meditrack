import {
  CalendarDays, Sparkles, Mic, Users,
  Activity,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

const showcaseCards = [
  {
    title: "Clinical Dashboard",
    description: "At-a-glance view of today's appointments, patient stats, and Clara AI suggestions.",
    content: <DashboardPreview />,
  },
  {
    title: "Clara AI Session",
    description: "Real-time transcription with live clinical suggestions as you consult.",
    content: <ClaraSessionPreview />,
  },
  {
    title: "Appointment Calendar",
    description: "Weekly and monthly views with drag-and-drop scheduling and provider filters.",
    content: <CalendarPreview />,
  },
];

export function ScreenshotShowcase() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
            See it in action
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            Designed for doctors — clean, fast, and distraction-free.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {showcaseCards.map((card) => (
            <div
              key={card.title}
              className={clsxMerge(
                "overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm",
                "transition-shadow hover:shadow-md"
              )}
            >
              {/* Mockup content */}
              <div className="p-4">{card.content}</div>
              {/* Label */}
              <div className="border-t border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-neutral-900">{card.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Mockup sub-components ── */

function DashboardPreview() {
  return (
    <div className="space-y-3">
      {/* Mini stat row */}
      <div className="flex gap-2">
        {[
          { icon: CalendarDays, value: "8", color: "text-primary-700", bg: "bg-primary-50" },
          { icon: Users, value: "142", color: "text-secondary-700", bg: "bg-secondary-50" },
          { icon: Activity, value: "3", color: "text-accent-500", bg: "bg-accent-50" },
        ].map((stat) => (
          <div key={stat.value} className="flex-1 rounded-lg border border-neutral-100 bg-white p-2">
            <div className={clsxMerge("mb-1 flex h-6 w-6 items-center justify-center rounded", stat.bg)}>
              <stat.icon className={clsxMerge("h-3 w-3", stat.color)} />
            </div>
            <p className="text-sm font-bold text-neutral-900">{stat.value}</p>
          </div>
        ))}
      </div>
      {/* Schedule lines */}
      <div className="space-y-1.5">
        {["9:00 AM", "10:30 AM", "2:00 PM"].map((time) => (
          <div key={time} className="flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5">
            <span className="w-14 text-[10px] font-mono text-neutral-500">{time}</span>
            <div className="h-1.5 flex-1 rounded-full bg-neutral-100">
              <div className="h-full w-2/3 rounded-full bg-primary-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClaraSessionPreview() {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-primary-700">
          <Sparkles className="h-3 w-3 text-white" />
        </div>
        <span className="text-xs font-semibold text-neutral-900">Clara Session</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-success-600">
          <Mic className="h-2.5 w-2.5" /> Recording
        </span>
      </div>
      {/* Transcript lines */}
      <div className="space-y-2">
        <div className="rounded-lg bg-white p-2">
          <p className="text-[10px] font-semibold text-primary-700">Dr. Smith</p>
          <p className="text-[10px] text-neutral-600">What brings you in today?</p>
        </div>
        <div className="rounded-lg bg-white p-2">
          <p className="text-[10px] font-semibold text-secondary-700">Patient</p>
          <p className="text-[10px] text-neutral-600">I've been having headaches for about a week...</p>
        </div>
      </div>
      {/* Suggestion */}
      <div className="rounded-lg border border-accent-200 bg-accent-50 p-2">
        <div className="flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5 text-accent-500" />
          <span className="text-[10px] font-semibold text-accent-700">Suggestion</span>
        </div>
        <p className="mt-0.5 text-[10px] text-neutral-600">Consider: Tension-type headache (G44.2)</p>
      </div>
    </div>
  );
}

function CalendarPreview() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  return (
    <div className="space-y-2">
      {/* Day headers */}
      <div className="flex gap-1">
        {days.map((day) => (
          <div key={day} className="flex-1 text-center text-[9px] font-medium text-neutral-500">
            {day}
          </div>
        ))}
      </div>
      {/* Time slots */}
      {["9 AM", "10 AM", "11 AM"].map((time) => (
        <div key={time} className="flex items-center gap-1">
          <span className="w-8 text-[9px] text-neutral-400">{time}</span>
          <div className="flex flex-1 gap-1">
            {days.map((day, dayIndex) => {
              const hasEvent = (dayIndex === 0 && time === "9 AM") || (dayIndex === 2 && time === "10 AM") || (dayIndex === 4 && time === "11 AM");
              return (
                <div
                  key={day}
                  className={clsxMerge(
                    "h-5 flex-1 rounded",
                    hasEvent ? "bg-primary-100 border border-primary-200" : "bg-white border border-neutral-100"
                  )}
                />
              );
            })}
          </div>
        </div>
      ))}
      {/* Legend */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-sm bg-primary-200" />
          <span className="text-[9px] text-neutral-500">Booked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-sm border border-neutral-200 bg-white" />
          <span className="text-[9px] text-neutral-500">Available</span>
        </div>
      </div>
    </div>
  );
}
