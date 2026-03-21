import { ShieldCheck, Lock, FileSearch } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

const trustCards = [
  {
    icon: ShieldCheck,
    title: "HIPAA Compliant",
    description: "Role-based access control, PHI audit logging, and full compliance with healthcare privacy regulations.",
  },
  {
    icon: Lock,
    title: "Encrypted End-to-End",
    description: "TLS in transit, AES-256 at rest, and Transparent Data Encryption for all database storage.",
  },
  {
    icon: FileSearch,
    title: "Complete Audit Trail",
    description: "Every access to patient data is logged with timestamp, user identity, and operation context.",
  },
];

export function TrustSection() {
  return (
    <section className="bg-card py-10 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Security you can trust
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built from day one with healthcare-grade security and compliance.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {trustCards.map((card) => (
            <div
              key={card.title}
              className={clsxMerge(
                "rounded-xl border border-border bg-muted p-6 text-center",
                "transition-all duration-200 hover:border-accent-200 hover:shadow-md"
              )}
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-50">
                <card.icon className="h-6 w-6 text-success-600" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
