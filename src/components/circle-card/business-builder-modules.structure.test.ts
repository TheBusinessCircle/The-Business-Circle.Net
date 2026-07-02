import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const dashboard = readFileSync(
  join(root, "src/app/(member)/dashboard/circle-card/page.tsx"),
  "utf8"
);
const router = readFileSync(
  join(root, "src/components/circle-card/circle-card-section-router.tsx"),
  "utf8"
);
const productsManager = readFileSync(
  join(root, "src/components/circle-card/circle-card-products-manager.tsx"),
  "utf8"
);
const priceListManager = readFileSync(
  join(root, "src/components/circle-card/circle-card-price-list-manager.tsx"),
  "utf8"
);
const menuOffersManager = readFileSync(
  join(root, "src/components/circle-card/circle-card-menu-offers-manager.tsx"),
  "utf8"
);
const bookingManager = readFileSync(
  join(root, "src/components/circle-card/circle-card-booking-manager.tsx"),
  "utf8"
);
const documentsManager = readFileSync(
  join(root, "src/components/circle-card/circle-card-documents-manager.tsx"),
  "utf8"
);
const galleryManager = readFileSync(
  join(root, "src/components/circle-card/circle-card-gallery-manager.tsx"),
  "utf8"
);
const reviewsManager = readFileSync(
  join(root, "src/components/circle-card/circle-card-reviews-manager.tsx"),
  "utf8"
);
const publicProfile = readFileSync(
  join(root, "src/components/circle-card/public-circle-card-profile.tsx"),
  "utf8"
);
const linkFileRoute = readFileSync(
  join(root, "src/app/api/circle-card/link-file/[filename]/route.ts"),
  "utf8"
);

