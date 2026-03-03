import { UserPlus, CalendarDays, Sparkles, FileText } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    label: "Register",
    description: "Add patient demographics and insurance in under 2 minutes",
  },
  {
    icon: CalendarDays,
    label: "Schedule",
    description: "Book appointments with smart conflict detection",
  },
  {
    icon: Sparkles,
    label: "Consult with Clara",
    description: "Start a session — Clara transcribes and suggests in real time",
  },
  {
    icon: FileText,
    label: "Document",
    description: "Auto-generated SOAP notes saved directly to the patient record",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-neutral-50 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            From patient registration to clinical documentation — four simple steps.
          </p>
        </div>

        {/* Desktop: horizontal stepper */}
        <div className="relative mt-16 hidden items-start justify-between md:flex">
          <div className="absolute left-[10%] right-[10%] top-[44px] border-t-2 border-dashed border-neutral-200" />
          {steps.map((step, stepIndex) => (
            <div key={step.label} className="relative z-10 flex w-1/4 flex-col items-center text-center">
              <div className="mb-3 rounded-xl bg-white p-2.5 shadow-sm">
                <step.icon className="h-5 w-5 text-accent-500" />
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-white">
                {stepIndex + 1}
              </div>
              <p className="mt-2 text-sm font-medium text-neutral-900">{step.label}</p>
              <p className="mt-1 max-w-[180px] text-xs leading-relaxed text-neutral-500">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Mobile: vertical stepper */}
        <div className="relative mt-10 pl-10 md:hidden">
          <div className="absolute bottom-4 left-[14px] top-4 border-l-2 border-dashed border-neutral-200" />
          <div className="space-y-8">
            {steps.map((step, stepIndex) => (
              <div key={step.label} className="relative flex items-start gap-4">
                <div className="absolute -left-10 flex flex-col items-center">
                  <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-white">
                    {stepIndex + 1}
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <step.icon className="h-4 w-4 text-accent-500" />
                    <p className="text-sm font-medium text-neutral-900">{step.label}</p>
                  </div>
                  <p className="text-xs leading-relaxed text-neutral-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
