import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

(globalThis as { React?: typeof React }).React = React;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

import {
  RULES_ENTRY_FADE_OUT_MS,
  RulesEntryOverlay
} from "@/components/member/rules-entry-overlay";

describe("RulesEntryOverlay", () => {
  it("renders the cinematic first-login welcome experience", () => {
    const html = renderToStaticMarkup(
      React.createElement(RulesEntryOverlay, {
        reviewHref: "/rules"
      })
    );

    expect(html).toContain("Welcome to The Business Circle Network");
    expect(html).toContain("right room");
    expect(html).toContain("Private by design");
    expect(html).toContain("Built for better conversations");
    expect(html).toContain("Held to a higher standard");
    expect(html).toContain("Review BCN Rules");
    expect(html).toContain("A quick read before the room fully opens.");
  });

  it("uses a calm route transition timing before navigating to the rules page", () => {
    expect(RULES_ENTRY_FADE_OUT_MS).toBeGreaterThanOrEqual(400);
    expect(RULES_ENTRY_FADE_OUT_MS).toBeLessThanOrEqual(600);
  });
});
