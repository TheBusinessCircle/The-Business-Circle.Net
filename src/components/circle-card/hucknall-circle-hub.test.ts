import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HucknallCircleHub } from "./hucknall-circle-hub";

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
});
