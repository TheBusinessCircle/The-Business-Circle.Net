import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        buttonForeground: "hsl(var(--button-foreground) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        primary: "hsl(var(--primary) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        foundation: "hsl(var(--foundation) / <alpha-value>)",
        innerCircle: "hsl(var(--inner-circle) / <alpha-value>)",
        core: "hsl(var(--core) / <alpha-value>)",
        silver: "hsl(var(--silver) / <alpha-value>)",
        gold: "hsl(var(--gold) / <alpha-value>)"
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(var(--gold) / 0.25), 0 16px 40px rgba(0, 0, 0, 0.35)",
        "foundation-soft": "0 14px 36px rgba(63, 110, 160, 0.24)",
        "gold-soft": "0 14px 36px rgba(146, 116, 62, 0.28)",
        "silver-soft": "0 14px 32px rgba(174, 185, 196, 0.14)",
        panel: "0 20px 50px rgba(2, 8, 23, 0.45)",
        "panel-soft": "0 16px 34px rgba(2, 8, 23, 0.33)",
        "inner-surface": "inset 0 1px 0 hsl(var(--silver) / 0.09)"
      },
      backgroundImage: {
        "radial-premium":
          "radial-gradient(circle at 8% 4%, hsl(var(--gold) / 0.22), transparent 42%), radial-gradient(circle at 85% 12%, hsl(var(--silver) / 0.08), transparent 30%), linear-gradient(180deg, #070e1f 0%, #081126 100%)"
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "sans-serif"],
        display: ["var(--font-sora)", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
