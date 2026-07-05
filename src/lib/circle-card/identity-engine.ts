import type { Prisma } from "@prisma/client";

export const CIRCLE_STUDIO_VERSION = 2 as const;

export const CIRCLE_STUDIO_OPTIONS = {
  identityStyle: ["EXECUTIVE", "CORPORATE", "MODERN", "LUXURY", "BOLD", "MINIMAL", "CREATOR", "FUTURE"],
  heroLayout: ["CENTERED", "LEFT_ALIGNED", "BUSINESS_FIRST", "CREATOR_FIRST", "LARGE_PORTRAIT", "MINIMAL", "PREMIUM", "MODERN_SPLIT"],
  buttonStyle: ["ROUNDED", "SQUARE", "PILL", "GLASS", "OUTLINE", "FILLED", "LUXURY"],
  cardSurface: ["CLASSIC", "SOFT", "GLASS", "LUXURY", "MATTE", "METAL"],
  profileFrame: ["CIRCLE", "ROUNDED_SQUARE", "SOFT_SQUARE", "PREMIUM_RING", "LUXURY_RING", "TRUST_RING", "GLOW_RING", "ANIMATED_RING"],
  accentPalette: ["PROFESSIONAL_BLUE", "ELECTRIC_BLUE", "ROYAL_BLUE", "GRAPHITE", "GOLD", "EMERALD", "FOREST", "OCEAN", "RUBY", "COPPER", "SUNSET"],
  typographySystem: ["CLASSIC", "MODERN", "PREMIUM"],
  motionProfile: ["MINIMAL", "BALANCED", "PREMIUM", "EXPRESSIVE", "REDUCED_MOTION"],
  qrStyle: ["CLASSIC", "ROUNDED", "DOTS", "LUXURY", "PREMIUM_BORDER", "LOGO_CENTRE"],
  entryAnimation: ["FADE", "LIFT", "SCALE", "SLIDE", "LUXURY_REVEAL", "CREATOR_REVEAL", "PROFESSIONAL_REVEAL"],
  trustStyle: ["CORPORATE", "CREATOR", "LUXURY", "MODERN", "FUTURE"],
  linkCardStyle: ["MINIMAL", "GLASS", "CORPORATE", "LUXURY", "CREATOR", "BOLD"],
  iconStyle: ["OUTLINE", "FILLED", "ROUNDED", "PREMIUM"],
  backgroundTreatment: ["SUBTLE_GRADIENT", "GLASS_GLOW", "LUXURY_MESH", "CORPORATE_CLEAN", "CREATOR_ENERGY", "DARK_PREMIUM", "AMBIENT_LIGHTING", "NOISE_TEXTURE"],
  sectionDivider: ["MINIMAL", "LUXURY", "MODERN", "CREATOR", "CORPORATE"],
  trustPresentation: ["COMPACT", "PROFESSIONAL", "CREATOR", "LUXURY"]
} as const;

export type CircleStudioTokenKey = keyof typeof CIRCLE_STUDIO_OPTIONS;
export type CircleStudioTokens = {
  [K in CircleStudioTokenKey]: (typeof CIRCLE_STUDIO_OPTIONS)[K][number];
};

export type CircleStudioOption = {
  value: string;
  label: string;
  description: string;
};

export type CircleStudioPreset = {
  key: CircleStudioTokens["identityStyle"];
  label: string;
  description: string;
  bestFor: string;
  characteristics: string[];
  tokens: CircleStudioTokens;
};

export type CircleStudioMetadata = {
  version: 2;
  source: "circle-studio";
  collection: "CORE" | string;
  tokens: CircleStudioTokens;
};

