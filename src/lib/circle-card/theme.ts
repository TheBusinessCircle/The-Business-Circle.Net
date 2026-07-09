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
  studioTokens: CircleStudioTokens;
  fineTune: CircleStudioFineTune;
};

export type CircleCardThemeInput = {
  themePrimaryColor?: string | null;
  themeAccentColor?: string | null;
  themeButtonColor?: string | null;
  themeSurfaceStyle?: string | null;
  themePreset?: string | null;
  themeMetadata?: Prisma.JsonValue | unknown;
};

export type CircleCardLiveTheme = {
  theme: CircleCardResolvedTheme;
  style: ReturnType<typeof buildCircleCardThemeStyle>;
  attributes: ReturnType<typeof buildCircleStudioDataAttributes>;
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
  const buttonLuminance = relativeLuminance(buttonColor);
  const darkLuminance = relativeLuminance("#071126");
  const lightLuminance = relativeLuminance("#F7FAFC");
  const darkContrast = (Math.max(buttonLuminance, darkLuminance) + 0.05) /
    (Math.min(buttonLuminance, darkLuminance) + 0.05);
  const lightContrast = (Math.max(buttonLuminance, lightLuminance) + 0.05) /
    (Math.min(buttonLuminance, lightLuminance) + 0.05);
  return darkContrast >= lightContrast ? "222 58% 8%" : "210 43% 97%";
}

function isDefaultThemeColor(slot: keyof typeof CIRCLE_CARD_DEFAULT_THEME_COLORS, value: string) {
  return value === CIRCLE_CARD_DEFAULT_THEME_COLORS[slot];
}

export function resolveCircleCardTheme(input: CircleCardThemeInput = {}): CircleCardResolvedTheme {
  const studio = readCircleStudioMetadata(input.themeMetadata);
  const studioTokens = studio?.tokens ?? DEFAULT_CIRCLE_STUDIO_TOKENS;
  const studioAccent = CIRCLE_STUDIO_ACCENTS[studioTokens.accentPalette];
  const fineTune = studio?.fineTune ?? DEFAULT_CIRCLE_STUDIO_FINE_TUNE;
  const primaryColor = normalizeHexColor(
    fineTune.secondaryColor ?? studioAccent?.primary ?? input.themePrimaryColor,
    DEFAULT_CIRCLE_CARD_THEME_PRESET.primaryColor
  );
  const accentColor = normalizeHexColor(
    fineTune.accentColor ?? studioAccent?.accent ?? input.themeAccentColor,
    DEFAULT_CIRCLE_CARD_THEME_PRESET.accentColor
  );
  const buttonColor = normalizeHexColor(
    fineTune.accentColor ?? studioAccent?.button ?? input.themeButtonColor,
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
    buttonForegroundHsl: buttonForegroundHsl(buttonColor),
    studioTokens,
    fineTune
  };
}

export function resolveCircleStudioTokens(input: CircleCardThemeInput = {}): CircleStudioTokens {
  return readCircleStudioMetadata(input.themeMetadata)?.tokens ?? DEFAULT_CIRCLE_STUDIO_TOKENS;
}

export function resolveCircleStudioFineTune(input: CircleCardThemeInput = {}) {
  return readCircleStudioMetadata(input.themeMetadata)?.fineTune ?? DEFAULT_CIRCLE_STUDIO_FINE_TUNE;
}

