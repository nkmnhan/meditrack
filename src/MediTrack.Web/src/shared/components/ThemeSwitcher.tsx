import { useEffect, useState } from "react";
import { Sun, Moon, Monitor, Check, X } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useTheme } from "@/shared/hooks/use-theme";
import { useColorTheme } from "@/shared/hooks/use-color-theme";

/**
 * Theme Switcher — popover panel triggered from the sidebar palette button.
 *
 * Single selection: picking light/dark/system deselects any color palette.
 * Picking a color palette activates dark mode and deselects mode buttons.
 */
export function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme: modePreference, setTheme: setMode } = useTheme();
  const { colorTheme, setColorTheme, themes } = useColorTheme();

  // Listen for toggle event from SidebarThemeButton
  useEffect(() => {
    const handler = () => setIsOpen((prev) => !prev);
    document.addEventListener("toggle-theme-switcher", handler);
    return () => document.removeEventListener("toggle-theme-switcher", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  // A color palette is active (not default mode)
  const isColorPaletteActive = colorTheme !== "default";

  const handleModeSelect = (mode: "light" | "dark" | "system") => {
    setColorTheme("default"); // deselect any palette
    setMode(mode);
  };

  const handlePaletteSelect = (paletteId: string, mode: "light" | "dark") => {
    setColorTheme(paletteId as Parameters<typeof setColorTheme>[0]);
    setMode(mode);
  };

  return (
    <>
      {/* Backdrop to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Panel — mobile: centered above bottom nav, desktop: above sidebar footer */}
      <div
        className={clsxMerge(
          "fixed z-50",
          "bottom-16 left-4 right-4 md:left-[4.5rem] md:right-auto md:bottom-16",
          "w-auto md:w-72 rounded-xl border border-border bg-card shadow-2xl",
          "transition-all duration-200 ease-out origin-bottom",
          isOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-2 scale-95 opacity-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Theme</h3>
            <p className="text-xs text-muted-foreground">
              Pick one appearance or palette
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mode selector (light/dark/system) */}
        <div className="border-b border-border px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Appearance
          </p>
          <div className="flex gap-1.5">
            {([
              { value: "light" as const, icon: Sun, label: "Light" },
              { value: "dark" as const, icon: Moon, label: "Dark" },
              { value: "system" as const, icon: Monitor, label: "System" },
            ]).map(({ value, icon: Icon, label }) => {
              const isSelected = !isColorPaletteActive && modePreference === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleModeSelect(value)}
                  className={clsxMerge(
                    "flex flex-1 flex-col items-center gap-1 rounded-lg border p-2",
                    "text-xs font-medium transition-all duration-150",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color palette grid */}
        <div className="max-h-[320px] overflow-y-auto px-4 py-3">
          {(["dark", "light"] as const).map((mode) => {
            const modeThemes = themes.filter((t) => t.mode === mode);
            if (modeThemes.length === 0) return null;
            return (
              <div key={mode} className={mode === "light" ? "mt-3" : ""}>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {mode === "dark" ? "Dark Palettes" : "Light / Wellness"}
                </p>
                <div className="space-y-1.5">
                  {modeThemes.map((themeConfig) => {
                    const isSelected = colorTheme === themeConfig.id;
                    return (
                      <button
                        key={themeConfig.id}
                        type="button"
                        onClick={() => handlePaletteSelect(themeConfig.id, themeConfig.mode)}
                        className={clsxMerge(
                          "flex w-full items-center gap-3 rounded-lg border p-2.5",
                          "text-left transition-all duration-150",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        )}
                      >
                        {/* Swatch row */}
                        <div className="flex gap-0.5">
                          {themeConfig.swatches.map((color, index) => (
                            <div
                              key={index}
                              className="h-5 w-5 rounded-full border border-border/30"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>

                        {/* Label */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">
                            {themeConfig.label}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {themeConfig.description}
                          </p>
                        </div>

                        {isSelected && (
                          <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