export const CIRCLE_STUDIO_ACCENTS = {
  PROFESSIONAL_BLUE: { label: "Professional Blue", primary: "#2867D7", accent: "#78A8FF", button: "#2867D7" },
  ELECTRIC_BLUE: { label: "Electric Blue", primary: "#176BFF", accent: "#62D7FF", button: "#176BFF" },
  ROYAL_BLUE: { label: "Royal Blue", primary: "#3949AB", accent: "#8C9EFF", button: "#4B59C7" },
  GRAPHITE: { label: "Graphite", primary: "#667085", accent: "#D0D5DD", button: "#475467" },
  GOLD: { label: "Gold", primary: "#D4AF5F", accent: "#F0CF88", button: "#C99A3D" },
  EMERALD: { label: "Emerald", primary: "#059669", accent: "#6EE7B7", button: "#059669" },
  FOREST: { label: "Forest", primary: "#287052", accent: "#86C8A5", button: "#287052" },
  OCEAN: { label: "Ocean", primary: "#087E8B", accent: "#62D4D8", button: "#087E8B" },
  RUBY: { label: "Ruby", primary: "#BE3455", accent: "#FF8CA4", button: "#BE3455" },
  COPPER: { label: "Copper", primary: "#B56A3A", accent: "#E6A477", button: "#A95D31" },
  SUNSET: { label: "Sunset", primary: "#E45B5B", accent: "#FFB36B", button: "#D94D62" }
} as const;

const base: Omit<CircleStudioTokens, "identityStyle"> = {
  heroLayout: "MODERN_SPLIT",
  buttonStyle: "ROUNDED",
  cardSurface: "SOFT",
  profileFrame: "PREMIUM_RING",
  accentPalette: "PROFESSIONAL_BLUE",
  typographySystem: "MODERN",
  motionProfile: "BALANCED",
  qrStyle: "ROUNDED",
  entryAnimation: "LIFT",
  trustStyle: "MODERN",
  linkCardStyle: "GLASS",
  iconStyle: "ROUNDED",
  backgroundTreatment: "SUBTLE_GRADIENT",
  sectionDivider: "MODERN",
  trustPresentation: "PROFESSIONAL"
};

function preset(
  key: CircleStudioTokens["identityStyle"],
  copy: Omit<CircleStudioPreset, "key" | "tokens">,
  overrides: Partial<CircleStudioTokens>
): CircleStudioPreset {
  return { key, ...copy, tokens: { ...base, ...overrides, identityStyle: key } };
}

