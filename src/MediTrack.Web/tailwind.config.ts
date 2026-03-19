import type { Config } from "tailwindcss";

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

        // ===========================================
        // 1. PRIMARY COLORS (Brand Identity)
        // Medical Blue — trust, professionalism, calm
        // Inspired by Mayo Clinic, Mass General Brigham
        // ===========================================
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",   // Default
          600: "#2563eb",
          700: "#1d4ed8",   // Buttons, headers
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },

        // ===========================================
        // 2. SECONDARY COLORS (Supporting Elements)
        // Healthcare Teal — healing, clarity, freshness
        // Inspired by One Medical, Maven Clinic
        // ===========================================
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",   // Default
          600: "#0d9488",
          700: "#0f766e",   // Accents, links
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },

        // ===========================================
        // 3. ACCENT COLORS (Visual Interest)
        // Violet — CTAs, innovation, calm authority
        // Preferred over orange in healthcare (less alarming)
        // ===========================================
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",   // Default — CTAs
          600: "#9333ea",
          700: "#7c3aed",   // Hover state
          800: "#6b21a8",
          900: "#581c87",
          950: "#3b0764",
        },

        // ===========================================
        // 4. NEUTRAL COLORS (Foundation)
        // Slate grays — text, backgrounds, borders
        // Clean, professional medical aesthetic
        // ===========================================
        neutral: {
          50: "#f8fafc",    // Page background
          100: "#f1f5f9",   // Card backgrounds
          200: "#e2e8f0",   // Borders, dividers
          300: "#cbd5e1",
          400: "#94a3b8",   // Placeholder text
          500: "#64748b",   // Secondary text
          600: "#475569",
          700: "#334155",   // Body text
          800: "#1e293b",
          900: "#0f172a",   // Headings
          950: "#020617",
        },

        // ===========================================
        // 5. SEMANTIC COLORS (Feedback & Status)
        // Standard UI feedback colors
        // ===========================================
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",   // Default
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",   // Default
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        error: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",   // Default
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        info: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",   // Default — sky blue, distinct from primary
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },

        // ===========================================
        // 6. MEDICAL STATUS COLORS (Domain-Specific)
        // Appointment states, triage levels, workflow
        // ===========================================
        status: {
          scheduled: "#3b82f6",   // blue — upcoming appointments
          inProgress: "#f59e0b",  // amber — currently active
          completed: "#22c55e",   // green — finished
          cancelled: "#94a3b8",   // gray — inactive/cancelled
          noShow: "#ef4444",      // red — missed appointments
        },
        triage: {
          critical: "#dc2626",    // red-600 — immediate attention
          urgent: "#ea580c",      // orange-600 — needs priority
          routine: "#3b82f6",     // blue-500 — standard scheduling
        },

        // Healing — Warm teal brand accents (synced from design)
        healing: {
          50:  "#eef7f8",
          100: "#d5ecee",
          200: "#BFDDDE",
          300: "#83C8D1",
          400: "#228693",
          500: "#075061",
          600: "#042434",
        },
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
