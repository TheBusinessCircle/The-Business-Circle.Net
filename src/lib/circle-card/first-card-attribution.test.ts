import { describe, expect, it } from "vitest";
import { readFirstCircleCardSource } from "@/lib/circle-card/first-card-attribution";

describe("first Circle Card source attribution", () => {
  it("keeps a matching internal Spin return route", () => {
    expect(
      readFirstCircleCardSource({
        sourceCardSlug: "origin-card",
        returnTo: "/card/origin-card?spin=return"
      })
    ).toEqual({
      source: "spin",
      sourceCardSlug: "origin-card",
      returnTo: "/card/origin-card?spin=return"
    });
  });

  it.each([
    "https://example.com/card/origin-card?spin=return",
    "//example.com/card/origin-card?spin=return",
    "/card/different-card?spin=return",
    "/card/origin-card"
  ])("rejects unsafe or mismatched return route %s", (returnTo) => {
    expect(readFirstCircleCardSource({ sourceCardSlug: "origin-card", returnTo }).returnTo).toBeNull();
  });
});
