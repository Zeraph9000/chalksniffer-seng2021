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
        stat: {
          orange: "#f97316",
          blue: "#3b82f6",
          green: "#10b981",
          purple: "#8b5cf6",
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
