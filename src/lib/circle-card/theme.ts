export const CIRCLE_CARD_THEME_SURFACE_STYLES = [
  "GLASS",
  "MODERN",
  "PREMIUM",
  "CREATOR",
  "MINIMAL",
  "BOLD"
] as const;

export type CircleCardThemeSurfaceStyle = (typeof CIRCLE_CARD_THEME_SURFACE_STYLES)[number];

export const CIRCLE_CARD_THEME_SURFACE_STYLE_COPY: Record<
  CircleCardThemeSurfaceStyle,
  {
    label: string;
    description: string;
  }
> = {
  GLASS: {
    label: "Glass",
    description: "Soft translucent panels with light depth."
  },
  MODERN: {
    label: "Modern",
    description: "Clean contrast and a sharper digital feel."
  },
  PREMIUM: {
    label: "Premium",
    description: "Rich surfaces, controlled glow and polished borders."
  },
  CREATOR: {
    label: "Creator",
    description: "Bolder highlights for social-first profiles."
  },
  MINIMAL: {
    label: "Minimal",
    description: "Quiet surfaces with restrained accents."
  },
  BOLD: {
    label: "Bold",
    description: "High-contrast identity with stronger buttons."
  }
};

export const CIRCLE_CARD_THEME_FUTURE_FAMILIES = [
  "football",
  "country",
  "brand",
  "community",
  "seasonal",
  "shared"
] as const;

export type CircleCardThemeFutureFamily = (typeof CIRCLE_CARD_THEME_FUTURE_FAMILIES)[number];

export type CircleCardThemeValues = {
  primaryColor: string;
  accentColor: string;
  buttonColor: string;
  surfaceStyle: CircleCardThemeSurfaceStyle;
};

export type CircleCardThemePreset = CircleCardThemeValues & {
  key: string;
  label: string;
  family: "Business" | "Creator" | "Minimal";
};

export const CIRCLE_CARD_THEME_PRESETS = [
  {
    key: "professional-blue",
    label: "Professional Blue",
    family: "Business",
    primaryColor: "#2563EB",
    accentColor: "#38BDF8",
    buttonColor: "#2563EB",
    surfaceStyle: "MODERN"
  },
  {
    key: "corporate-navy",
    label: "Corporate Navy",
    family: "Business",
    primaryColor: "#1D4ED8",
    accentColor: "#93C5FD",
    buttonColor: "#1E40AF",
    surfaceStyle: "PREMIUM"
  },
  {
    key: "executive-black",
    label: "Executive Black",
    family: "Business",
    primaryColor: "#111827",
    accentColor: "#CBD5E1",
    buttonColor: "#F8FAFC",
    surfaceStyle: "MINIMAL"
  },
  {
    key: "black-gold",
    label: "Black & Gold",
    family: "Business",
    primaryColor: "#D4AF5F",
    accentColor: "#F0CF88",
    buttonColor: "#D4AF5F",
    surfaceStyle: "PREMIUM"
  },
  {
    key: "creator-purple",
    label: "Creator Purple",
    family: "Creator",
    primaryColor: "#7C3AED",
    accentColor: "#C084FC",
    buttonColor: "#A855F7",
    surfaceStyle: "CREATOR"
  },
  {
    key: "creator-pink",
    label: "Creator Pink",
    family: "Creator",
    primaryColor: "#DB2777",
    accentColor: "#F9A8D4",
    buttonColor: "#EC4899",
    surfaceStyle: "CREATOR"
  },
  {
    key: "cyber-blue",
    label: "Cyber Blue",
    family: "Creator",
    primaryColor: "#0891B2",
    accentColor: "#67E8F9",
    buttonColor: "#06B6D4",
    surfaceStyle: "BOLD"
  },
  {
    key: "sunset-orange",
    label: "Sunset Orange",
    family: "Creator",
    primaryColor: "#EA580C",
    accentColor: "#FDBA74",
    buttonColor: "#F97316",
    surfaceStyle: "BOLD"
  },
  {
    key: "graphite",
    label: "Graphite",
    family: "Minimal",
    primaryColor: "#64748B",
    accentColor: "#CBD5E1",
    buttonColor: "#E2E8F0",
    surfaceStyle: "MINIMAL"
  },
  {
    key: "arctic",
    label: "Arctic",
    family: "Minimal",
    primaryColor: "#0EA5E9",
    accentColor: "#BAE6FD",
    buttonColor: "#38BDF8",
    surfaceStyle: "GLASS"
  },
  {
    key: "forest",
    label: "Forest",
    family: "Minimal",
    primaryColor: "#15803D",
    accentColor: "#86EFAC",
    buttonColor: "#22C55E",
    surfaceStyle: "MODERN"
  },
  {
    key: "midnight",
    label: "Midnight",
    family: "Minimal",
    primaryColor: "#4F46E5",
    accentColor: "#A5B4FC",
    buttonColor: "#6366F1",
    surfaceStyle: "PREMIUM"
  }
] as const satisfies readonly CircleCardThemePreset[];

