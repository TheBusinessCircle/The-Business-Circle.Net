import { describe, expect, it } from "vitest";
import {
  CIRCLE_STUDIO_ACCENTS,
  CIRCLE_STUDIO_OPTIONS,
  CIRCLE_STUDIO_PRESETS,
  buildCircleStudioMetadata,
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
});
