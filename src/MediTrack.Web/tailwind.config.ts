import type { Config } from "tailwindcss";

/** Generate hsl(var(--{name}-{shade})) references for a color scale */
function cssScale(name: string, shades: readonly number[]): Record<number, string> {
  return Object.fromEntries(shades.map(s => [s, `hsl(var(--${name}-${s}))`]));
}

const STEPS_11 = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const STEPS_10 = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
const STEPS_HEALING = [50, 100, 200, 300, 400, 500, 600] as const;

const tailwindConfig: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // shadcn/ui semantic tokens — backed by CSS variables in index.css
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },

        // Primary — Medical Blue (CSS var-backed → theme-aware)
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          ...cssScale("primary", STEPS_11),
        },

        // Secondary — Healthcare Teal (CSS var-backed → theme-aware)
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          ...cssScale("secondary", STEPS_11),
        },

        // Accent — Violet (CSS var-backed → theme-aware)
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          ...cssScale("accent", STEPS_11),
        },

        // Neutral — Slate grays (hardcoded — components should use semantic tokens)
        neutral: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },

        // Semantic — Feedback & Status (CSS var-backed → theme-harmonized)
        success: cssScale("success", STEPS_10),
        warning: cssScale("warning", STEPS_10),
        error: cssScale("error", STEPS_10),
        info: cssScale("info", STEPS_10),

        // Medical Status — Appointment workflow states (fixed for safety)
        status: {
          scheduled: "#3b82f6",
          inProgress: "#f59e0b",
          completed: "#22c55e",
          cancelled: "#94a3b8",
          noShow: "#ef4444",
        },

        // Triage — Medical urgency levels (fixed for safety)
        triage: {
          critical: "#dc2626",
          urgent: "#ea580c",
          routine: "#3b82f6",
        },

        // Healing — Warm teal brand accents (CSS var-backed)
        healing: cssScale("healing", STEPS_HEALING),
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Georgia", "Merriweather", "serif"],  // For medical documents, printable reports
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        // Elevation system — keep subtle for healthcare UI
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "typing-bounce": {
          "0%, 80%, 100%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-6px)" },
        },
        "transcript-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        waveform: {
          "0%, 100%": { height: "20%" },
          "50%": { height: "80%" },
        },
        "suggestion-in": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "count-up-fade": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "gentle-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        nudge: {
          "0%, 86%": { transform: "translateY(0) rotate(0deg)" },
          "88%": { transform: "translateY(-3px) rotate(-6deg)" },
          "90%": { transform: "translateY(0) rotate(4deg)" },
          "92%": { transform: "translateY(-2px) rotate(-3deg)" },
          "94%": { transform: "translateY(0) rotate(2deg)" },
          "96%": { transform: "translateY(-1px) rotate(0deg)" },
          "100%": { transform: "translateY(0) rotate(0deg)" },
        },
        "border-spin": {
          "0%": { transform: "translate(-50%, -50%) rotate(0deg)" },
          "100%": { transform: "translate(-50%, -50%) rotate(360deg)" },
        },
        "border-flow": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 3s infinite",
        float: "float 3s ease-in-out infinite",
        "typing-bounce": "typing-bounce 1.4s ease-in-out infinite",
        "transcript-in": "transcript-in 0.3s ease-out",
        waveform: "waveform 1.2s ease-in-out infinite",
        "suggestion-in": "suggestion-in 0.4s ease-out",
        "fade-in-up": "fade-in-up 0.3s ease-out",
        blink: "blink 0.8s step-end infinite",
        "count-up-fade": "count-up-fade 0.4s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "gentle-float": "gentle-float 3s ease-in-out infinite",
        nudge: "nudge 5s ease-in-out infinite",
        "border-spin": "border-spin 3s linear infinite",
        "border-flow": "border-flow 3s ease infinite",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
};

export default tailwindConfig;
