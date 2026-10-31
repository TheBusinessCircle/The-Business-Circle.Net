import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CircleCardBusinessHeroActions } from "./circle-card-business-hero-actions";
import { resolveCircleCardHeroReviewAction } from "@/config/circle-card-hero-actions";

const precision = {
  slug: "precision-finish-plastering-rendering-ecb582748528",
  websiteUrl: "https://precisionplasteringandrendering.co.uk/"
};

describe("Precision's business hero review action", () => {
  it("uses the owner's exact Google review destination for the approved card", () => {
    expect(resolveCircleCardHeroReviewAction(precision)).toEqual({
      href: "https://g.page/r/Cb0gy5hYJ94-EAE/review",
      label: "Leave us a Google review"
    });
    expect(resolveCircleCardHeroReviewAction({
      ...precision,
      websiteUrl: "https://www.precisionplasteringandrendering.co.uk/#quote"
    })).toEqual(resolveCircleCardHeroReviewAction(precision));
  });

  it("does not give another business Precision's review destination", () => {
    expect(resolveCircleCardHeroReviewAction({ ...precision, slug: "scalesmiths" })).toBeNull();
    for (const websiteUrl of [
      null,
      "invalid",
      "https://example.com/",
      "https://precisionplasteringandrendering.co.uk.example.com/",
      "javascript:alert(1)"
    ]) {
      expect(resolveCircleCardHeroReviewAction({ ...precision, websiteUrl })).toBeNull();
    }
  });

  it("renders the review link immediately after the website action in one vertical group", () => {
    const markup = renderToStaticMarkup(createElement(CircleCardBusinessHeroActions, {
      primaryAction: createElement("a", { href: precision.websiteUrl }, "Visit Website"),
      reviewAction: resolveCircleCardHeroReviewAction(precision)
    }));
    const anchors = [...markup.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(match => match[0]);
    expect(anchors).toHaveLength(2);
    expect(anchors[0]).toContain("Visit Website");
    expect(anchors[1]).toContain('href="https://g.page/r/Cb0gy5hYJ94-EAE/review"');
    expect(anchors[1]).toContain("Leave us a Google review");
    expect(anchors[1]).toContain('target="_blank"');
    expect(anchors[1]).toContain('rel="noopener noreferrer"');
    expect(markup).toContain("flex-col");
    expect(markup).not.toContain("Featured links");
  });

  it("keeps the existing primary action alone for cards without an approved review action", () => {
    const markup = renderToStaticMarkup(createElement(CircleCardBusinessHeroActions, {
      primaryAction: createElement("a", { href: "https://scalesmiths.co.uk/" }, "Visit Website"),
      reviewAction: null
    }));
    expect(markup.match(/<a\b/g)).toHaveLength(1);
    expect(markup).not.toContain("g.page");
    expect(markup).not.toContain("Leave us a Google review");
  });
});
