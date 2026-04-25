import * as React from "react";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

(globalThis as { React?: typeof React }).React = React;

const getSiteContentSectionMock = vi.hoisted(() => vi.fn());

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => createElement("a", { href, className }, children)
}));

vi.mock("@/server/site-content", () => ({
  getSiteContentSection: getSiteContentSectionMock
}));

vi.mock("@/components/branding/brand-mark", () => ({
  BrandMark: () => createElement("span", null, "Brand")
}));

vi.mock("@/components/privacy/cookie-settings-button", () => ({
  CookieSettingsButton: ({
    children,
    className
  }: {
    children: ReactNode;
    className?: string;
  }) => createElement("button", { className, type: "button" }, children)
}));

import { Footer } from "@/components/public/footer";

describe("public footer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSiteContentSectionMock.mockResolvedValue({
      brandBlurb: "Premium founder-led network.",
      trustLine: "Private business environment.",
      founderLine: "Built and led by Trev Newton.",
      supportEmail: "support@thebusinesscircle.net",
      supportLine: "Support line",
      bottomLine: "Built for business owners."
    });
  });

  it("includes the BCN Rules link in the trust and legal section", async () => {
    const html = renderToStaticMarkup(await Footer());

    expect(html).toContain('href="/rules"');
    expect(html).toContain("BCN Rules");
    expect(html).toContain("Terms &amp; Conditions");
  });
});
