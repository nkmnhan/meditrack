import { useState } from "react";
import { Stethoscope, Menu, X } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { GitHubIcon } from "@/shared/components/BrandIcons";

interface LandingNavProps {
  readonly onSignIn: () => void;
}

const navLinks = [
  { label: "Try Clara", href: "#clara-demo" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Tech Stack", href: "#tech-stack" },
];

export function LandingNav({ onSignIn }: LandingNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Stethoscope className="h-7 w-7 text-primary-700" />
          <span className="text-xl font-bold text-primary-700">MediTrack</span>
        </div>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-neutral-700 transition-colors hover:text-primary-700"
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://github.com/nkmnhan/meditrack"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-neutral-500 transition-colors hover:text-neutral-900"
            aria-label="View source on GitHub"
          >
            <GitHubIcon className="h-5 w-5" />
          </a>
          <button
            onClick={onSignIn}
            className="h-10 rounded-lg bg-primary-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
          >
            Sign In
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-50 md:hidden"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-neutral-200 bg-white px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={clsxMerge(
                  "rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700",
                  "transition-colors hover:bg-neutral-50"
                )}
              >
                {link.label}
              </a>
            ))}
            <a
              href="https://github.com/nkmnhan/meditrack"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className={clsxMerge(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700",
                "transition-colors hover:bg-neutral-50"
              )}
            >
              <GitHubIcon className="h-4 w-4" />
              GitHub
            </a>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onSignIn();
              }}
              className="mt-2 h-11 rounded-lg bg-primary-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
            >
              Sign In
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
