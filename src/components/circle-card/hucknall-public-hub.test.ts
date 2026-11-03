import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HucknallPublicHub } from "./hucknall-public-hub";

describe("client-compatible Hucknall public presentation", () => {
  const slots = { identity: "Native identity", actions: "Native Wallet action", connection: "Native Connect action", feedback: null, trust: "Native Trust", qr: "Native QR" };
  it("renders supplied public directory data synchronously without a server-side loader", () => {
    const html = renderToStaticMarkup(createElement(HucknallPublicHub, { ...slots, businesses: [{
      id: "shop", slug: "local-shop", name: "Local Shop", description: "A local business",
      category: "shopping", trustScore: 0, verifiedTestimonials: 0
    }] }));
    expect(html).toContain('href="/card/local-shop"');
    expect(html).toContain("Local Shop");
    expect(html).toContain("Native Wallet action");
    expect(html).toContain("Native Connect action");
    expect(html).toContain("Made for the people of Hucknall");
  });
  it("renders an empty directory without adding illustrative members", () => {
    const html = renderToStaticMarkup(createElement(HucknallPublicHub, { ...slots, businesses: [] }));
    expect(html).toContain("Your local Circle starts here");
    expect(html).not.toContain("Example butcher shop");
  });
});
