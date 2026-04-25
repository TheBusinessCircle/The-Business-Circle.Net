import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { React?: typeof React }).React = React;

const getSiteContentSectionMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/site-content", () => ({
  getSiteContentSection: getSiteContentSectionMock
}));

import RulesPage from "@/app/(public)/rules/page";

describe("rules page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSiteContentSectionMock.mockResolvedValue({
      supportEmail: "support@thebusinesscircle.net"
    });
  });

  it("renders the BCN Rules public page", async () => {
    const html = renderToStaticMarkup(await RulesPage());

    expect(html).toContain("BCN Rules");
    expect(html).toContain("The Standard Inside The Business Circle");
    expect(html).toContain("Respect Is Non-Negotiable");
    expect(html).toContain("Private Messaging Comes With Responsibility");
  });
});
