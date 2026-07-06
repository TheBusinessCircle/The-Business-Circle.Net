import { describe, expect, it } from "vitest";
import {
  CIRCLE_STUDIO_ACCENTS,
  CIRCLE_STUDIO_OPTIONS,
  CIRCLE_STUDIO_PRESETS,
  DEFAULT_CIRCLE_STUDIO_FINE_TUNE,
  buildCircleStudioMetadata,
  getCircleStudioFineTuneIssues,
  normalizeCircleStudioTokens,
  readCircleStudioMetadata
} from "@/lib/circle-card/identity-engine";
import { buildCircleStudioDataAttributes, resolveCircleCardTheme } from "@/lib/circle-card/theme";

describe("Circle Studio identity engine", () => {
  it("ships every core identity as a complete curated token set", () => {
    expect(CIRCLE_STUDIO_PRESETS.map((preset) => preset.key)).toEqual([
      "EXECUTIVE", "CORPORATE", "MODERN", "LUXURY", "BOLD", "MINIMAL", "CREATOR", "FUTURE"
    ]);

    for (const preset of CIRCLE_STUDIO_PRESETS) {
      for (const [key, values] of Object.entries(CIRCLE_STUDIO_OPTIONS)) {
        expect(values).toContain(preset.tokens[key as keyof typeof preset.tokens]);
      }
    }
  });

  it("normalizes invalid metadata through its selected style guardrails", () => {
    const tokens = normalizeCircleStudioTokens({ identityStyle: "LUXURY", buttonStyle: "anything" });
    expect(tokens.identityStyle).toBe("LUXURY");
    expect(tokens.buttonStyle).toBe("LUXURY");
  });

  it("round trips a versioned snapshot for future collections", () => {
    const metadata = buildCircleStudioMetadata(CIRCLE_STUDIO_PRESETS[6].tokens, "CORE");
    expect(readCircleStudioMetadata(metadata)).toEqual(metadata);
  });

  it("uses curated palette colours and exposes semantic data attributes", () => {
    const metadata = buildCircleStudioMetadata(CIRCLE_STUDIO_PRESETS[7].tokens);
    const theme = resolveCircleCardTheme({ themeMetadata: metadata });
    expect(theme.primaryColor).toBe(CIRCLE_STUDIO_ACCENTS.ELECTRIC_BLUE.primary);
    expect(buildCircleStudioDataAttributes({ themeMetadata: metadata })).toMatchObject({
      "data-cc-identity": "future",
      "data-cc-profile": "glow-ring",
      "data-cc-motion": "premium"
    });
  });

  it("keeps existing version-two designs unchanged when fine tuning is absent", () => {
    const legacyMetadata = {
      version: 2,
      source: "circle-studio",
      collection: "CORE",
      tokens: CIRCLE_STUDIO_PRESETS[0].tokens
    };
    const metadata = readCircleStudioMetadata(legacyMetadata);

    expect(metadata?.tokens).toEqual(CIRCLE_STUDIO_PRESETS[0].tokens);
    expect(metadata?.fineTune).toEqual(DEFAULT_CIRCLE_STUDIO_FINE_TUNE);
  });

  it("applies safe custom colours and protected image backgrounds", () => {
    const metadata = buildCircleStudioMetadata(CIRCLE_STUDIO_PRESETS[2].tokens, "CORE", {
      version: 1,
      accentColor: "#78A8FF",
      secondaryColor: "#4B72C2",
      backgroundStyle: "IMAGE",
      backgroundImageUrl: "/uploads/circle-card/test-user-background-image-1700000000000-deadbeef.png",
      backgroundOverlay: 0.4,
      paletteSource: "PROFILE_IMAGE"
    });
    const theme = resolveCircleCardTheme({ themeMetadata: metadata });

    expect(theme.accentColor).toBe("#78A8FF");
    expect(theme.primaryColor).toBe("#4B72C2");
    expect(theme.fineTune.backgroundOverlay).toBe(0.62);
    expect(getCircleStudioFineTuneIssues(theme.fineTune)).toEqual([]);
  });

  it("blocks custom colours that are too dark for Circle Card surfaces", () => {
    expect(getCircleStudioFineTuneIssues({
      ...DEFAULT_CIRCLE_STUDIO_FINE_TUNE,
      accentColor: "#111111",
      secondaryColor: "#161616",
      paletteSource: "CUSTOM"
    })).toHaveLength(2);
  });
});
