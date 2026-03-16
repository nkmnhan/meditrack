import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/shared/hooks/use-theme";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface ThemeToggleProps {
  readonly className?: string;
  /** Show only the toggle button (no dropdown). Default: true */
  readonly compact?: boolean;
}

/**
 * Theme toggle button — cycles through light → dark → system.
 *
 * Compact mode (default): single button, click to cycle.
 * Expanded mode: shows all three options inline.
 */
export function ThemeToggle({ className, compact = true }: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme } = useTheme();

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={clsxMerge(
          "inline-flex items-center justify-center",
          "h-9 w-9 rounded-md",
          "text-muted-foreground hover:text-foreground",
          "hover:bg-muted",
          "transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        aria-label="Toggle theme"
        title={`Current: ${theme}`}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
      </button>
    );
  }

  const options = [
    { value: "light" as const, icon: Sun, label: "Light" },
    { value: "dark" as const, icon: Moon, label: "Dark" },
    { value: "system" as const, icon: Monitor, label: "System" },
  ];

  return (
    <div
      className={clsxMerge(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5",
        className
      )}
      role="radiogroup"
      aria-label="Theme preference"
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={clsxMerge(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5",
            "text-xs font-medium transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            theme === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