export const CIRCLE_STUDIO_PRESETS: readonly CircleStudioPreset[] = [
  preset("EXECUTIVE", { label: "Executive", description: "Quiet authority with disciplined spacing and premium confidence.", bestFor: "Business owners, directors, consultants and professionals", characteristics: ["Square edges", "Strong typography", "Subtle motion"] }, { heroLayout: "BUSINESS_FIRST", buttonStyle: "SQUARE", cardSurface: "MATTE", profileFrame: "TRUST_RING", accentPalette: "GRAPHITE", typographySystem: "PREMIUM", motionProfile: "MINIMAL", entryAnimation: "PROFESSIONAL_REVEAL", trustStyle: "CORPORATE", linkCardStyle: "CORPORATE", iconStyle: "OUTLINE", backgroundTreatment: "CORPORATE_CLEAN", sectionDivider: "CORPORATE" }),
  preset("CORPORATE", { label: "Corporate", description: "Structured, credible and built for polished business presentation.", bestFor: "Teams, agencies, finance and professional services", characteristics: ["Clear hierarchy", "Crisp surfaces", "Trust first"] }, { heroLayout: "LEFT_ALIGNED", buttonStyle: "FILLED", cardSurface: "CLASSIC", profileFrame: "ROUNDED_SQUARE", accentPalette: "ROYAL_BLUE", motionProfile: "MINIMAL", trustStyle: "CORPORATE", linkCardStyle: "CORPORATE", iconStyle: "OUTLINE", backgroundTreatment: "CORPORATE_CLEAN", sectionDivider: "CORPORATE" }),
  preset("MODERN", { label: "Modern", description: "Balanced, clean and beautiful — the default premium experience.", bestFor: "Professionals who want a versatile, contemporary identity", characteristics: ["Balanced layout", "Soft depth", "Polished motion"] }, {}),
  preset("LUXURY", { label: "Luxury", description: "Elegant glass, metallic lighting and restrained gold reflections.", bestFor: "Finance, property, premium brands and luxury services", characteristics: ["Glass depth", "Metallic light", "Elegant shadows"] }, { heroLayout: "PREMIUM", buttonStyle: "LUXURY", cardSurface: "LUXURY", profileFrame: "LUXURY_RING", accentPalette: "GOLD", typographySystem: "PREMIUM", motionProfile: "PREMIUM", qrStyle: "LUXURY", entryAnimation: "LUXURY_REVEAL", trustStyle: "LUXURY", linkCardStyle: "LUXURY", iconStyle: "PREMIUM", backgroundTreatment: "LUXURY_MESH", sectionDivider: "LUXURY", trustPresentation: "LUXURY" }),
  preset("BOLD", { label: "Bold", description: "Big type, strong colour and high contrast that gets remembered.", bestFor: "Trades, local businesses and energetic operators", characteristics: ["Large typography", "High contrast", "Direct actions"] }, { heroLayout: "LEFT_ALIGNED", buttonStyle: "FILLED", cardSurface: "MATTE", profileFrame: "SOFT_SQUARE", accentPalette: "ELECTRIC_BLUE", typographySystem: "MODERN", motionProfile: "BALANCED", linkCardStyle: "BOLD", iconStyle: "FILLED", backgroundTreatment: "DARK_PREMIUM", sectionDivider: "CORPORATE" }),
  preset("MINIMAL", { label: "Minimal", description: "Whitespace, typography and clarity with nothing fighting for attention.", bestFor: "Consultants, designers and understated personal brands", characteristics: ["Generous space", "Type focused", "Elegant restraint"] }, { heroLayout: "MINIMAL", buttonStyle: "OUTLINE", cardSurface: "CLASSIC", profileFrame: "CIRCLE", accentPalette: "GRAPHITE", typographySystem: "CLASSIC", motionProfile: "MINIMAL", qrStyle: "CLASSIC", entryAnimation: "FADE", linkCardStyle: "MINIMAL", iconStyle: "OUTLINE", backgroundTreatment: "CORPORATE_CLEAN", sectionDivider: "MINIMAL", trustPresentation: "COMPACT" }),
  preset("CREATOR", { label: "Creator", description: "Media-first, expressive and alive without becoming noisy.", bestFor: "TikTok, Instagram, YouTube, Twitch and influencers", characteristics: ["Large imagery", "Animated gradients", "Dynamic interactions"] }, { heroLayout: "CREATOR_FIRST", buttonStyle: "PILL", cardSurface: "GLASS", profileFrame: "ANIMATED_RING", accentPalette: "SUNSET", motionProfile: "EXPRESSIVE", qrStyle: "DOTS", entryAnimation: "CREATOR_REVEAL", trustStyle: "CREATOR", linkCardStyle: "CREATOR", iconStyle: "ROUNDED", backgroundTreatment: "CREATOR_ENERGY", sectionDivider: "CREATOR", trustPresentation: "CREATOR" }),
  preset("FUTURE", { label: "Future", description: "Technology-inspired depth, subtle neon and premium futuristic motion.", bestFor: "Technology, product, digital and innovation leaders", characteristics: ["Subtle neon", "Ambient glow", "Fluid motion"] }, { heroLayout: "MODERN_SPLIT", buttonStyle: "GLASS", cardSurface: "METAL", profileFrame: "GLOW_RING", accentPalette: "ELECTRIC_BLUE", typographySystem: "MODERN", motionProfile: "PREMIUM", qrStyle: "PREMIUM_BORDER", entryAnimation: "SCALE", trustStyle: "FUTURE", linkCardStyle: "GLASS", iconStyle: "PREMIUM", backgroundTreatment: "AMBIENT_LIGHTING", sectionDivider: "MODERN" })
] as const;

