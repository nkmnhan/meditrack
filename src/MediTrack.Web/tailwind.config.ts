import type { Config } from "tailwindcss";

const tailwindConfig: Config = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ===========================================
        // 1. PRIMARY COLORS (Brand Identity)
        // Medical Blue — trust, professionalism, calm
        // Inspired by Mayo Clinic, Mass General Brigham
        // ===========================================
        primary: {
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
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Georgia", "Merriweather", "serif"],  // For medical documents, printable reports
      },
      boxShadow: {
        // Elevation system — keep subtle for healthcare UI
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",           // Cards, subtle lift
        DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",  // Dropdowns, popovers
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)", // Modals, dialogs
      },
    },
  },
  plugins: [],
};

export default tailwindConfig;
