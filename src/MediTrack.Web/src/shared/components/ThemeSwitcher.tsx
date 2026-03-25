import { useEffect, useState } from "react";
import { Sun, Moon, Monitor, Check, X, Palette } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useTheme } from "@/shared/hooks/use-theme";
import { useColorTheme } from "@/shared/hooks/use-color-theme";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/components/ui/popover";

/** Custom event name for toggling the sidebar theme switcher */
export const TOGGLE_THEME_EVENT = "toggle-theme-switcher";

const MODES = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: Monitor, label: "System" },
];

// ── Shared panel content ──────────────────────────────────────────

function ThemeSwitcherContent({ onClose }: { readonly onClose?: () => void }) {
  const { theme: modePreference, setTheme: setMode } = useTheme();
  const { colorTheme, setColorTheme, themes } = useColorTheme();

  const isColorPaletteActive = colorTheme !== "default";

  const handleModeSelect = (mode: "light" | "dark" | "system") => {
    setColorTheme("default");
    setMode(mode);
  };

  const handlePaletteSelect = (paletteId: string, mode: "light" | "dark") => {
    setColorTheme(paletteId as Parameters<typeof setColorTheme>[0]);
    setMode(mode);
  };

  const darkThemes = themes.filter((t) => t.mode === "dark");
  const lightThemes = themes.filter((t) => t.mode === "light");

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Theme</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Mode selector */}
      <div className="flex gap-1.5 border-b border-border px-4 py-3">
        {MODES.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleModeSelect(value)}
            className={clsxMerge(
              "flex flex-1 flex-col items-center gap-1 rounded-lg border p-2 text-xs font-medium transition-all duration-150",
              !isColorPaletteActive && modePreference === value
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Palette list */}
      <div className="max-h-[320px] space-y-1.5 overflow-y-auto px-4 py-3">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Dark Palettes</p>
        {darkThemes.map((t) => (
          <PaletteRow key={t.id} config={t} isSelected={colorTheme === t.id} onSelect={handlePaletteSelect} />
        ))}
        <p className="mb-1 mt-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Light / Wellness</p>
        {lightThemes.map((t) => (
          <PaletteRow key={t.id} config={t} isSelected={colorTheme === t.id} onSelect={handlePaletteSelect} />
        ))}
      </div>
    </>
  );
}

/** Single palette row — flat structure, minimal DOM */
function PaletteRow({
  config,
  isSelected,
  onSelect,
}: {
  readonly config: { readonly id: string; readonly label: string; readonly description: string; readonly mode: "light" | "dark"; readonly swatches: readonly string[] };
  readonly isSelected: boolean;
  readonly onSelect: (id: string, mode: "light" | "dark") => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(config.id, config.mode)}
      className={clsxMerge(
        "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-all duration-150",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/30 hover:bg-muted/50",
      )}
    >
      {config.swatches.map((color, i) => (
        <span key={i} className="inline-block h-5 w-5 rounded-full border border-border/30" style={{ backgroundColor: color }} />
      ))}
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
        {config.label}
        <span className="ml-1.5 font-normal text-muted-foreground">{config.description}</span>
      </span>
      {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
    </button>
  );
}

// ── Sidebar ThemeSwitcher (custom event–driven, fixed position) ──

export function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsOpen((prev) => !prev);
    document.addEventListener(TOGGLE_THEME_EVENT, handler);
    return () => document.removeEventListener(TOGGLE_THEME_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      <div
        role="dialog"
        aria-label="Theme settings"
        className="fixed z-50 bottom-16 left-4 right-4 md:left-[4.5rem] md:right-auto md:bottom-16 w-auto md:w-72 rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-bottom"
      >
        <ThemeSwitcherContent onClose={() => setIsOpen(false)} />
      </div>
    </>
  );
}

// ── Popover ThemeSwitcher (Radix Popover, auto-positioned) ──────

export function ThemeSwitcherPopover({ className }: { readonly className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={clsxMerge(
            "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            className,
          )}
          aria-label="Theme settings"
        >
          <Palette className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <ThemeSwitcherContent />
      </PopoverContent>
    </Popover>
  );
}
