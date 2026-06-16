export const CIRCLE_CARD_THEME_SURFACE_STYLES = ["PREMIUM"] as const;

export type CircleCardThemeSurfaceStyle = (typeof CIRCLE_CARD_THEME_SURFACE_STYLES)[number];

export const CIRCLE_CARD_THEME_SURFACE_STYLE_COPY: Record<
  CircleCardThemeSurfaceStyle,
  {
    label: string;
    description: string;
  }
> = {
  PREMIUM: {
    label: "Premium",
    description: "The default dark Circle Card surface with controlled glow and polished borders."
  }
};

export const CIRCLE_CARD_THEME_PRESET_FAMILIES = [
  "CUSTOM",
  "BRAND",
  "FOOTBALL",
  "COUNTRY",
  "SECTOR",
  "PERSONALITY"
] as const;

export type CircleCardThemePresetFamily = (typeof CIRCLE_CARD_THEME_PRESET_FAMILIES)[number];

export const CIRCLE_CARD_THEME_FUTURE_FAMILIES = CIRCLE_CARD_THEME_PRESET_FAMILIES;

export type CircleCardThemeFutureFamily = CircleCardThemePresetFamily;

export type CircleCardThemeValues = {
  primaryColor: string;
  accentColor: string;
  buttonColor: string;
  surfaceStyle: CircleCardThemeSurfaceStyle;
};

export type CircleCardThemePreset = CircleCardThemeValues & {
  key: string;
  label: string;
  family: CircleCardThemePresetFamily;
};

export const DEFAULT_CIRCLE_CARD_THEME_PRESET_KEY = "CUSTOM";

export const DEFAULT_CIRCLE_CARD_THEME_PRESET = {
  key: DEFAULT_CIRCLE_CARD_THEME_PRESET_KEY,
  label: "Custom",
  family: "CUSTOM",
  primaryColor: "#D4AF5F",
  accentColor: "#F0CF88",
  buttonColor: "#D4AF5F",
  surfaceStyle: "PREMIUM"
} as const satisfies CircleCardThemePreset;

export const CIRCLE_CARD_DEFAULT_THEME_COLORS = {
  primaryColor: DEFAULT_CIRCLE_CARD_THEME_PRESET.primaryColor,
  accentColor: DEFAULT_CIRCLE_CARD_THEME_PRESET.accentColor,
  buttonColor: DEFAULT_CIRCLE_CARD_THEME_PRESET.buttonColor
} as const;

export const CIRCLE_CARD_THEME_PRESETS = [] as const satisfies readonly CircleCardThemePreset[];

export const CIRCLE_CARD_THEME_PRESET_KEYS = CIRCLE_CARD_THEME_PRESET_FAMILIES;

