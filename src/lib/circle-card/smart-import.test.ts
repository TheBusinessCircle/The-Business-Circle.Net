import { describe, expect, it } from "vitest";
import {
  buildCircleCardSmartImportLinkLabel,
  detectCircleCardSmartImportPlatform,
  guessCircleCardSmartImportHandle,
  suggestCircleCardSmartImportLinkType,
  type CircleCardSmartImportMetadata
} from "@/lib/circle-card/smart-import";

function metadata(input: Partial<CircleCardSmartImportMetadata>): CircleCardSmartImportMetadata {
  return {
    inputUrl: input.inputUrl ?? input.url ?? "https://example.com",
    url: input.url ?? "https://example.com",
    ok: input.ok ?? true,
    title: input.title ?? null,
    description: input.description ?? null,
    image: input.image ?? null,
    siteName: input.siteName ?? null,
    favicon: input.favicon ?? null,
    canonicalUrl: input.canonicalUrl ?? null,
    detectedPlatform: input.detectedPlatform ?? "website",
    handleGuess: input.handleGuess ?? null,
    error: input.error ?? null
  };
}

describe("circle card smart import helpers", () => {
  it("detects common creator platforms", () => {
    expect(detectCircleCardSmartImportPlatform("https://www.instagram.com/circlecard")).toBe(
      "instagram"
    );
    expect(detectCircleCardSmartImportPlatform("https://www.tiktok.com/@circlecard")).toBe(
      "tiktok"
    );
    expect(detectCircleCardSmartImportPlatform("https://youtube.com/@circlecard")).toBe(
      "youtube"
    );
    expect(detectCircleCardSmartImportPlatform("https://discord.gg/circlecard")).toBe(
      "discord"
    );
    expect(detectCircleCardSmartImportPlatform("https://example.com")).toBe("website");
  });

  it("guesses public handles without storing platform credentials", () => {
    expect(guessCircleCardSmartImportHandle("https://www.instagram.com/circlecard")).toBe(
      "@circlecard"
    );
    expect(guessCircleCardSmartImportHandle("https://www.linkedin.com/in/trevor-newton")).toBe(
      "trevor newton"
    );
    expect(guessCircleCardSmartImportHandle("https://www.youtube.com/@circlecard")).toBe(
      "@circlecard"
    );
    expect(guessCircleCardSmartImportHandle("https://discord.com/invite/circlecard")).toBe(
      "Invite: circlecard"
    );
  });

  it("suggests smart link labels and types from metadata", () => {
    const item = metadata({
      url: "https://example.com/latest-offer",
      title: "Creator Course Offer",
      description: "Join the current programme.",
      detectedPlatform: "website"
    });

    expect(buildCircleCardSmartImportLinkLabel(item)).toBe("Creator Course Offer");
    expect(suggestCircleCardSmartImportLinkType(item)).toBe("LATEST_OFFER");

    expect(
      suggestCircleCardSmartImportLinkType(
        metadata({
          url: "https://discord.gg/circlecard",
          detectedPlatform: "discord",
          title: "Circle Card Discord"
        })
      )
    ).toBe("COMMUNITY");
  });
});
