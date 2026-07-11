import { describe, expect, it } from "vitest";
import {
  calculateFirstCircleCardReadiness,
  firstIncompleteCircleCardStep
} from "@/lib/circle-card/first-card-readiness";

const completeCard = {
  cardType: "PERSONAL" as const,
  fullName: "Ada Lovelace",
  profileImageUrl: "/ada.jpg",
  role: "Founder",
  tagline: "I help teams build useful products.",
  email: "ada@example.com",
  socialLinks: {},
  isPublished: false
};

describe("first Circle Card readiness", () => {
  it("detects no card and an empty starter card", () => {
    expect(calculateFirstCircleCardReadiness(null).state).toBe("no_card");
    expect(
      calculateFirstCircleCardReadiness({
        cardType: "PERSONAL",
        fullName: "Ada Lovelace",
        socialLinks: {},
        isPublished: false
      }).state
    ).toBe("card_created_empty");
  });

  it("calculates progress only from the three first-card essentials", () => {
    const identity = calculateFirstCircleCardReadiness({
      cardType: "CREATOR",
      fullName: "Ada Lovelace",
      profileImageUrl: "/ada.jpg",
      socialLinks: {},
      isPublished: false
    });

    expect(identity.completedEssentials).toBe(1);
    expect(identity.completionPercentage).toBe(33);
    expect(firstIncompleteCircleCardStep(identity)).toBe(1);
  });

  it("accepts any valid connection route and separates preview from publish readiness", () => {
    const withoutConnection = calculateFirstCircleCardReadiness({
      ...completeCard,
      email: null
    });
    expect(withoutConnection.state).toBe("preview_ready");
    expect(withoutConnection.previewReady).toBe(true);
    expect(withoutConnection.publishReady).toBe(false);

    const ready = calculateFirstCircleCardReadiness(completeCard);
    expect(ready.state).toBe("publish_ready");
    expect(ready.completionPercentage).toBe(100);
    expect(ready.publishReady).toBe(true);
  });

  it("published state bypasses setup even when legacy card data is sparse", () => {
    expect(
      calculateFirstCircleCardReadiness({
        cardType: "PERSONAL",
        fullName: "Legacy User",
        isPublished: true
      }).state
    ).toBe("published");
  });
});
