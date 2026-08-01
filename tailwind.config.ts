import type { Config } from "tailwindcss";

// Tokens match section 8 ("UI/UX Direction — Design Tokens") of the build spec.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          ink: "rgb(var(--primary-ink) / <alpha-value>)",
        },
        male: "rgb(var(--male) / <alpha-value>)",
        female: "rgb(var(--female) / <alpha-value>)",
        urgent: "rgb(var(--urgent) / <alpha-value>)",
        pending: "rgb(var(--pending) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        danger: "rgb(var(--urgent) / <alpha-value>)",
        warning: "rgb(var(--pending) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "var(--font-plex-sans-arabic)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"]
      },
      keyframes: {
        "on-shift-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" }
        }
      },
      animation: {
        "on-shift-pulse": "on-shift-pulse 2s ease-in-out infinite"
      }
    }
  },
  plugins: []
} satisfies Config;
