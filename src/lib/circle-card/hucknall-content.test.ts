import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HucknallAboutPageContent } from "@/components/circle-card/hucknall-about";
import { HUCKNALL_ABOUT_SECTIONS, HUCKNALL_CARD_ABOUT, HUCKNALL_HUB_CANONICAL, HUCKNALL_SOURCES, hucknallStructuredData } from "./hucknall-content";

describe("Hucknall's researched public identity", () => {
  it("renders substantive local text as HTML without a login or client-only content fetch", () => {
    const html = renderToStaticMarkup(createElement(HucknallAboutPageContent));
    for (const term of ["Ada Lovelace", "Lord Byron", "St Mary Magdalene", "Titchfield Park", "framework knitting", "Trev Newton-Bradley", "Friday and Saturday"]) expect(html.toLowerCase()).toContain(term.toLowerCase());
    expect(HUCKNALL_ABOUT_SECTIONS.length).toBeGreaterThanOrEqual(6);
    expect(html).toContain("not an official Ashfield District Council service");
    expect(html).not.toContain("Example butcher shop");
  });
  it("keeps the native About field within the current editor's length limit", () => {
    expect(HUCKNALL_CARD_ABOUT.length).toBeLessThanOrEqual(1600);
  });
  it("uses relevant source links and honest structured data without fake ratings", () => {
    expect(HUCKNALL_SOURCES).toHaveLength(6);
    const json = JSON.stringify(hucknallStructuredData());
    expect(json).toContain(HUCKNALL_HUB_CANONICAL);
    expect(json).toContain("AboutPage");
    expect(json).not.toContain("aggregateRating");
    expect(json).not.toContain("GovernmentOrganization");
  });
});