export const DEFAULT_CIRCLE_CARD_THEME_PRESET_KEY = "black-gold";
export const DEFAULT_CIRCLE_CARD_THEME_PRESET =
  CIRCLE_CARD_THEME_PRESETS.find((preset) => preset.key === DEFAULT_CIRCLE_CARD_THEME_PRESET_KEY) ??
  CIRCLE_CARD_THEME_PRESETS[0];
export const CIRCLE_CARD_THEME_PRESET_KEYS = CIRCLE_CARD_THEME_PRESETS.map(
  (preset) => preset.key
) as [string, ...string[]];

export type CircleCardResolvedTheme = CircleCardThemeValues & {
  presetKey: string | null;
  presetLabel: string | null;
  presetFamily: CircleCardThemePreset["family"] | null;
  source: "preset" | "custom";
  primaryHsl: string;
  accentHsl: string;
  buttonHsl: string;
  buttonForegroundHsl: string;
};

export type CircleCardThemeInput = {
  themePrimaryColor?: string | null;
  themeAccentColor?: string | null;
  themeButtonColor?: string | null;
  themeSurfaceStyle?: string | null;
  themePreset?: string | null;
};

export type CircleCardThemeMetadata = {
  version: 1;
  source: "preset" | "custom";
  presetKey: string | null;
  presetFamily: CircleCardThemePreset["family"] | null;
  surfaceStyle: CircleCardThemeSurfaceStyle;
  discover: {
    primaryColor: string;
    accentColor: string;
    buttonColor: string;
    surfaceStyle: CircleCardThemeSurfaceStyle;
    presetKey: string | null;
  };
  future: {
    imageGenerationHookReady: boolean;
    families: CircleCardThemeFutureFamily[];
  };
};

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const SURFACE_TOKENS: Record<
  CircleCardThemeSurfaceStyle,
  {
    background: string;
    card: string;
    border: string;
    silver: string;
  }
> = {
  GLASS: {
    background: "222 58% 8%",
    card: "216 42% 13%",
    border: "212 32% 30%",
    silver: "210 24% 84%"
  },
  MODERN: {
    background: "224 48% 8%",
    card: "223 38% 12%",
    border: "220 30% 26%",
    silver: "214 20% 82%"
  },
  PREMIUM: {
    background: "222 58% 8%",
    card: "223 45% 12%",
    border: "222 34% 24%",
    silver: "214 18% 82%"
  },
  CREATOR: {
    background: "224 62% 7%",
    card: "225 48% 11%",
    border: "226 34% 27%",
    silver: "215 22% 84%"
  },
  MINIMAL: {
    background: "220 28% 9%",
    card: "220 22% 13%",
    border: "220 16% 28%",
    silver: "215 16% 80%"
  },
  BOLD: {
    background: "228 58% 7%",
    card: "229 48% 11%",
    border: "230 36% 30%",
    silver: "215 22% 86%"
  }
};

function normalizeHexColor(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();

  if (!trimmed || !HEX_COLOR_PATTERN.test(trimmed)) {
    return fallback;
  }

  return trimmed.toUpperCase();
}

export function isCircleCardThemeColor(value: string | null | undefined) {
  return Boolean(value && HEX_COLOR_PATTERN.test(value.trim()));
}

export function isCircleCardThemePresetKey(value: string | null | undefined) {
  return CIRCLE_CARD_THEME_PRESETS.some((preset) => preset.key === value);
}

export function resolveCircleCardThemePreset(value: string | null | undefined) {
  return CIRCLE_CARD_THEME_PRESETS.find((preset) => preset.key === value) ?? null;
}

export function resolveCircleCardThemeSurfaceStyle(
  value: string | null | undefined,
  fallback: CircleCardThemeSurfaceStyle = DEFAULT_CIRCLE_CARD_THEME_PRESET.surfaceStyle
): CircleCardThemeSurfaceStyle {
  const normalized = value?.trim().toUpperCase();

  return CIRCLE_CARD_THEME_SURFACE_STYLES.includes(normalized as CircleCardThemeSurfaceStyle)
    ? (normalized as CircleCardThemeSurfaceStyle)
    : fallback;
}

