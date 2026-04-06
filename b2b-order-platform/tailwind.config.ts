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
          DEFAULT: "#f0f2f5",
          raised: "#ffffff",
          overlay: "#f7f8fa",
          border: "#e2e6ed",
          hover: "#f0f2f5",
        },
        accent: {
          primary: "#e55a2d",
          "primary-muted": "#fef2ee",
          buyer: "#e55a2d",
          "buyer-muted": "#fef2ee",
          seller: "#2563eb",
          "seller-muted": "#eff6ff",
        },
        ink: {
          DEFAULT: "#1e293b",
          muted: "#64748b",
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
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
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
