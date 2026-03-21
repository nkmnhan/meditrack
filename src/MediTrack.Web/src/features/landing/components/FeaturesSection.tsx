import { Link } from "react-router-dom";
import {
  Sparkles, CalendarDays, Users, FileText, Mic, ShieldCheck, ArrowRight,
} from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useScrollReveal } from "../hooks/useScrollReveal";

const features = [
  {
    icon: Sparkles,
    title: "Clara AI Companion",
    description: "Real-time transcription, evidence-based suggestions, and auto-generated SOAP notes during every consultation.",
    iconBg: "bg-accent-50",
    iconColor: "text-accent-500",
    to: "/clara/session/demo",
  },
  {
    icon: CalendarDays,
    title: "Smart Scheduling",
    description: "Drag-and-drop calendar with conflict detection, multi-provider views, and patient self-booking.",
    iconBg: "bg-primary-50",
    iconColor: "text-primary-700",
    to: "/appointments",
  },
  {
    icon: Users,
    title: "Patient Management",
    description: "Comprehensive patient profiles with demographics, medical history, emergency contacts, and insurance details.",
    iconBg: "bg-secondary-50",
    iconColor: "text-secondary-700",
    to: "/patients",
  },
  {
    icon: FileText,
    title: "Medical Records",
    description: "Structured clinical documentation with visit notes, diagnoses (ICD-10), procedures, and lab results.",
    iconBg: "bg-warning-50",
    iconColor: "text-warning-600",
    to: "/medical-records",
  },
  {
    icon: Mic,
    title: "Live Transcription",
    description: "Speaker-diarized speech-to-text with 98%+ accuracy. Clara identifies doctor vs. patient automatically.",
    iconBg: "bg-info-50",
    iconColor: "text-info-700",
    to: "#clara-demo",
    isAnchor: true,
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
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 });

  return (
    <section id="features" className="bg-card py-10 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Everything you need to run a modern practice
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built for healthcare professionals who want AI-augmented workflows without the complexity.
          </p>
        </div>

        <div ref={ref} className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, featureIndex) => {
            const content = (
              <>
                <div className={clsxMerge("mb-4 flex h-11 w-11 items-center justify-center rounded-xl", feature.iconBg)}>
                  <feature.icon className={clsxMerge("h-5 w-5", feature.iconColor)} />
                </div>
                <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                {(feature.to || feature.isAnchor) && (
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    {feature.isAnchor ? "See demo" : "Explore"} <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </>
            );

            const revealStyle = {
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(1.5rem)",
              transitionDelay: `${featureIndex * 100}ms`,
              transitionProperty: "opacity, transform",
              transitionDuration: "400ms",
              transitionTimingFunction: "ease-out",
            };

            const cardClassName = clsxMerge(
              "group rounded-xl border border-border bg-card p-5",
              "transition-all duration-200 hover:border-accent-200 hover:shadow-md"
            );

            if (feature.isAnchor && feature.to) {
              return (
                <a key={feature.title} href={feature.to} className={cardClassName} style={revealStyle}>
                  {content}
                </a>
              );
            }

            if (feature.to) {
              return (
                <Link key={feature.title} to={feature.to} className={cardClassName} style={revealStyle}>
                  {content}
                </Link>
              );
            }

            return (
              <div key={feature.title} className={cardClassName} style={revealStyle}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
