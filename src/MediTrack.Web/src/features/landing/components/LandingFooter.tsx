import { Stethoscope } from "lucide-react";
import { GitHubIcon } from "@/shared/components/BrandIcons";

const footerLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Tech Stack", href: "#tech-stack" },
];

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-primary-700" />
              <span className="text-lg font-bold text-primary-700">MediTrack</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              AI-powered clinical management platform. Built for healthcare professionals, by developers.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Quick Links</h3>
            <ul className="mt-3 space-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-neutral-500 transition-colors hover:text-primary-700"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* GitHub & Author */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Open Source</h3>
            <p className="mt-3 text-sm text-neutral-500">
              MediTrack is a portfolio project showcasing modern healthcare software engineering.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href="https://github.com/nkmnhan/meditrack"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:underline"
              >
                <GitHubIcon className="h-4 w-4" />
                View on GitHub
              </a>
              <a
                href="https://github.com/nkmnhan"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-primary-700"
              >
                Built by @nkmnhan
              </a>
              <a
                href="https://github.com/nkmnhan/meditrack/tree/main/design"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-primary-700"
              >
                UI Design System
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-neutral-200 pt-6 text-center">
          <p className="text-xs text-neutral-400">
            &copy; {currentYear} MediTrack by{" "}
            <a
              href="https://github.com/nkmnhan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-primary-700"
            >
              Nhan Nguyen
            </a>
            . Portfolio project — not for production clinical use.
          </p>
        </div>
      </div>
    </footer>
  );
}
