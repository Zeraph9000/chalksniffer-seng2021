import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#eef0f4",
          raised: "#ffffff",
          overlay: "#f5f6f8",
          border: "#d5d9e2",
          hover: "#eef0f4",
        },
        accent: {
          primary: "#b34215",
          "primary-muted": "#fdf0eb",
          buyer: "#b34215",
          "buyer-muted": "#fdf0eb",
          seller: "#1d4ed8",
          "seller-muted": "#eff6ff",
        },
        ink: {
          DEFAULT: "#0f172a",
          muted: "#475569",
          faint: "#94a3b8",
        },
        // Semantic colors — each color carries meaning
        semantic: {
          success: "#059669",        // paid, received, completed
          "success-muted": "#ecfdf5",
          warning: "#d97706",        // action required, attention
          "warning-muted": "#fffbeb",
          danger: "#dc2626",         // overdue, errors, cancellations
          "danger-muted": "#fef2f2",
          info: "#2563eb",           // in-transit, despatched, sent
          "info-muted": "#eff6ff",
          neutral: "#475569",        // awaiting review, draft
          "neutral-muted": "#f1f5f9",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "slide-down": "slide-down 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