export const DEFAULT_CIRCLE_STUDIO_TOKENS: CircleStudioTokens = CIRCLE_STUDIO_PRESETS[2].tokens;

export const CIRCLE_STUDIO_FIELD_COPY: Record<Exclude<CircleStudioTokenKey, "identityStyle">, { label: string; description: string }> = {
  heroLayout: { label: "Hero layout", description: "The opening composition of your public card." },
  buttonStyle: { label: "Button style", description: "Applied consistently to actions across the card." },
  cardSurface: { label: "Card surfaces", description: "Controls depth, blur, borders and lighting." },
  profileFrame: { label: "Profile image", description: "Makes your portrait part of your identity." },
  accentPalette: { label: "Accent collection", description: "A professionally balanced, accessible colour system." },
  typographySystem: { label: "Typography", description: "Platform-approved type with a distinct voice." },
  motionProfile: { label: "Motion profile", description: "Controls hover, transitions and interactive energy." },
  qrStyle: { label: "QR style", description: "A presentation frame that preserves scannability." },
  entryAnimation: { label: "Entry animation", description: "How your Circle Card arrives for a visitor." },
  trustStyle: { label: "Circle Trust style", description: "Visual personality for trust pages and panels." },
  linkCardStyle: { label: "Link cards", description: "How links and featured actions are presented." },
  iconStyle: { label: "Icon pack", description: "One consistent icon treatment throughout." },
  backgroundTreatment: { label: "Background", description: "Curated atmosphere that never distracts." },
  sectionDivider: { label: "Section dividers", description: "Subtle rhythm between content areas." },
  trustPresentation: { label: "Trust presentation", description: "Different hierarchy, always the same trust data." }
};

export function circleStudioLabel(value: string) {
  return value.toLowerCase().split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

export function isCircleStudioToken<K extends CircleStudioTokenKey>(key: K, value: unknown): value is CircleStudioTokens[K] {
  return typeof value === "string" && (CIRCLE_STUDIO_OPTIONS[key] as readonly string[]).includes(value);
}

export function normalizeCircleStudioTokens(input: unknown): CircleStudioTokens {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const style = isCircleStudioToken("identityStyle", source.identityStyle) ? source.identityStyle : DEFAULT_CIRCLE_STUDIO_TOKENS.identityStyle;
  const styleDefaults = CIRCLE_STUDIO_PRESETS.find((item) => item.key === style)?.tokens ?? DEFAULT_CIRCLE_STUDIO_TOKENS;
  return Object.fromEntries(
    (Object.keys(CIRCLE_STUDIO_OPTIONS) as CircleStudioTokenKey[]).map((key) => [key, isCircleStudioToken(key, source[key]) ? source[key] : styleDefaults[key]])
  ) as CircleStudioTokens;
}

export function readCircleStudioMetadata(value: Prisma.JsonValue | unknown): CircleStudioMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const metadata = value as Record<string, unknown>;
  if (metadata.version !== CIRCLE_STUDIO_VERSION || metadata.source !== "circle-studio") return null;
  return { version: 2, source: "circle-studio", collection: typeof metadata.collection === "string" ? metadata.collection : "CORE", tokens: normalizeCircleStudioTokens(metadata.tokens) };
}

export function buildCircleStudioMetadata(tokens: CircleStudioTokens, collection = "CORE"): CircleStudioMetadata {
  return { version: CIRCLE_STUDIO_VERSION, source: "circle-studio", collection, tokens: normalizeCircleStudioTokens(tokens) };
}

export const CIRCLE_STUDIO_RECOMMENDATIONS: Record<string, CircleStudioTokens["identityStyle"]> = {
  builder: "BOLD", electrician: "BOLD", consultant: "EXECUTIVE", restaurant: "MODERN", agency: "CORPORATE",
  tiktok: "CREATOR", youtube: "CREATOR", instagram: "CREATOR", streamer: "FUTURE", photographer: "MINIMAL", artist: "CREATOR"
};
