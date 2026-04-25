import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

(globalThis as { React?: typeof React }).React = React;

import RulesPage from "@/app/(public)/rules/page";

describe("rules page", () => {
  it("renders the BCN Rules public page", () => {
    const html = renderToStaticMarkup(React.createElement(RulesPage));

    expect(html).toContain("BCN Rules");
    expect(html).toContain("The Standard Inside The Business Circle");
    expect(html).toContain("Respect Is Non-Negotiable");
    expect(html).toContain("Private Messaging Comes With Responsibility");
  });
});
