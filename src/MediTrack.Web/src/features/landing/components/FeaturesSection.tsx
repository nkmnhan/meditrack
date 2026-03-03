import {
  Sparkles, CalendarDays, Users, FileText, Mic, ShieldCheck,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

const features = [
  {
    icon: Sparkles,
    title: "Clara AI Companion",
    description: "Real-time transcription, evidence-based suggestions, and auto-generated SOAP notes during every consultation.",
    iconBg: "bg-accent-50",
    iconColor: "text-accent-500",
  },
  {
    icon: CalendarDays,
    title: "Smart Scheduling",
    description: "Drag-and-drop calendar with conflict detection, multi-provider views, and patient self-booking.",
    iconBg: "bg-primary-50",
    iconColor: "text-primary-700",
  },
  {
    icon: Users,
    title: "Patient Management",
    description: "Comprehensive patient profiles with demographics, medical history, emergency contacts, and insurance details.",
    iconBg: "bg-secondary-50",
    iconColor: "text-secondary-700",
  },
  {
    icon: FileText,
    title: "Medical Records",
    description: "Structured clinical documentation with visit notes, diagnoses (ICD-10), procedures, and lab results.",
    iconBg: "bg-warning-50",
    iconColor: "text-warning-600",
  },
  {
    icon: Mic,
    title: "Live Transcription",
    description: "Speaker-diarized speech-to-text with 98%+ accuracy. Clara identifies doctor vs. patient automatically.",
    iconBg: "bg-info-50",
    iconColor: "text-info-700",
  },
  {
    icon: ShieldCheck,
    title: "HIPAA Compliant",
    description: "PHI audit logging, encryption at rest and in transit, role-based access control, and full audit trail.",
    iconBg: "bg-success-50",
    iconColor: "text-success-700",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
            Everything you need to run a modern practice
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            Built for healthcare professionals who want AI-augmented workflows without the complexity.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={clsxMerge(
                "rounded-xl border border-neutral-200 bg-white p-5",
                "transition-all duration-200 hover:border-accent-200 hover:shadow-md"
              )}
            >
              <div className={clsxMerge("mb-4 flex h-11 w-11 items-center justify-center rounded-xl", feature.iconBg)}>
                <feature.icon className={clsxMerge("h-5 w-5", feature.iconColor)} />
              </div>
              <h3 className="text-base font-semibold text-neutral-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
