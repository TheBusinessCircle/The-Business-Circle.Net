import { describe, expect, it } from "vitest";
import {
  appendCircleCardProResultParams,
  buildCircleCardProHref,
  normalizeCircleCardProIntent,
  safeCircleCardProReturnPath
} from "@/lib/circle-card/pro-intent";

describe("Circle Card Pro upgrade intent", () => {
  it("keeps a valid owned-area return path and capability", () => {
    expect(normalizeCircleCardProIntent({
      source: "studio",
      capability: "apply_studio_design",
      cardId: "card_owned_123",
      returnPath: "/dashboard/circle-card/studio?cardId=card_owned_123#apply"
    })).toEqual({
      source: "studio",
      capability: "apply_studio_design",
      cardId: "card_owned_123",
      returnPath: "/dashboard/circle-card/studio?cardId=card_owned_123#apply"
    });
  });

  it.each([
    "https://attacker.example/collect",
    "//attacker.example/collect",
    "/dashboard/billing",
    "/admin"
  ])("rejects an unsafe or out-of-scope return path: %s", (candidate) => {
    expect(safeCircleCardProReturnPath(candidate)).toBe("/dashboard/circle-card");
  });

  it("drops unknown client-controlled values", () => {
    expect(normalizeCircleCardProIntent({
      source: "unknown" as "studio",
      capability: "grant_access" as "apply_studio_design",
      cardId: "../../other-user",
      returnPath: "/dashboard/circle-card"
    })).toEqual({
      source: "pro_page",
      capability: "explore_pro",
      returnPath: "/dashboard/circle-card"
    });
  });

  it("round-trips safe intent through the interest and confirmed-return URLs", () => {
    const href = buildCircleCardProHref({
      source: "media_kit",
      capability: "open_media_kit",
      cardId: "card_owned_123",
      returnPath: "/dashboard/circle-card?section=my-card#creator-media-kit"
    });
    expect(href).toContain("source=media_kit");
    expect(href).toContain("capability=open_media_kit");
    expect(href).toContain("card=card_owned_123");

    expect(appendCircleCardProResultParams(
      "/dashboard/circle-card?section=my-card#creator-media-kit",
      { billing: "success", capability: "open_media_kit" }
    )).toBe(
      "/dashboard/circle-card?section=my-card&billing=success&plan=pro&capability=open_media_kit#creator-media-kit"
    );
  });
});
