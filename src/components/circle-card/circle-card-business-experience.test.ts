import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { resolveCircleCardBusinessExperience } from "@/config/circle-card-hero-actions";
import { CircleCardBusinessProjectCta } from "./circle-card-business-experience";
import { PublicCircleCardGallery } from "./public-circle-card-gallery";

const precision = {
  slug: "precision-finish-plastering-rendering-ecb582748528",
  websiteUrl: "https://precisionplasteringandrendering.co.uk/"
};

describe("Precision's bespoke business experience", () => {
  it("only selects the approved business card and matching website", () => {
    expect(resolveCircleCardBusinessExperience(precision)?.brandName).toBe("Precision Finish");
    for (const slug of ["scalesmiths", "another-precision-card", "constructor", "__proto__"]) {
      expect(resolveCircleCardBusinessExperience({ ...precision, slug })).toBeNull();
    }
    expect(resolveCircleCardBusinessExperience({ ...precision, websiteUrl: "https://example.com" })).toBeNull();
    expect(resolveCircleCardBusinessExperience({ ...precision, websiteUrl: null })).toBeNull();
  });

  it("connects quote and project buttons to the client website and calls the saved card number", () => {
    const experience = resolveCircleCardBusinessExperience(precision)!;
    const markup = renderToStaticMarkup(createElement(CircleCardBusinessProjectCta, {
      experience,
      phoneHref: "tel:+441234567890",
      phoneLabel: "01234 567890"
    }));
    expect(markup).toContain('href="https://precisionplasteringandrendering.co.uk/#quote"');
    expect(markup).toContain('href="https://precisionplasteringandrendering.co.uk/projects/"');
    expect(markup).toContain('href="tel:+441234567890"');
    expect(markup).toContain("Call 01234 567890");
    expect(markup).not.toContain("07432");
    expect(markup).toContain("How to get started");
  });

  it("does not invent a phone button when the owner has removed their number", () => {
    const markup = renderToStaticMarkup(createElement(CircleCardBusinessProjectCta, {
      experience: resolveCircleCardBusinessExperience(precision)!,
      phoneHref: null,
      phoneLabel: null
    }));
    expect(markup).not.toContain('href="tel:');
    expect(markup).toContain("Get my free quote");
  });

  it("reuses saved gallery content and hides inactive images in the custom showcase", () => {
    const item = {
      id: "project-1",
      imageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      title: "Saved plastering project",
      description: "Owner's saved project description",
      category: "Internal plastering",
      isActive: true,
      sortOrder: 0
    };
    const markup = renderToStaticMarkup(createElement(PublicCircleCardGallery, {
      items: [item, { ...item, id: "hidden-project", title: "Hidden image", isActive: false }],
      heading: "See the finish for yourself",
      description: "Tap a photo for a closer look.",
      spotlight: true
    }));
    expect(markup).toContain("See the finish for yourself");
    expect(markup).toContain("Enlarge Saved plastering project");
    expect(markup).toContain("Owner&#x27;s saved project description");
    expect(markup).not.toContain("Hidden image");
  });
});
