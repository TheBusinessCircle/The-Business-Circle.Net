import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

(globalThis as { React?: typeof React }).React = React;

vi.mock("@/actions/legal/rules.actions", () => ({
  acceptBcnRulesAndContinueAction: vi.fn()
}));

import RulesPage from "@/app/(public)/rules/page";

describe("rules page", () => {
  it("renders the BCN Rules public page", () => {
    const html = renderToStaticMarkup(React.createElement(RulesPage));

    expect(html).toContain("BCN Rules");
    expect(html).toContain("The Standard Inside The Business Circle");
    expect(html).toContain("Respect Is Non-Negotiable");
    expect(html).toContain("Private Messaging Comes With Responsibility");
    expect(html).toContain("Ready to enter");
    expect(html).toContain("Accept and Continue to Dashboard");
    expect(html).toContain("Back to dashboard");
    expect(html).toContain("WELCOME TO THE BUSINESS CIRCLE NETWORK");
    expect(html).toContain("You&#x27;re in the right room.");
    expect(html).toContain("Skip intro");
  });
});