describe("Business Builder module launcher", () => {
  it("makes active modules actionable without foundation badges", () => {
    expect(dashboard).not.toContain("Foundation only");
    expect(dashboard).toContain('hash: "business-card-services"');
    expect(dashboard).toContain('hash: "business-card-products"');
    expect(dashboard).toContain('hash: "business-card-price-list"');
    expect(dashboard).toContain('hash: "business-card-menu-offers"');
    expect(dashboard).toContain('hash: "business-card-booking"');
    expect(dashboard).toContain('hash: "business-card-downloads"');
    expect(dashboard).toContain('hash: "business-card-gallery"');
    expect(dashboard).toContain('hash: "business-card-opening-hours"');
    expect(dashboard).toContain('hash: "business-card-reviews"');
    expect(dashboard).toContain("Add your first service");
    expect(dashboard).toContain("Add first product");
    expect(dashboard).toContain("Add your first gallery image");
    expect(dashboard).toContain("Set your opening hours");
    expect(dashboard).toContain("Build my Circle Trust");
    expect(dashboard).toContain("Build Trust");
    expect(dashboard).toContain("Circle Trust is included with Circle Card Pro.");
    expect(dashboard).toContain("Products are included with Circle Card Pro.");
    expect(dashboard).toContain("Price List is included with Circle Card Pro.");
    expect(dashboard).toContain("Menu &amp; Offers are included with Circle Card Pro.");
    expect(dashboard).toContain("Downloads are included with Circle Card Pro.");
    expect(dashboard).toContain("Booking / Enquiry is included with Circle Card Pro.");
  });

  it("shows completion guidance, next actions and reused public shortcuts", () => {
    expect(dashboard).toContain("Business Profile Completion");
    expect(dashboard).toContain("Next best action");
    expect(dashboard).toContain("completion.nextIncompleteId");
    expect(dashboard).toContain('label: "Add your first service"');
    expect(dashboard).toContain('label: "Upload portfolio images"');
    expect(dashboard).toContain('label: "Build my Circle Trust"');
    expect(dashboard).toContain("CircleCardCopyLinkButton");
    expect(dashboard).toContain("CircleCardShareButton");
    expect(dashboard).toContain("View public Business Card");
  });

  it("keeps future business modules visible and inactive", () => {
    expect(dashboard).toContain("Coming Soon");
    expect(dashboard).toContain("blockDefinitions.map");
    expect(dashboard).toContain('definition.family === "BUSINESS" && !definition.publicEditingEnabled');
  });

  it("opens module details and scrolls smoothly with reduced-motion safety", () => {
    expect(dashboard).toContain("data-circle-card-module-details");
    expect(router).toContain("moduleDetails.open = true");
    expect(router).toContain('behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"');
  });

  it("keeps product management inline and future actions inactive", () => {
    expect(productsManager).toContain("upsertCircleCardProductItemInlineAction");
    expect(productsManager).toContain("Duplicate — Coming Soon");
    expect(productsManager).toContain("Reorder — Coming Soon");
    expect(productsManager).toContain('uploadKind="gallery-image"');
  });

  it("renders products responsively, lazily, and with external CTA handling", () => {
    expect(publicProfile).toContain('card.cardType !== "BUSINESS" || !card.products.length');
    expect(publicProfile).toContain('loading="lazy"');
    expect(publicProfile).toContain("getExternalLinkProps(product.ctaUrl)");
    expect(publicProfile).toContain("product.salePrice");
  });

  it("manages and renders a Business-only Price List inline", () => {
    expect(priceListManager).toContain('id="business-card-price-list"');
    expect(priceListManager).toContain("upsertCircleCardPriceListItemInlineAction");
    expect(priceListManager).toContain("Featured prices appear first publicly.");
    expect(priceListManager).toContain("Reorder — Coming Soon");
    expect(publicProfile).toContain('card.cardType !== "BUSINESS" || !card.priceItems.length');
    expect(publicProfile).toContain("getExternalLinkProps(item.ctaUrl)");
  });

  it("manages and renders Business-only Menu & Offers inline", () => {
    expect(menuOffersManager).toContain('id="business-card-menu-offers"');
    expect(menuOffersManager).toContain("upsertCircleCardMenuOfferItemInlineAction");
    expect(menuOffersManager).toContain('uploadKind="gallery-image"');
    expect(menuOffersManager).toContain("Duplicate — Coming Soon");
    expect(menuOffersManager).toContain("Reorder — Coming Soon");
    expect(menuOffersManager).toContain("Safe HTTPS links only");
    expect(publicProfile).toContain('card.cardType !== "BUSINESS" || !card.menuOfferItems.length');
    expect(publicProfile).toContain("item.previousPrice");
    expect(publicProfile).toContain("item.badge");
    expect(publicProfile).toContain("getExternalLinkProps(item.ctaUrl)");
  });

  it("keeps document management inline inside the downloads module", () => {
    expect(documentsManager).toContain('id="business-card-downloads"');
    expect(documentsManager).toContain("upsertCircleCardDocumentItemInlineAction");
    expect(documentsManager).toContain("CircleCardLinkFileUploadField");
    expect(documentsManager).toContain("Reorder");
    expect(documentsManager).toContain("Coming Soon");
  });

  it("renders document links only for Business Cards", () => {
    expect(publicProfile).toContain('card.cardType !== "BUSINESS" || !card.documents.length');
    expect(publicProfile).toContain('href={document.fileUrl}');
    expect(publicProfile).toContain('target="_blank"');
    expect(publicProfile).toContain("document.isFeatured");
    expect(linkFileRoute).toContain("DOWNLOADS_DOCUMENTS");
    expect(linkFileRoute).toContain("readCircleCardDocumentItems");
    expect(linkFileRoute).toContain("document.isActive");
  });

  it("keeps booking management inline inside the booking module", () => {
    expect(bookingManager).toContain('id="business-card-booking"');
    expect(bookingManager).toContain("upsertCircleCardBookingEnquiryInlineAction");
    expect(bookingManager).toContain("Visible on public card");
    expect(bookingManager).toContain("Add booking link");
  });

  it("uses positive, action-led Business Pro empty states", () => {
    expect(productsManager).toContain("Add products people can browse before they contact you.");
    expect(documentsManager).toContain("Upload brochures, forms, menus or price lists.");
    expect(priceListManager).toContain("Give visitors clear starting points before they enquire.");
    expect(menuOffersManager).toContain("Highlight seasonal offers, menus or limited-time promotions.");
    expect(bookingManager).toContain("Add a booking or enquiry link so visitors can take action.");
    expect(galleryManager).toContain("Show your best work with portfolio images.");
    expect(reviewsManager).toContain("Ask people in your Circle to help build your trust.");
  });

  it("renders safe public booking contact actions for Business Cards", () => {
    expect(publicProfile).toContain('card.cardType !== "BUSINESS" || !booking');
    expect(publicProfile).toContain("circleCardBookingPhoneHref");
    expect(publicProfile).toContain("circleCardBookingWhatsAppHref");
    expect(publicProfile).toContain('href={`mailto:${booking.enquiryEmail}`}');
    expect(publicProfile).toContain("getExternalLinkProps(booking.primaryCtaUrl)");
  });
});
