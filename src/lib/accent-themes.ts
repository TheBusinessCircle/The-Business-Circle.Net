export const DEFAULT_ACCENT_THEME = "royal-blue";

export const ACCENT_THEME_VALUES = [
  "royal-blue",
  "emerald",
  "amber-gold",
  "crimson",
  "violet"
] as const;

export type AccentTheme = (typeof ACCENT_THEME_VALUES)[number];

export type AccentThemeOption = {
  value: AccentTheme;
  label: string;
  swatch: string;
};

export const ACCENT_THEMES: AccentThemeOption[] = [
  {
    value: "royal-blue",
    label: "Royal Blue",
    swatch: "hsl(221 72% 58%)"
  },
  {
    value: "emerald",
    label: "Emerald",
    swatch: "hsl(154 45% 46%)"
  },
  {
    value: "amber-gold",
    label: "Amber Gold",
    swatch: "hsl(40 56% 58%)"
  },
  {
    value: "crimson",
    label: "Crimson",
    swatch: "hsl(350 56% 55%)"
  },
  {
    value: "violet",
    label: "Violet",
    swatch: "hsl(265 48% 62%)"
  }
];

export function isAccentTheme(value: string | null | undefined): value is AccentTheme {
  return ACCENT_THEME_VALUES.includes(value as AccentTheme);
}

export function resolveAccentTheme(value: string | null | undefined): AccentTheme {
  return isAccentTheme(value) ? value : DEFAULT_ACCENT_THEME;
}
