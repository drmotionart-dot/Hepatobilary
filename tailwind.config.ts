import type { Config } from "tailwindcss";

// Tokens match section 8 ("UI/UX Direction — Design Tokens") of the build spec.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#F6F7F5",
        surface: "#FFFFFF",
        ink: "#1C2321",
        primary: { DEFAULT: "#0E5C56", ink: "#0A403C" },
        male: "#3B5BA5",
        female: "#B15C6B",
        urgent: "#C4472B",
        pending: "#D98E3B",
        success: "#3E8F6B",
        // Dark-mode counterparts (Phase 3 completes the full sweep; these
        // drive the top bar and body today).
        dark: {
          bg: "#101513",
          surface: "#1A211E",
          ink: "#E8EDEA",
          border: "#2A332F",
          primary: "#35B8AC",
        },
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
