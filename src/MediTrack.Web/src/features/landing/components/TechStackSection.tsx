import { clsxMerge } from "@/shared/utils/clsxMerge";
import { GitHubIcon } from "@/shared/components/BrandIcons";
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
  { label: "shadcn/ui", category: "frontend" },
];

const categoryColors: Record<string, string> = {
  frontend: "border-primary-200 bg-primary-50 text-primary-700",
  backend: "border-secondary-200 bg-secondary-50 text-secondary-700",
  infra: "border-border bg-muted text-foreground/80",
  ai: "border-accent-200 bg-accent-50 text-accent-700",
};

export function TechStackSection() {
  return (
    <section id="tech-stack" className="bg-muted py-10 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Built with modern tech
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
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
            { label: "Infrastructure", color: "bg-muted-foreground/50" },
            { label: "AI", color: "bg-accent-200" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={clsxMerge("h-2.5 w-2.5 rounded-full", item.color)} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href="https://github.com/nkmnhan/meditrack"
            target="_blank"
            rel="noopener noreferrer"
            className={clsxMerge(
              "inline-flex h-10 items-center gap-2 rounded-xl border border-border px-6",
              "text-sm font-semibold text-foreground/80 transition-colors hover:bg-card hover:shadow-sm"
            )}
          >
            <GitHubIcon className="h-4 w-4" />
            View Source on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
