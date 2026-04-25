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
  it("renders the cinematic first-login member welcome experience", () => {
    const html = renderToStaticMarkup(
      React.createElement(RulesEntryOverlay, {
        reviewHref: "/rules"
      })
    );

    expect(html).toContain("Welcome to The Business Circle Network");
    expect(html).toContain("private room built for serious business owners");
    expect(html).toContain("not designed to be another noisy feed");
    expect(html).toContain("rooms, resources, member profiles, discussions");
    expect(html).toContain("Private business-owner environment");
    expect(html).toContain("Structured rooms and focused conversations");
    expect(html).toContain("Premium resources and practical insight");
    expect(html).toContain("clarity, respect, and useful contribution");
    expect(html).toContain("Read The BCN Rules");
    expect(html).toContain("This protects the quality of the room for every member.");
  });

  it("keeps the rules CTA wired to the rules page", () => {
    const html = renderToStaticMarkup(
      React.createElement(RulesEntryOverlay, {
        reviewHref: "/rules"
      })
    );

    expect(html).toContain('aria-label="Read The BCN Rules"');
    expect(html).toContain('data-review-href="/rules"');
  });

  it("uses a calm route transition timing before navigating to the rules page", () => {
    expect(RULES_ENTRY_FADE_OUT_MS).toBeGreaterThanOrEqual(400);
    expect(RULES_ENTRY_FADE_OUT_MS).toBeLessThanOrEqual(600);
  });
});
