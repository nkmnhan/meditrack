import { clsxMerge } from "@/shared/utils/clsxMerge";

const techBadges = [
  { label: "React 19", category: "frontend" },
  { label: "TypeScript", category: "frontend" },
  { label: "Tailwind CSS", category: "frontend" },
  { label: "Redux Toolkit", category: "frontend" },
  { label: "Vite", category: "frontend" },
  { label: ".NET 10", category: "backend" },
  { label: "Entity Framework", category: "backend" },
  { label: "MediatR", category: "backend" },
  { label: "FluentValidation", category: "backend" },
  { label: "PostgreSQL", category: "infra" },
  { label: "RabbitMQ", category: "infra" },
  { label: "Docker", category: "infra" },
  { label: "SignalR", category: "backend" },
  { label: "OpenTelemetry", category: "infra" },
  { label: "Duende IdentityServer", category: "backend" },
  { label: "MCP (Model Context Protocol)", category: "ai" },
];

const categoryColors: Record<string, string> = {
  frontend: "border-primary-200 bg-primary-50 text-primary-700",
  backend: "border-secondary-200 bg-secondary-50 text-secondary-700",
  infra: "border-neutral-200 bg-neutral-100 text-neutral-700",
  ai: "border-accent-200 bg-accent-50 text-accent-700",
};

export function TechStackSection() {
  return (
    <section id="tech-stack" className="bg-neutral-50 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
            Built with modern tech
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            Enterprise-grade stack — microservices, clean architecture, and AI-native design.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {techBadges.map((badge) => (
            <span
              key={badge.label}
              className={clsxMerge(
                "rounded-full border px-4 py-2 text-sm font-medium transition-shadow hover:shadow-sm",
                categoryColors[badge.category]
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap justify-center gap-6">
          {[
            { label: "Frontend", color: "bg-primary-200" },
            { label: "Backend", color: "bg-secondary-200" },
            { label: "Infrastructure", color: "bg-neutral-300" },
            { label: "AI", color: "bg-accent-200" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={clsxMerge("h-2.5 w-2.5 rounded-full", item.color)} />
              <span className="text-xs text-neutral-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
