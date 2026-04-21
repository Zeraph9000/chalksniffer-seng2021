import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
          4: "var(--ink-4)",
        },
        paper: {
          DEFAULT: "var(--paper)",
          2: "var(--paper-2)",
        },
        line: {
          DEFAULT: "var(--line)",
          2: "var(--line-2)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
        },
        hot: "var(--hot)",
        warn: {
          DEFAULT: "var(--warn)",
          bg: "var(--warn-bg)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          soft: "var(--danger-soft)",
        },
        brand: {
          DEFAULT: "var(--brand)",
          ink: "var(--brand-ink)",
          soft: "var(--brand-soft)",
          surface: "var(--brand-surface)",
          contrast: "var(--brand-contrast)",
        },
        "s-placed":     { bg: "var(--s-placed-bg)",     fg: "var(--s-placed-fg)"     },
        "s-paid":       { bg: "var(--s-paid-bg)",       fg: "var(--s-paid-fg)"       },
        "s-despatched": { bg: "var(--s-despatched-bg)", fg: "var(--s-despatched-fg)" },
        "s-received":   { bg: "var(--s-received-bg)",   fg: "var(--s-received-fg)"   },
        "s-invoiced":   { bg: "var(--s-invoiced-bg)",   fg: "var(--s-invoiced-fg)"   },
        "s-cancelled":  { bg: "var(--s-cancelled-bg)",  fg: "var(--s-cancelled-fg)"  },
        "s-scheduled":  { bg: "var(--s-scheduled-bg)",  fg: "var(--s-scheduled-fg)"  },
        "s-draft":      { bg: "var(--s-draft-bg)",      fg: "var(--s-draft-fg)"      },
        "s-sent":       { bg: "var(--s-sent-bg)",       fg: "var(--s-sent-fg)"       },
        "c-pantry":  "var(--c-pantry)",
        "c-coffee":  "var(--c-coffee)",
        "c-home":    "var(--c-home)",
        "c-apparel": "var(--c-apparel)",
        "c-stat":    "var(--c-stat)",
        "c-flowers": "var(--c-flowers)",
        "c-skin":    "var(--c-skin)",
        "c-books":   "var(--c-books)",
        "c-kids":    "var(--c-kids)",
        "c-vintage": "var(--c-vintage)",
      },
      fontFamily: {
        sans: ['"Geist"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Inter Tight"', '"Geist"', "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
      },
      keyframes: {
        "fade-up":    { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in":    { "0%": { opacity: "0" },                                "100%": { opacity: "1" } },
        "slide-down": { "0%": { opacity: "0", transform: "translateY(-4px)" },"100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "fade-up":    "fade-up 0.4s ease-out forwards",
        "fade-in":    "fade-in 0.3s ease-out forwards",
        "slide-down": "slide-down 0.3s ease-out forwards",
      },
    },
  },
  plugins: [animate],
};

export default config;
