export const DEFAULT_ACCENT_THEME = "royal-blue";

export const ACCENT_THEME_VALUES = [
  "royal-blue",
  "emerald",
  "amber-gold",
  "crimson",
  "violet"
] as const;

export type AccentTheme = (typeof ACCENT_THEME_VALUES)[number];

export type AccentThemeCssVariables = {
  "--member-accent": string;
  "--member-accent-soft": string;
  "--member-accent-strong": string;
  "--member-accent-glow": string;
  "--member-accent-border": string;
  "--member-accent-text": string;
  "--member-accent-muted": string;
  "--member-accent-metal": string;
  "--member-accent-highlight": string;
  "--member-accent-foreground": string;
};

export type AccentThemeOption = {
  value: AccentTheme;
  label: string;
  mood: string;
  palette: {
    primary: string;
    soft: string;
    strong: string;
    metal: string;
    highlight: string;
  };
  cssVariables: AccentThemeCssVariables;
};

export const ACCENT_THEMES: AccentThemeOption[] = [
  {
    value: "royal-blue",
    label: "Royal Blue",
    mood: "Official BCN, premium, trusted, executive",
    palette: {
      primary: "#1d4ed8",
      soft: "#60a5fa",
      strong: "#0f2a6b",
      metal: "#cbd5e1",
      highlight: "#d6b56d"
    },
    cssVariables: {
      "--member-accent": "221 72% 58%",
      "--member-accent-soft": "213 93% 68%",
      "--member-accent-strong": "224 75% 24%",
      "--member-accent-glow": "rgba(96, 165, 250, 0.22)",
      "--member-accent-border": "221 72% 58%",
      "--member-accent-text": "213 93% 84%",
      "--member-accent-muted": "215 20% 72%",
      "--member-accent-metal": "214 18% 82%",
      "--member-accent-highlight": "42 56% 63%",
      "--member-accent-foreground": "210 43% 97%"
    }
  },
  {
    value: "emerald",
    label: "Emerald",
    mood: "Growth, calm authority, grounded wealth",
    palette: {
      primary: "#047857",
      soft: "#6ee7b7",
      strong: "#064e3b",
      metal: "#cbd5e1",
      highlight: "#d8c27a"
    },
    cssVariables: {
      "--member-accent": "160 84% 27%",
      "--member-accent-soft": "156 72% 67%",
      "--member-accent-strong": "164 86% 16%",
      "--member-accent-glow": "rgba(110, 231, 183, 0.2)",
      "--member-accent-border": "158 56% 44%",
      "--member-accent-text": "156 72% 78%",
      "--member-accent-muted": "160 24% 70%",
      "--member-accent-metal": "214 18% 82%",
      "--member-accent-highlight": "45 54% 66%",
      "--member-accent-foreground": "210 43% 97%"
    }
  },
  {
    value: "amber-gold",
    label: "Amber Gold",
    mood: "Premium, warm, established, confident",
    palette: {
      primary: "#b8860b",
      soft: "#f5d982",
      strong: "#5c3b0a",
      metal: "#d1d5db",
      highlight: "#9a6a2f"
    },
    cssVariables: {
      "--member-accent": "40 89% 38%",
      "--member-accent-soft": "47 86% 74%",
      "--member-accent-strong": "37 80% 20%",
      "--member-accent-glow": "rgba(245, 217, 130, 0.2)",
      "--member-accent-border": "42 58% 55%",
      "--member-accent-text": "47 86% 78%",
      "--member-accent-muted": "42 24% 70%",
      "--member-accent-metal": "220 14% 83%",
      "--member-accent-highlight": "31 53% 39%",
      "--member-accent-foreground": "222 58% 8%"
    }
  },
  {
    value: "crimson",
    label: "Crimson",
    mood: "Bold, high-status, ambitious, decisive",
    palette: {
      primary: "#991b1b",
      soft: "#fca5a5",
      strong: "#4c0519",
      metal: "#cbd5e1",
      highlight: "#d8a48f"
    },
    cssVariables: {
      "--member-accent": "0 70% 35%",
      "--member-accent-soft": "0 94% 82%",
      "--member-accent-strong": "336 88% 16%",
      "--member-accent-glow": "rgba(252, 165, 165, 0.18)",
      "--member-accent-border": "350 52% 54%",
      "--member-accent-text": "0 94% 86%",
      "--member-accent-muted": "350 20% 72%",
      "--member-accent-metal": "214 18% 82%",
      "--member-accent-highlight": "18 45% 70%",
      "--member-accent-foreground": "210 43% 97%"
    }
  },
  {
    value: "violet",
    label: "Violet",
    mood: "Strategic, creative, modern, premium",
    palette: {
      primary: "#6d28d9",
      soft: "#c4b5fd",
      strong: "#3b0764",
      metal: "#cbd5e1",
      highlight: "#d8c27a"
    },
    cssVariables: {
      "--member-accent": "263 70% 50%",
      "--member-accent-soft": "255 92% 86%",
      "--member-accent-strong": "278 87% 21%",
      "--member-accent-glow": "rgba(196, 181, 253, 0.2)",
      "--member-accent-border": "265 62% 64%",
      "--member-accent-text": "255 92% 88%",
      "--member-accent-muted": "260 20% 74%",
      "--member-accent-metal": "214 18% 82%",
      "--member-accent-highlight": "45 54% 66%",
      "--member-accent-foreground": "210 43% 97%"
    }
  }
];

export function isAccentTheme(value: string | null | undefined): value is AccentTheme {
  return ACCENT_THEME_VALUES.includes(value as AccentTheme);
}

export function resolveAccentTheme(value: string | null | undefined): AccentTheme {
  return isAccentTheme(value) ? value : DEFAULT_ACCENT_THEME;
}

export function getAccentThemeOption(value: string | null | undefined): AccentThemeOption {
  const resolvedTheme = resolveAccentTheme(value);
  return ACCENT_THEMES.find((theme) => theme.value === resolvedTheme) ?? ACCENT_THEMES[0];
}

export function getAccentThemeCssVariables(value: string | null | undefined): AccentThemeCssVariables {
  return getAccentThemeOption(value).cssVariables;
}
