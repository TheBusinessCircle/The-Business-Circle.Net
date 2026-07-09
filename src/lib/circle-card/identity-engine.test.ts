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
import {
  buildCircleCardThemeStyle,
  buildCircleStudioDataAttributes,
  resolveCircleCardLiveTheme,
  resolveCircleCardTheme
} from "@/lib/circle-card/theme";

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
    expect(theme.studioTokens.profileFrame).toBe("GLOW_RING");
    expect(buildCircleStudioDataAttributes({ themeMetadata: metadata })).toMatchObject({
      "data-cc-identity": "future",
      "data-cc-profile": "glow-ring",
      "data-cc-motion": "premium"
    });
  });

  it("uses the same resolver output for Studio preview, public cards and Circle Trust", () => {
    const metadata = buildCircleStudioMetadata(CIRCLE_STUDIO_PRESETS[3].tokens, "CORE", {
      ...DEFAULT_CIRCLE_STUDIO_FINE_TUNE,
      accentColor: "#F0CF88",
      secondaryColor: "#D4AF5F",
      backgroundStyle: "SOFT_GLOW"
    });
    const studioPreviewTheme = resolveCircleCardTheme({ themeMetadata: metadata });
    const publicCardTheme = resolveCircleCardTheme({ themeMetadata: metadata });
    const trustTheme = resolveCircleCardTheme({ themeMetadata: metadata });

    expect(publicCardTheme).toEqual(studioPreviewTheme);
    expect(trustTheme).toEqual(studioPreviewTheme);
    expect(buildCircleCardThemeStyle(publicCardTheme)["--cc-theme-page-bg"]).toContain("radial-gradient");
    expect(buildCircleStudioDataAttributes({ themeMetadata: metadata })).toMatchObject({
      "data-cc-identity": "luxury",
      "data-cc-surface": "luxury",
      "data-cc-profile": "luxury-ring",
      "data-cc-button": "luxury",
      "data-cc-fine-background": "true"
    });
    expect(resolveCircleCardLiveTheme({ themeMetadata: metadata })).toMatchObject({
      theme: studioPreviewTheme,
      attributes: expect.objectContaining({ "data-cc-identity": "luxury" })
    });
  });

  it("makes each curated identity visually distinct across public tokens", () => {
    const signatures = new Set<string>();

    for (const preset of CIRCLE_STUDIO_PRESETS) {
      const metadata = buildCircleStudioMetadata(preset.tokens);
      const theme = resolveCircleCardTheme({ themeMetadata: metadata });
      const style = buildCircleCardThemeStyle(theme);
      const attributes = buildCircleStudioDataAttributes({ themeMetadata: metadata });
      const signature = [
        style["--cc-theme-section-bg"],
        style["--cc-theme-page-bg"],
        attributes["data-cc-profile"],
        attributes["data-cc-button"],
        attributes["data-cc-entry"]
      ].join("|");

      expect(attributes["data-cc-surface"]).toBeTruthy();
      expect(attributes["data-cc-profile"]).toBeTruthy();
      expect(attributes["data-cc-background"]).toBeTruthy();
      expect(attributes["data-cc-button"]).toBeTruthy();
      expect(attributes["data-cc-motion"]).toBeTruthy();
      expect(style["--cc-theme-page-bg"]).not.toBe("linear-gradient(#030712,#030712)");
      signatures.add(signature);
    }

    expect(signatures.size).toBe(CIRCLE_STUDIO_PRESETS.length);
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
    expect(buildCircleCardThemeStyle(theme)["--cc-bg-image"]).toBe('url("/uploads/circle-card/test-user-background-image-1700000000000-deadbeef.png")');
    expect(buildCircleCardThemeStyle(theme)["--cc-bg-overlay"]).toBe("0.62");
    expect(buildCircleCardThemeStyle(theme)["--cc-theme-page-bg"]).toContain('url("/uploads/circle-card/test-user-background-image-1700000000000-deadbeef.png")');
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
