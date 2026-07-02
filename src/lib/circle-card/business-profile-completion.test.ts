import { describe, expect, it } from "vitest";
import { calculateBusinessProfileCompletion } from "@/lib/circle-card/business-profile-completion";

const completeProfile = {
  businessName: "Asha Studio",
  about: "Practical growth support.",
  profileImageUrl: "/profile.webp",
  businessLogoUrl: null,
  location: "London",
  websiteUrl: "https://example.com",
  email: null,
  phone: null,
  activeServiceCount: 1,
  hasOpeningHours: true,
  activeGalleryCount: 1,
  activeProductCount: 1,
  activePriceCount: 1,
  activeDocumentCount: 1,
  bookingActive: true,
  activeMenuOfferCount: 1,
  trustSignalCount: 1
};

describe("Business Profile Completion", () => {
  it("reports a complete profile at 100%", () => {
    expect(calculateBusinessProfileCompletion(completeProfile)).toMatchObject({
      score: 100,
      completedCount: 14,
      totalCount: 14,
      nextIncompleteId: null
    });
  });

  it("reduces completion when Business Pro modules are missing", () => {
    const result = calculateBusinessProfileCompletion({
      ...completeProfile,
      activeProductCount: 0,
      bookingActive: false,
      trustSignalCount: 0
    });

    expect(result.score).toBe(79);
    expect(result.completedCount).toBe(11);
    expect(result.items).toEqual(expect.arrayContaining([
      { id: "products", complete: false },
      { id: "booking", complete: false },
      { id: "circle-trust", complete: false }
    ]));
    expect(result.nextIncompleteId).toBe("products");
  });

  it("accepts either a logo or profile image and any existing contact route", () => {
    const result = calculateBusinessProfileCompletion({
      ...completeProfile,
      profileImageUrl: null,
      businessLogoUrl: "/logo.webp",
      websiteUrl: null,
      email: "hello@example.com"
    });

    expect(result.items.find((item) => item.id === "brand-image")?.complete).toBe(true);
    expect(result.items.find((item) => item.id === "contact-route")?.complete).toBe(true);
  });
});
