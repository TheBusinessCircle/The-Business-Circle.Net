import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicCircleCard } from "@/server/circle-card";
import { isPrecisionBusiness, PrecisionBusinessCard, PRECISION_REVIEW_URL, PRECISION_SLUG } from "./precision-business-card";

const card = {
  slug: PRECISION_SLUG, cardType: "BUSINESS", websiteUrl: "https://precisionplasteringandrendering.co.uk/",
  businessName: "Precision Finish Plastering & Rendering", fullName: "Precision Finish",
  tagline: "Saved owner tagline", about: "Saved business story", phone: "+44 1234 567890", email: "team@example.com",
  location: "Saved service area", galleryItems: [], services: [], customLinks: []
} as unknown as PublicCircleCard;
function render(overrides: Partial<PublicCircleCard> = {}) {
  return renderToStaticMarkup(createElement(PrecisionBusinessCard, {
    card: { ...card, ...overrides }, identity: createElement("button",null,"Native spin"),
    actions: createElement("button",null,"Native wallet"), connection: createElement("button",null,"Native connect"),
    trust: createElement("div",null,"Native trust"), qr: createElement("div",null,"Native QR"),
    contactDownloadHref: "/card/the-current-slug/vcard"
  }));
}

describe("Precision's live bespoke presentation", () => {
  it("only selects the approved business identity on its official HTTPS website", () => {
    expect(isPrecisionBusiness(card)).toBe(true);
    for (const values of [{ slug:"scalesmiths" }, { slug:"precision-finish-plastering-rendering" }, { cardType:"PERSONAL" },
      {websiteUrl:"https://precisionplasteringandrendering.co.uk.evil.example/"},{websiteUrl:"https://example.com/"},
      {websiteUrl:"javascript:alert(1)"},{websiteUrl:null}]) expect(isPrecisionBusiness({...card,...values} as PublicCircleCard)).toBe(false);
  });

  it("puts the approved Google review CTA immediately after Visit Website in the hero", () => {
    const html = render();
    const anchors = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) ?? [];
    const website = anchors.findIndex(anchor => anchor.includes('Visit Website'));
    const review = anchors.findIndex(anchor => anchor.includes('Leave us a Google review'));
    expect(website).toBeGreaterThan(-1);
    expect(review).toBe(website + 1);
    expect(html).toContain(PRECISION_REVIEW_URL.replaceAll('&','&amp;'));
    expect(html).toContain('Leave us a Google review');
    expect(html.indexOf('Leave us a Google review')).toBeLessThan(html.indexOf('Get my free quote'));
  });

  it("renders saved business details and existing native connection capabilities", () => {
    const html = render();
    for(const label of ["Saved owner tagline","Saved business story","Native spin","Native wallet","Native connect","Native trust","Native QR"])
      expect(html).toContain(label);
    expect(html).toContain('href="tel:+441234567890"');
    expect(html).toContain('href="/card/the-current-slug/vcard"');
    expect(html).toContain('href="/card/precision-finish-plastering-redering"');
    expect(html).toContain('href="/card/precision-finish-plastering-rendering"');
    expect(render({phone:null,email:null})).not.toContain('href="tel:');
    expect(render({phone:null,email:null})).not.toContain('href="mailto:');
  });

  it("does not leak code-protected, expired or unsafe featured links", () => {
    const saved = {id:"saved",label:"Saved public link",url:"https://example.com/project",visibility:"PUBLIC",expiresAt:null};
    const html = render({customLinks:[saved,{...saved,id:"private",label:"Private code destination",visibility:"PRIVATE_CODE"},
      {...saved,id:"unsafe",label:"Unsafe destination",url:"javascript:alert(1)"},
      {...saved,id:"expired",label:"Expired destination",expiresAt:new Date("2000-01-01")} ] as PublicCircleCard["customLinks"]});
    expect(html).toContain("Saved public link");
    for(const label of ["Private code destination","Unsafe destination","Expired destination"]) expect(html).not.toContain(label);
  });
});