export function buildCircleStudioDataAttributes(input: CircleCardThemeInput = {}) {
  const tokens = resolveCircleStudioTokens(input);
  const fineTune = resolveCircleStudioFineTune(input);
  return {
    "data-cc-identity": tokens.identityStyle.toLowerCase(),
    "data-cc-hero": tokens.heroLayout.toLowerCase().replaceAll("_", "-"),
    "data-cc-button": tokens.buttonStyle.toLowerCase().replaceAll("_", "-"),
    "data-cc-surface": tokens.cardSurface.toLowerCase().replaceAll("_", "-"),
    "data-cc-profile": tokens.profileFrame.toLowerCase().replaceAll("_", "-"),
    "data-cc-motion": tokens.motionProfile.toLowerCase().replaceAll("_", "-"),
    "data-cc-type": tokens.typographySystem.toLowerCase().replaceAll("_", "-"),
    "data-cc-qr": tokens.qrStyle.toLowerCase().replaceAll("_", "-"),
    "data-cc-entry": tokens.entryAnimation.toLowerCase().replaceAll("_", "-"),
    "data-cc-links": tokens.linkCardStyle.toLowerCase().replaceAll("_", "-"),
    "data-cc-icons": tokens.iconStyle.toLowerCase().replaceAll("_", "-"),
    "data-cc-background": tokens.backgroundTreatment.toLowerCase().replaceAll("_", "-"),
    "data-cc-divider": tokens.sectionDivider.toLowerCase().replaceAll("_", "-"),
    "data-cc-trust": tokens.trustStyle.toLowerCase().replaceAll("_", "-"),
    "data-cc-trust-presentation": tokens.trustPresentation.toLowerCase().replaceAll("_", "-"),
    "data-cc-fine-background": fineTune.backgroundStyle !== "PRESET" ? "true" : "false"
  } as const;
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

function circleStudioPresetBackground(theme: CircleCardResolvedTheme, surface: (typeof SURFACE_TOKENS)[CircleCardThemeSurfaceStyle]) {
  switch (theme.studioTokens.identityStyle) {
    case "EXECUTIVE":
      return `radial-gradient(circle at 92% 0%, hsl(${theme.accentHsl} / 0.18), transparent 30%), radial-gradient(circle at 0% 88%, hsl(${theme.primaryHsl} / 0.12), transparent 34%), linear-gradient(160deg, #04070d 0%, #111827 44%, #030712 100%)`;
    case "CORPORATE":
      return `linear-gradient(90deg, hsl(${theme.primaryHsl} / 0.18) 0 1px, transparent 1px 100%), radial-gradient(circle at 88% 4%, hsl(${theme.primaryHsl} / 0.34), transparent 32%), linear-gradient(180deg, #071126 0%, #04101f 48%, #030712 100%)`;
    case "LUXURY":
      return `radial-gradient(circle at 14% 4%, hsl(${theme.accentHsl} / 0.52), transparent 30%), radial-gradient(circle at 88% 14%, hsl(${theme.primaryHsl} / 0.34), transparent 36%), radial-gradient(circle at 50% 108%, hsl(${theme.accentHsl} / 0.2), transparent 34%), linear-gradient(135deg, #120d07 0%, #07070d 46%, #030712 100%)`;
    case "CREATOR":
      return `radial-gradient(circle at 8% 8%, hsl(${theme.primaryHsl} / 0.58), transparent 31%), radial-gradient(circle at 94% 5%, hsl(${theme.accentHsl} / 0.54), transparent 32%), radial-gradient(circle at 52% 108%, hsl(${theme.buttonHsl} / 0.34), transparent 38%), linear-gradient(150deg, #17091a 0%, #071126 46%, #030712 100%)`;
    case "FUTURE":
      return `radial-gradient(circle at 16% 0%, hsl(${theme.accentHsl} / 0.52), transparent 32%), radial-gradient(circle at 86% 18%, hsl(${theme.primaryHsl} / 0.46), transparent 34%), linear-gradient(115deg, rgba(45,212,255,.08) 0 1px, transparent 1px 18px), linear-gradient(160deg, #020617 0%, #061426 52%, #030712 100%)`;
    case "BOLD":
      return `radial-gradient(circle at 10% 0%, hsl(${theme.primaryHsl} / 0.62), transparent 36%), radial-gradient(circle at 86% 10%, hsl(${theme.accentHsl} / 0.44), transparent 34%), linear-gradient(150deg, #020617 0%, #0a1222 38%, #030712 100%)`;
    case "MINIMAL":
      return `radial-gradient(circle at 86% 0%, hsl(${theme.primaryHsl} / 0.16), transparent 34%), linear-gradient(180deg, #111827 0%, #071126 58%, #030712 100%)`;
    case "MODERN":
      break;
  }

  switch (theme.studioTokens.backgroundTreatment) {
    case "CORPORATE_CLEAN":
      return `radial-gradient(circle at 90% 0%, hsl(${theme.primaryHsl} / 0.26), transparent 34%), linear-gradient(180deg, #071126 0%, #030712 100%)`;
    case "GLASS_GLOW":
      return `radial-gradient(circle at 50% -8%, hsl(${theme.primaryHsl} / 0.52), transparent 42%), radial-gradient(circle at 8% 78%, hsl(${theme.accentHsl} / 0.24), transparent 30%), linear-gradient(180deg, #071126 0%, #030712 100%)`;
    case "LUXURY_MESH":
      return `radial-gradient(circle at 15% 8%, hsl(${theme.accentHsl} / 0.46), transparent 31%), radial-gradient(circle at 88% 18%, hsl(${theme.primaryHsl} / 0.34), transparent 34%), linear-gradient(135deg, #120d07 0%, #030712 100%)`;
    case "CREATOR_ENERGY":
      return `radial-gradient(circle at 8% 12%, hsl(${theme.primaryHsl} / 0.58), transparent 31%), radial-gradient(circle at 90% 6%, hsl(${theme.accentHsl} / 0.5), transparent 32%), radial-gradient(circle at 55% 110%, hsl(${theme.buttonHsl} / 0.32), transparent 34%), linear-gradient(160deg, #17091a 0%, #030712 100%)`;
    case "DARK_PREMIUM":
      return `radial-gradient(circle at 20% 0%, hsl(${theme.accentHsl} / 0.32), transparent 30%), radial-gradient(circle at 90% 12%, hsl(${theme.primaryHsl} / 0.2), transparent 32%), linear-gradient(155deg, #02040a 0%, #071126 52%, #030712 100%)`;
    case "AMBIENT_LIGHTING":
      return `radial-gradient(ellipse at 50% -10%, hsl(${theme.primaryHsl} / 0.62), transparent 45%), radial-gradient(circle at 90% 70%, hsl(${theme.accentHsl} / 0.32), transparent 28%), radial-gradient(circle at 8% 92%, hsl(${theme.buttonHsl} / 0.24), transparent 30%), #030712`;
    case "NOISE_TEXTURE":
      return `radial-gradient(circle at 20% 0%, hsl(${theme.primaryHsl} / 0.32), transparent 34%), radial-gradient(circle at 80% 18%, hsl(${theme.accentHsl} / 0.28), transparent 32%), linear-gradient(180deg, hsl(${surface.background}) 0%, #030712 100%)`;
    case "SUBTLE_GRADIENT":
    default:
      return `radial-gradient(circle at 16% 0%, hsl(${theme.primaryHsl} / 0.36), transparent 34%), radial-gradient(circle at 82% 8%, hsl(${theme.accentHsl} / 0.3), transparent 30%), linear-gradient(180deg, hsl(${surface.background}) 0%, #08101f 48%, #030712 100%)`;
  }
}

function circleStudioIdentityVisuals(theme: CircleCardResolvedTheme, surface: (typeof SURFACE_TOKENS)[CircleCardThemeSurfaceStyle]) {
  const base = {
    sectionBg: `linear-gradient(145deg, hsl(${surface.card} / 0.8), rgba(4,10,24,0.94))`,
    cardBg: `linear-gradient(145deg, hsl(${surface.card} / 0.7), hsl(${theme.primaryHsl} / 0.12))`,
    linkBg: `linear-gradient(145deg, hsl(${surface.card} / 0.76), hsl(${theme.accentHsl} / 0.1))`,
    trustBg: `linear-gradient(145deg, hsl(${surface.card} / 0.82), hsl(${theme.primaryHsl} / 0.12))`,
    qrBg: `linear-gradient(145deg, hsl(${surface.card} / 0.86), hsl(${theme.accentHsl} / 0.1))`,
    heroBg: `radial-gradient(circle at 18% 18%, hsl(${theme.accentHsl} / 0.3), transparent 28%), radial-gradient(circle at 78% 14%, hsl(${theme.primaryHsl} / 0.38), transparent 34%), linear-gradient(145deg, hsl(${surface.card} / 0.96), rgba(4,10,24,0.98))`,
    mediaBg: `radial-gradient(circle at 20% 18%, hsl(${theme.primaryHsl} / 0.3), transparent 30%), radial-gradient(circle at 86% 20%, hsl(${theme.accentHsl} / 0.32), transparent 28%), linear-gradient(135deg, hsl(${surface.card} / 0.94), rgba(5,12,26,0.98))`,
    buttonBg: `linear-gradient(135deg, hsl(${theme.buttonHsl} / 0.98) 0%, hsl(${theme.accentHsl} / 0.96) 100%)`,
    buttonBorder: `hsl(${theme.accentHsl} / 0.52)`,
    buttonShadow: `0 18px 44px hsl(${theme.buttonHsl} / 0.26)`,
    secondaryBorder: `hsl(${theme.primaryHsl} / 0.36)`,
    secondaryShadow: `0 16px 42px hsl(${theme.primaryHsl} / 0.18)`,
    iconBg: `hsl(${theme.accentHsl} / 0.16)`,
    heroShadow: `0 30px 90px rgba(0,0,0,0.5), 0 0 82px hsl(${theme.primaryHsl} / 0.16)`,
    heroLine: `linear-gradient(90deg, transparent, hsl(${theme.accentHsl} / 0.78), hsl(${theme.primaryHsl} / 0.56), transparent)`,
    profileShadow: `0 0 0 4px hsl(${theme.primaryHsl} / 0.2), 0 0 42px hsl(${theme.primaryHsl} / 0.24)`
  };

  switch (theme.studioTokens.identityStyle) {
    case "EXECUTIVE":
      return {
        ...base,
        sectionBg: `linear-gradient(145deg, rgba(15,23,42,.96), rgba(3,7,18,.98))`,
        cardBg: `linear-gradient(145deg, rgba(17,24,39,.94), rgba(6,10,18,.98))`,
        linkBg: `linear-gradient(135deg, rgba(15,23,42,.96), hsl(${theme.primaryHsl} / .14))`,
        trustBg: `linear-gradient(145deg, rgba(15,23,42,.98), rgba(6,10,18,.98))`,
        qrBg: `linear-gradient(145deg, rgba(17,24,39,.98), hsl(${theme.primaryHsl} / .1))`,
        heroBg: `linear-gradient(90deg, hsl(${theme.accentHsl} / .32) 0 .35rem, transparent .35rem 100%), radial-gradient(circle at 90% 0%, hsl(${theme.primaryHsl} / .18), transparent 30%), linear-gradient(145deg, rgba(17,24,39,.98), rgba(3,7,18,.99))`,
        buttonBg: `linear-gradient(180deg, hsl(${theme.buttonHsl} / .95), hsl(${theme.primaryHsl} / .72))`,
        buttonShadow: `0 14px 32px rgba(0,0,0,.32)`,
        secondaryBorder: `hsl(${theme.accentHsl} / .38)`,
        secondaryShadow: `0 18px 42px rgba(0,0,0,.32)`,
        iconBg: `linear-gradient(180deg, transparent, hsl(${theme.accentHsl} / .12))`
      };
    case "CORPORATE":
      return {
        ...base,
        sectionBg: `linear-gradient(145deg, hsl(${theme.primaryHsl} / .2), rgba(5,15,32,.96) 36%, rgba(3,7,18,.98))`,
        cardBg: `linear-gradient(145deg, rgba(8,20,42,.96), hsl(${theme.primaryHsl} / .14))`,
        linkBg: `linear-gradient(135deg, rgba(8,20,42,.96), hsl(${theme.primaryHsl} / .2))`,
        trustBg: `linear-gradient(145deg, hsl(${theme.primaryHsl} / .24), rgba(5,15,32,.98))`,
        qrBg: `linear-gradient(145deg, rgba(6,18,38,.98), hsl(${theme.primaryHsl} / .18))`,
        heroBg: `linear-gradient(90deg, hsl(${theme.primaryHsl} / .42) 0 .28rem, transparent .28rem 100%), radial-gradient(circle at 88% 10%, hsl(${theme.primaryHsl} / .34), transparent 34%), linear-gradient(145deg, #071426, #030712)`,
        buttonBg: `linear-gradient(135deg, hsl(${theme.buttonHsl} / .98), hsl(${theme.primaryHsl} / .82))`,
        secondaryBorder: `hsl(${theme.primaryHsl} / .46)`,
        secondaryShadow: `0 16px 36px hsl(${theme.primaryHsl} / .2)`
      };
    case "LUXURY":
      return {
        ...base,
        sectionBg: `linear-gradient(145deg, hsl(${theme.accentHsl} / .17), rgba(18,13,7,.88) 38%, rgba(3,7,18,.96))`,
        cardBg: `linear-gradient(145deg, hsl(${theme.accentHsl} / .18), rgba(255,255,255,.075) 38%, rgba(9,8,13,.94))`,
        linkBg: `linear-gradient(135deg, hsl(${theme.accentHsl} / .18), rgba(18,13,7,.9) 50%, hsl(${theme.primaryHsl} / .14))`,
        trustBg: `radial-gradient(circle at 18% 0%, hsl(${theme.accentHsl} / .28), transparent 36%), linear-gradient(145deg, rgba(22,16,8,.94), rgba(5,7,14,.98))`,
        qrBg: `linear-gradient(145deg, hsl(${theme.accentHsl} / .2), rgba(6,7,14,.96))`,
        heroBg: `radial-gradient(circle at 18% 12%, hsl(${theme.accentHsl} / .45), transparent 30%), radial-gradient(circle at 86% 8%, hsl(${theme.primaryHsl} / .28), transparent 34%), linear-gradient(145deg, rgba(22,16,8,.94), rgba(3,7,18,.98))`,
        mediaBg: `radial-gradient(circle at 22% 18%, hsl(${theme.accentHsl} / .4), transparent 32%), linear-gradient(135deg, rgba(22,16,8,.95), rgba(3,7,18,.98))`,
        buttonBg: `linear-gradient(115deg, hsl(${theme.buttonHsl} / .98), hsl(${theme.accentHsl} / .98) 45%, hsl(${theme.buttonHsl} / .88))`,
        buttonBorder: `hsl(${theme.accentHsl} / .74)`,
        buttonShadow: `0 20px 52px hsl(${theme.accentHsl} / .28), inset 0 1px 0 rgba(255,255,255,.18)`,
        secondaryBorder: `hsl(${theme.accentHsl} / .48)`,
        secondaryShadow: `0 24px 68px rgba(0,0,0,.42), inset 0 1px 0 hsl(${theme.accentHsl} / .18)`,
        iconBg: `linear-gradient(145deg, hsl(${theme.accentHsl} / .24), rgba(255,255,255,.06))`,
        heroShadow: `0 34px 100px rgba(0,0,0,.55), 0 0 90px hsl(${theme.accentHsl} / .2)`,
        heroLine: `linear-gradient(90deg, transparent, hsl(${theme.accentHsl} / .95), rgba(255,255,255,.42), hsl(${theme.accentHsl} / .7), transparent)`,
        profileShadow: `0 0 0 2px hsl(${theme.accentHsl} / .9), 0 0 0 8px hsl(${theme.accentHsl} / .12), 0 22px 58px rgba(0,0,0,.5)`
      };
    case "CREATOR":
      return {
        ...base,
        sectionBg: `radial-gradient(circle at 0% 0%, hsl(${theme.primaryHsl} / .22), transparent 34%), linear-gradient(145deg, rgba(24,14,34,.84), rgba(5,12,26,.9))`,
        cardBg: `linear-gradient(145deg, hsl(${theme.primaryHsl} / .18), hsl(${theme.accentHsl} / .14), rgba(5,12,26,.9))`,
        linkBg: `linear-gradient(135deg, hsl(${theme.primaryHsl} / .26), hsl(${theme.accentHsl} / .2), rgba(5,12,26,.86))`,
        trustBg: `radial-gradient(circle at 90% 0%, hsl(${theme.accentHsl} / .26), transparent 34%), linear-gradient(145deg, rgba(24,14,34,.88), rgba(5,12,26,.94))`,
        qrBg: `linear-gradient(145deg, hsl(${theme.accentHsl} / .2), hsl(${theme.primaryHsl} / .14), rgba(5,12,26,.94))`,
        heroBg: `radial-gradient(circle at 12% 12%, hsl(${theme.primaryHsl} / .48), transparent 33%), radial-gradient(circle at 88% 8%, hsl(${theme.accentHsl} / .44), transparent 34%), linear-gradient(145deg, rgba(24,14,34,.88), rgba(5,12,26,.94))`,
        mediaBg: `radial-gradient(circle at 16% 14%, hsl(${theme.primaryHsl} / .44), transparent 34%), radial-gradient(circle at 88% 20%, hsl(${theme.accentHsl} / .42), transparent 32%), linear-gradient(135deg, rgba(24,14,34,.9), rgba(5,12,26,.94))`,
        buttonBg: `linear-gradient(135deg, hsl(${theme.primaryHsl}), hsl(${theme.accentHsl}) 52%, hsl(${theme.buttonHsl}))`,
        buttonShadow: `0 20px 46px hsl(${theme.primaryHsl} / .32), 0 0 44px hsl(${theme.accentHsl} / .22)`,
        secondaryBorder: `hsl(${theme.accentHsl} / .42)`,
        secondaryShadow: `0 24px 56px hsl(${theme.primaryHsl} / .18)`,
        iconBg: `linear-gradient(135deg, hsl(${theme.primaryHsl} / .28), hsl(${theme.accentHsl} / .2))`,
        heroShadow: `0 30px 88px rgba(0,0,0,.42), 0 0 80px hsl(${theme.primaryHsl} / .24)`,
        profileShadow: `0 0 0 4px hsl(${theme.primaryHsl} / .25), 0 0 0 9px hsl(${theme.accentHsl} / .12), 0 0 58px hsl(${theme.accentHsl} / .34)`
      };
    case "FUTURE":
      return {
        ...base,
        sectionBg: `linear-gradient(145deg, hsl(${theme.primaryHsl} / .2), rgba(3,12,26,.92) 42%, rgba(2,6,23,.98))`,
        cardBg: `linear-gradient(145deg, hsl(${theme.primaryHsl} / .18), rgba(45,212,255,.08), rgba(3,7,18,.96))`,
        linkBg: `linear-gradient(135deg, hsl(${theme.primaryHsl} / .24), rgba(45,212,255,.1), rgba(2,6,23,.96))`,
        trustBg: `radial-gradient(circle at 86% 0%, hsl(${theme.accentHsl} / .3), transparent 34%), linear-gradient(145deg, rgba(3,12,26,.94), rgba(2,6,23,.98))`,
        qrBg: `linear-gradient(145deg, hsl(${theme.primaryHsl} / .22), rgba(45,212,255,.1), rgba(2,6,23,.98))`,
        heroBg: `radial-gradient(circle at 12% 0%, hsl(${theme.accentHsl} / .5), transparent 32%), radial-gradient(circle at 88% 10%, hsl(${theme.primaryHsl} / .48), transparent 36%), linear-gradient(145deg, rgba(3,12,26,.94), rgba(2,6,23,.99))`,
        mediaBg: `linear-gradient(135deg, hsl(${theme.primaryHsl} / .28), rgba(45,212,255,.09), rgba(2,6,23,.98))`,
        buttonBg: `linear-gradient(135deg, hsl(${theme.primaryHsl} / .38), hsl(${theme.accentHsl} / .32))`,
        buttonBorder: `hsl(${theme.accentHsl} / .72)`,
        buttonShadow: `0 0 0 1px hsl(${theme.accentHsl} / .32), 0 0 48px hsl(${theme.primaryHsl} / .34)`,
        secondaryBorder: `hsl(${theme.accentHsl} / .44)`,
        secondaryShadow: `0 22px 60px hsl(${theme.primaryHsl} / .22), 0 0 50px hsl(${theme.accentHsl} / .14)`,
        iconBg: `linear-gradient(145deg, hsl(${theme.accentHsl} / .22), hsl(${theme.primaryHsl} / .16))`,
        heroShadow: `0 34px 96px rgba(0,0,0,.52), 0 0 96px hsl(${theme.accentHsl} / .22)`,
        heroLine: `linear-gradient(90deg, transparent, hsl(${theme.accentHsl} / .95), hsl(${theme.primaryHsl} / .72), transparent)`,
        profileShadow: `0 0 0 3px hsl(${theme.accentHsl} / .5), 0 0 56px hsl(${theme.primaryHsl} / .58)`
      };
    case "BOLD":
      return {
        ...base,
        sectionBg: `linear-gradient(145deg, hsl(${theme.primaryHsl} / .26), rgba(3,7,18,.98) 48%)`,
        cardBg: `linear-gradient(145deg, hsl(${theme.primaryHsl} / .24), rgba(3,7,18,.98))`,
        linkBg: `linear-gradient(135deg, hsl(${theme.primaryHsl} / .32), rgba(3,7,18,.96))`,
        trustBg: `linear-gradient(145deg, hsl(${theme.primaryHsl} / .3), rgba(3,7,18,.98))`,
        qrBg: `linear-gradient(145deg, hsl(${theme.accentHsl} / .18), hsl(${theme.primaryHsl} / .18), rgba(3,7,18,.98))`,
        heroBg: `radial-gradient(circle at 10% 0%, hsl(${theme.primaryHsl} / .58), transparent 34%), linear-gradient(145deg, rgba(2,6,23,.96), rgba(3,7,18,.99))`,
        buttonBg: `linear-gradient(135deg, hsl(${theme.buttonHsl}), hsl(${theme.accentHsl}))`,
        buttonBorder: `hsl(${theme.accentHsl} / .7)`,
        buttonShadow: `0 22px 48px hsl(${theme.primaryHsl} / .34)`,
        secondaryBorder: `hsl(${theme.accentHsl} / .5)`,
        secondaryShadow: `0 18px 42px rgba(0,0,0,.36)`,
        iconBg: `hsl(${theme.buttonHsl} / .95)`,
        profileShadow: `0 0 0 5px hsl(${theme.primaryHsl} / .32), 0 16px 44px rgba(0,0,0,.45)`
      };
    case "MINIMAL":
      return {
        ...base,
        sectionBg: `linear-gradient(180deg, rgba(15,23,42,.82), rgba(3,7,18,.9))`,
        cardBg: `rgba(15,23,42,.56)`,
        linkBg: `rgba(15,23,42,.34)`,
        trustBg: `rgba(15,23,42,.5)`,
        qrBg: `rgba(15,23,42,.58)`,
        heroBg: `linear-gradient(180deg, rgba(15,23,42,.78), rgba(3,7,18,.92))`,
        mediaBg: `rgba(15,23,42,.52)`,
        buttonBg: `transparent`,
        buttonBorder: `hsl(${theme.accentHsl} / .58)`,
        buttonShadow: `none`,
        secondaryBorder: `hsl(${theme.accentHsl} / .18)`,
        secondaryShadow: `0 10px 28px rgba(0,0,0,.18)`,
        iconBg: `transparent`,
        heroShadow: `0 16px 48px rgba(0,0,0,.24)`,
        heroLine: `linear-gradient(90deg, transparent, hsl(${theme.accentHsl} / .36), transparent)`,
        profileShadow: `0 0 0 1px hsl(${theme.accentHsl} / .3)`
      };
    case "MODERN":
    default:
      return base;
  }
}

export function buildCircleCardThemeStyle(theme: CircleCardResolvedTheme) {
  const surface = SURFACE_TOKENS[theme.surfaceStyle];
  const escapedBackgroundImage = theme.fineTune.backgroundImageUrl
    ?.replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replace(/[\r\n]/g, "");
  const presetBackground = circleStudioPresetBackground(theme, surface);
  const visuals = circleStudioIdentityVisuals(theme, surface);
  const imageOverlayStart = Math.max(0.34, theme.fineTune.backgroundOverlay - 0.24);
  const imageOverlayEnd = Math.min(0.74, Math.max(0.42, theme.fineTune.backgroundOverlay - 0.06));
  const pageBackground =
    theme.fineTune.backgroundStyle === "IMAGE" && escapedBackgroundImage
      ? `linear-gradient(rgba(3,7,18,${imageOverlayStart}), rgba(3,7,18,${imageOverlayEnd})), url("${escapedBackgroundImage}") center / cover no-repeat, ${presetBackground}`
      : theme.fineTune.backgroundStyle === "DEEP_GRADIENT"
        ? `radial-gradient(circle at 10% 0%, hsl(${theme.primaryHsl} / 0.58), transparent 40%), radial-gradient(circle at 92% 12%, hsl(${theme.accentHsl} / 0.38), transparent 34%), linear-gradient(145deg, #02040a, hsl(${surface.background}) 54%, #030712)`
        : theme.fineTune.backgroundStyle === "SOFT_GLOW"
          ? `radial-gradient(ellipse at 50% -8%, hsl(${theme.accentHsl} / 0.52), transparent 46%), radial-gradient(circle at 90% 65%, hsl(${theme.primaryHsl} / 0.28), transparent 30%), #030712`
          : presetBackground;
  const cardSurface =
    theme.studioTokens.cardSurface === "CLASSIC"
      ? `hsl(${surface.card} / 0.82)`
      : theme.studioTokens.cardSurface === "MATTE"
        ? `linear-gradient(145deg, hsl(${surface.card} / 0.96), rgba(4,10,24,0.98))`
        : theme.studioTokens.cardSurface === "METAL"
          ? `linear-gradient(145deg, hsl(${theme.primaryHsl} / 0.18), rgba(255,255,255,0.075) 42%, rgba(4,10,24,0.97) 72%)`
          : theme.studioTokens.cardSurface === "LUXURY"
            ? `linear-gradient(145deg, hsl(${theme.accentHsl} / 0.13), hsl(${surface.card} / 0.9) 42%, rgba(4,10,24,0.98))`
            : theme.studioTokens.cardSurface === "GLASS"
              ? `linear-gradient(145deg, hsl(${surface.card} / 0.66), hsl(${theme.primaryHsl} / 0.13))`
              : `linear-gradient(145deg, hsl(${surface.card} / 0.78), rgba(4,10,24,0.94))`;

  return {
    "--cc-bg-image": escapedBackgroundImage ? `url("${escapedBackgroundImage}")` : "none",
    "--cc-bg-overlay": String(theme.fineTune.backgroundOverlay),
    "--cc-theme-primary-hsl": theme.primaryHsl,
    "--cc-theme-accent-hsl": theme.accentHsl,
    "--cc-theme-button-hsl": theme.buttonHsl,
    "--cc-theme-button-foreground-hsl": theme.buttonForegroundHsl,
    "--cc-theme-button-text": `hsl(${theme.buttonForegroundHsl})`,
    "--cc-theme-button-border": visuals.buttonBorder,
    "--cc-theme-button-bg": visuals.buttonBg,
    "--cc-theme-button-shadow": visuals.buttonShadow,
    "--cc-theme-secondary-bg": cardSurface,
    "--cc-theme-secondary-hover-bg": `hsl(${surface.card} / 0.96)`,
    "--cc-theme-secondary-border": visuals.secondaryBorder,
    "--cc-theme-secondary-shadow": visuals.secondaryShadow,
    "--cc-theme-section-bg": visuals.sectionBg,
    "--cc-theme-card-bg": visuals.cardBg,
    "--cc-theme-link-bg": visuals.linkBg,
    "--cc-theme-trust-bg": visuals.trustBg,
    "--cc-theme-qr-bg": visuals.qrBg,
    "--cc-theme-icon-bg": visuals.iconBg,
    "--cc-theme-hero-shadow": visuals.heroShadow,
    "--cc-theme-profile-shadow": visuals.profileShadow,
    "--cc-theme-page-bg": pageBackground,
    "--cc-theme-hero-bg": visuals.heroBg,
    "--cc-theme-media-bg": visuals.mediaBg,
    "--cc-theme-hero-line": visuals.heroLine,
    "--cc-theme-accent-badge-bg": `hsl(${theme.accentHsl} / 0.16)`,
    "--cc-theme-accent-badge-border": `hsl(${theme.accentHsl} / 0.34)`,
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

export function resolveCircleCardLiveTheme(input: CircleCardThemeInput = {}): CircleCardLiveTheme {
  const theme = resolveCircleCardTheme(input);

  return {
    theme,
    style: buildCircleCardThemeStyle(theme),
    attributes: buildCircleStudioDataAttributes(input)
  };
}
import type { Prisma } from "@prisma/client";
import {
  CIRCLE_STUDIO_ACCENTS,
  DEFAULT_CIRCLE_STUDIO_FINE_TUNE,
  DEFAULT_CIRCLE_STUDIO_TOKENS,
  readCircleStudioMetadata,
  type CircleStudioFineTune,
  type CircleStudioTokens
} from "@/lib/circle-card/identity-engine";