function hexToRgb(value: string) {
  const normalized = normalizeHexColor(value, DEFAULT_CIRCLE_CARD_THEME_PRESET.primaryColor).slice(1);

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function hexToHsl(value: string) {
  const { r, g, b } = hexToRgb(value);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  let saturation = 0;

  if (delta) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));

    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }
  }

  const normalizedHue = Math.round(hue < 0 ? hue + 360 : hue);
  return `${normalizedHue} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

function relativeLuminance(value: string) {
  const { r, g, b } = hexToRgb(value);
  const channels = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function buttonForegroundHsl(buttonColor: string) {
  return relativeLuminance(buttonColor) > 0.54 ? "222 58% 8%" : "210 43% 97%";
}

export function resolveCircleCardTheme(input: CircleCardThemeInput = {}): CircleCardResolvedTheme {
  const preset = resolveCircleCardThemePreset(input.themePreset);
  const base = preset ?? DEFAULT_CIRCLE_CARD_THEME_PRESET;
  const primaryColor = normalizeHexColor(input.themePrimaryColor, base.primaryColor);
  const accentColor = normalizeHexColor(input.themeAccentColor, base.accentColor);
  const buttonColor = normalizeHexColor(input.themeButtonColor, base.buttonColor);
  const surfaceStyle = resolveCircleCardThemeSurfaceStyle(input.themeSurfaceStyle, base.surfaceStyle);
  const hasCustomValues =
    !preset ||
    primaryColor !== preset.primaryColor ||
    accentColor !== preset.accentColor ||
    buttonColor !== preset.buttonColor ||
    surfaceStyle !== preset.surfaceStyle;

  return {
    primaryColor,
    accentColor,
    buttonColor,
    surfaceStyle,
    presetKey: hasCustomValues ? null : preset?.key ?? DEFAULT_CIRCLE_CARD_THEME_PRESET.key,
    presetLabel: hasCustomValues ? null : preset?.label ?? DEFAULT_CIRCLE_CARD_THEME_PRESET.label,
    presetFamily: hasCustomValues ? null : preset?.family ?? DEFAULT_CIRCLE_CARD_THEME_PRESET.family,
    source: hasCustomValues ? "custom" : "preset",
    primaryHsl: hexToHsl(primaryColor),
    accentHsl: hexToHsl(accentColor),
    buttonHsl: hexToHsl(buttonColor),
    buttonForegroundHsl: buttonForegroundHsl(buttonColor)
  };
}

export function buildCircleCardThemeMetadata(
  theme: CircleCardResolvedTheme
): CircleCardThemeMetadata {
  return {
    version: 1,
    source: theme.source,
    presetKey: theme.presetKey,
    presetFamily: theme.presetFamily,
    surfaceStyle: theme.surfaceStyle,
    discover: {
      primaryColor: theme.primaryColor,
      accentColor: theme.accentColor,
      buttonColor: theme.buttonColor,
      surfaceStyle: theme.surfaceStyle,
      presetKey: theme.presetKey
    },
    future: {
      imageGenerationHookReady: true,
      families: [...CIRCLE_CARD_THEME_FUTURE_FAMILIES]
    }
  };
}

export function buildCircleCardThemeStyle(theme: CircleCardResolvedTheme) {
  const surface = SURFACE_TOKENS[theme.surfaceStyle];

  return {
    "--cc-theme-primary-hsl": theme.primaryHsl,
    "--cc-theme-accent-hsl": theme.accentHsl,
    "--cc-theme-button-hsl": theme.buttonHsl,
    "--cc-theme-button-foreground-hsl": theme.buttonForegroundHsl,
    "--cc-theme-button-text": `hsl(${theme.buttonForegroundHsl})`,
    "--cc-theme-button-border": `hsl(${theme.accentHsl} / 0.48)`,
    "--cc-theme-button-bg": `linear-gradient(135deg, hsl(${theme.buttonHsl} / 0.98) 0%, hsl(${theme.accentHsl} / 0.94) 100%)`,
    "--cc-theme-button-shadow": `0 18px 44px hsl(${theme.buttonHsl} / 0.22)`,
    "--cc-theme-secondary-bg": `hsl(${surface.card} / 0.72)`,
    "--cc-theme-secondary-hover-bg": `hsl(${surface.card} / 0.9)`,
    "--cc-theme-secondary-border": `hsl(${theme.primaryHsl} / 0.3)`,
    "--cc-theme-secondary-shadow": `0 16px 38px hsl(${theme.primaryHsl} / 0.16)`,
    "--cc-theme-hero-shadow": `0 30px 90px rgba(0,0,0,0.48), 0 0 72px hsl(${theme.primaryHsl} / 0.12)`,
    "--cc-theme-page-bg": `radial-gradient(circle at 16% 0%, hsl(${theme.primaryHsl} / 0.24), transparent 30%), radial-gradient(circle at 82% 8%, hsl(${theme.accentHsl} / 0.2), transparent 28%), linear-gradient(180deg, hsl(${surface.background}) 0%, #08101f 48%, #030712 100%)`,
    "--cc-theme-hero-bg": `radial-gradient(circle at 18% 18%, hsl(${theme.accentHsl} / 0.24), transparent 26%), radial-gradient(circle at 78% 14%, hsl(${theme.primaryHsl} / 0.32), transparent 32%), linear-gradient(145deg, hsl(${surface.card} / 0.95), rgba(4,10,24,0.98))`,
    "--cc-theme-media-bg": `radial-gradient(circle at 20% 18%, hsl(${theme.primaryHsl} / 0.24), transparent 30%), radial-gradient(circle at 86% 20%, hsl(${theme.accentHsl} / 0.26), transparent 28%), linear-gradient(135deg, hsl(${surface.card} / 0.94), rgba(5,12,26,0.98))`,
    "--background": surface.background,
    "--card": surface.card,
    "--border": surface.border,
    "--silver": surface.silver,
    "--gold": "var(--cc-theme-accent-hsl)",
    "--primary": "var(--cc-theme-button-hsl)",
    "--ring": "var(--cc-theme-primary-hsl)",
    "--button-foreground": "var(--cc-theme-button-foreground-hsl)"
  };
}