export type CircleCardResolvedTheme = CircleCardThemeValues & {
  presetKey: string | null;
  presetLabel: string | null;
  presetFamily: CircleCardThemePresetFamily | null;
  source: "default" | "custom";
  hasCustomColors: boolean;
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
  source: "default" | "custom";
  presetKey: string | null;
  presetFamily: CircleCardThemePresetFamily | null;
  surfaceStyle: CircleCardThemeSurfaceStyle;
  discover: {
    primaryColor: string;
    accentColor: string;
    buttonColor: string;
    surfaceStyle: CircleCardThemeSurfaceStyle;
    presetKey: string | null;
  };
  future: {
    presetFamilies: CircleCardThemePresetFamily[];
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
  PREMIUM: {
    background: "222 58% 8%",
    card: "223 45% 12%",
    border: "222 34% 24%",
    silver: "214 18% 82%"
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
  const normalized = value?.trim().toUpperCase();

  return Boolean(
    normalized && CIRCLE_CARD_THEME_PRESET_KEYS.includes(normalized as CircleCardThemePresetFamily)
  );
}

export function resolveCircleCardThemePreset(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();

  if (!normalized || !isCircleCardThemePresetKey(normalized)) {
    return null;
  }

  return {
    ...DEFAULT_CIRCLE_CARD_THEME_PRESET,
    key: normalized,
    label: normalized[0] + normalized.slice(1).toLowerCase(),
    family: normalized as CircleCardThemePresetFamily
  } satisfies CircleCardThemePreset;
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
  const normalized = normalizeHexColor(
    value,
    DEFAULT_CIRCLE_CARD_THEME_PRESET.primaryColor
  ).slice(1);

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

function isDefaultThemeColor(slot: keyof typeof CIRCLE_CARD_DEFAULT_THEME_COLORS, value: string) {
  return value === CIRCLE_CARD_DEFAULT_THEME_COLORS[slot];
}

export function resolveCircleCardTheme(input: CircleCardThemeInput = {}): CircleCardResolvedTheme {
  const primaryColor = normalizeHexColor(
    input.themePrimaryColor,
    DEFAULT_CIRCLE_CARD_THEME_PRESET.primaryColor
  );
  const accentColor = normalizeHexColor(
    input.themeAccentColor,
    DEFAULT_CIRCLE_CARD_THEME_PRESET.accentColor
  );
  const buttonColor = normalizeHexColor(
    input.themeButtonColor,
    DEFAULT_CIRCLE_CARD_THEME_PRESET.buttonColor
  );
  const surfaceStyle = resolveCircleCardThemeSurfaceStyle(input.themeSurfaceStyle);
  const hasCustomColors =
    !isDefaultThemeColor("primaryColor", primaryColor) ||
    !isDefaultThemeColor("accentColor", accentColor) ||
    !isDefaultThemeColor("buttonColor", buttonColor);

  return {
    primaryColor,
    accentColor,
    buttonColor,
    surfaceStyle,
    presetKey: null,
    presetLabel: null,
    presetFamily: null,
    source: hasCustomColors ? "custom" : "default",
    hasCustomColors,
    primaryHsl: hexToHsl(primaryColor),
    accentHsl: hexToHsl(accentColor),
    buttonHsl: hexToHsl(buttonColor),
    buttonForegroundHsl: buttonForegroundHsl(buttonColor)
  };
}

export function buildCircleCardThemeStorage(input: CircleCardThemeInput = {}) {
  const theme = resolveCircleCardTheme(input);

  return {
    theme,
    values: {
      themePrimaryColor: isDefaultThemeColor("primaryColor", theme.primaryColor)
        ? null
        : theme.primaryColor,
      themeAccentColor: isDefaultThemeColor("accentColor", theme.accentColor)
        ? null
        : theme.accentColor,
      themeButtonColor: isDefaultThemeColor("buttonColor", theme.buttonColor)
        ? null
        : theme.buttonColor,
      themeSurfaceStyle: theme.surfaceStyle,
      themePreset: null
    }
  };
}

export function buildCircleCardThemeMetadata(
  theme: CircleCardResolvedTheme
): CircleCardThemeMetadata {
  return {
    version: 1,
    source: theme.source,
    presetKey: null,
    presetFamily: null,
    surfaceStyle: theme.surfaceStyle,
    discover: {
      primaryColor: theme.primaryColor,
      accentColor: theme.accentColor,
      buttonColor: theme.buttonColor,
      surfaceStyle: theme.surfaceStyle,
      presetKey: null
    },
    future: {
      presetFamilies: [...CIRCLE_CARD_THEME_PRESET_FAMILIES]
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
    "--cc-theme-secondary-border": `hsl(${theme.primaryHsl} / 0.32)`,
    "--cc-theme-secondary-shadow": `0 16px 38px hsl(${theme.primaryHsl} / 0.16)`,
    "--cc-theme-hero-shadow": `0 30px 90px rgba(0,0,0,0.48), 0 0 72px hsl(${theme.primaryHsl} / 0.12)`,
    "--cc-theme-page-bg": `radial-gradient(circle at 16% 0%, hsl(${theme.primaryHsl} / 0.24), transparent 30%), radial-gradient(circle at 82% 8%, hsl(${theme.accentHsl} / 0.2), transparent 28%), linear-gradient(180deg, hsl(${surface.background}) 0%, #08101f 48%, #030712 100%)`,
    "--cc-theme-hero-bg": `radial-gradient(circle at 18% 18%, hsl(${theme.accentHsl} / 0.24), transparent 26%), radial-gradient(circle at 78% 14%, hsl(${theme.primaryHsl} / 0.32), transparent 32%), linear-gradient(145deg, hsl(${surface.card} / 0.95), rgba(4,10,24,0.98))`,
    "--cc-theme-media-bg": `radial-gradient(circle at 20% 18%, hsl(${theme.primaryHsl} / 0.24), transparent 30%), radial-gradient(circle at 86% 20%, hsl(${theme.accentHsl} / 0.26), transparent 28%), linear-gradient(135deg, hsl(${surface.card} / 0.94), rgba(5,12,26,0.98))`,
    "--cc-theme-hero-line": `linear-gradient(90deg, transparent, hsl(${theme.accentHsl} / 0.74), hsl(${theme.primaryHsl} / 0.5), transparent)`,
    "--cc-theme-accent-badge-bg": `hsl(${theme.accentHsl} / 0.12)`,
    "--cc-theme-accent-badge-border": `hsl(${theme.accentHsl} / 0.28)`,
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
