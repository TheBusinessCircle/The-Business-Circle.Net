import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HucknallCircleHub } from "./hucknall-circle-hub";
import { HucknallHubDraftPreview, HUCKNALL_PREVIEW_BUSINESSES } from "./hucknall-hub-draft-preview";

describe("Hucknall public hub rendering", () => {
  it("shows an honest empty directory and free joining route", () => {
    const html = renderToStaticMarkup(createElement(HucknallCircleHub, { businesses: [], joinPath: "/register", proPath: "/pro" }));
    expect(html).toContain("Your local Circle starts here");
    expect(html).toContain('href="/register"');
    expect(html).toContain("Search local businesses");
    expect(html).toContain("directory score excludes membership points");
    expect(html).not.toContain("View Circle Card");
  });
  it("groups a business under its section and links to its actual card", () => {
    const html = renderToStaticMarkup(createElement(HucknallCircleHub, { businesses: [{
      id: "shop", slug: "local-butcher", name: "Local Butcher", description: "Fresh local produce",
      category: "food-drink", trustScore: 3, verifiedTestimonials: 0
    }], joinPath: "/register", proPath: "/pro" }));
    expect(html).toContain("Food &amp; drink");
    expect(html).toContain('href="/card/local-butcher"');
    expect(html).toContain("Building their Circle Trust");
    expect(html).not.toContain("Your local Circle starts here");
  });
  it("gives Hucknall its own identity and category navigation", () => {
    const html = renderToStaticMarkup(createElement(HucknallCircleHub, { businesses: [], joinPath: "/register", proPath: "/pro" }));
    expect(html).toContain("All together.");
    expect(html).toContain("Your high street. Your people. Your Circle.");
    expect(html).toContain('aria-label="Browse business categories"');
    expect(html).toContain("NG15");
  });
  it("uses the real hub component in the private draft and labels every illustrative entry", () => {
    const html = renderToStaticMarkup(createElement(HucknallHubDraftPreview));
    expect(html).toContain("Private hub design preview");
    expect(html).toContain("Search local businesses");
    expect(html).toContain("Example butcher shop");
    expect(HUCKNALL_PREVIEW_BUSINESSES).toHaveLength(9);
    expect(html).toContain("Joining is paused");
    expect(html).not.toContain('href="/card/hucknall-example-');
    expect(html).not.toContain("Share this hub");
    expect(html).not.toContain('href="/register"');
    expect(html).toContain("/app/prepared/cmvzwzm3y000amkahigz25s8r");
  });
});
