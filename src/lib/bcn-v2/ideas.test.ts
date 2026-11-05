import { describe, expect, it } from "vitest";
import {
  ideaCommand,
  ideaFields,
  offerFields,
  ideaIsOpen,
  offerPrice,
} from "./ideas";
const requestId = "cmr00000000000000000000001";
const brief = {
  displayName: "First business",
  title: "Help test a new booking service",
  stage: "IDEA",
  category: "website",
  idea: "I am building a useful booking service for local dog walkers and their customers.",
  helpNeeded:
    "I need someone to review a simple prototype with three booking steps and suggest improvements.",
  nextMilestone: "Run a first customer test within two weeks.",
  location: "Remote UK",
  supportTypes: ["FREE", "DISCOUNTED"],
  publicConsent: true,
  practicalHelpOnly: true,
};
const offer = {
  requestId,
  displayName: "Example helper",
  kind: "FREE",
  scope:
    "A thirty-minute review of the three booking steps with written feedback.",
  timing: "One call next week",
  pricePence: 0,
  usualPricePence: null,
  priceTerms: "No fee, compulsory purchase or deposit.",
  agreesToContact: true,
  honestPricing: true,
};
describe("practical help validation", () => {
  it("requires explicit publication permission and a practical-help acknowledgement", () => {
    expect(ideaFields.safeParse(brief).success).toBe(true);
    expect(
      ideaFields.safeParse({ ...brief, publicConsent: false }).success,
    ).toBe(false);
    expect(
      ideaFields.safeParse({ ...brief, practicalHelpOnly: false }).success,
    ).toBe(false);
  });
  it("requires a specific ask, milestone and at least one support type", () => {
    for (const patch of [
      { helpNeeded: "help me" },
      { nextMilestone: "grow" },
      { supportTypes: [] },
      { title: "My dream" },
    ])
      expect(ideaFields.safeParse({ ...brief, ...patch }).success).toBe(false);
  });
  it("does not accept injected ownership, moderation or fee fields", () => {
    expect(ideaFields.safeParse({ ...brief, ownerId: "other" }).success).toBe(
      false,
    );
    expect(
      offerFields.safeParse({ ...offer, status: "APPROVED" }).success,
    ).toBe(false);
    expect(
      ideaCommand.safeParse({
        action: "accept",
        offerId: requestId,
        ownerId: "other",
      }).success,
    ).toBe(false);
  });
  it("does not permit a cash price on free help or swaps", () => {
    expect(offerFields.safeParse(offer).success).toBe(true);
    for (const kind of ["FREE", "SKILL_SWAP"])
      expect(
        offerFields.safeParse({ ...offer, kind, pricePence: 1 }).success,
      ).toBe(false);
  });
  it("requires a genuine higher comparison price for discounts", () => {
    for (const usualPricePence of [null, 1000, 999])
      expect(
        offerFields.safeParse({
          ...offer,
          kind: "DISCOUNTED",
          pricePence: 1000,
          usualPricePence,
        }).success,
      ).toBe(false);
    expect(
      offerFields.safeParse({
        ...offer,
        kind: "DISCOUNTED",
        pricePence: 1000,
        usualPricePence: 2000,
      }).success,
    ).toBe(true);
  });
  it("requires positive, bounded whole-penny paid prices and no unrelated reference price", () => {
    for (const pricePence of [0, -1, 1.5, 10000001])
      expect(
        offerFields.safeParse({ ...offer, kind: "PAID", pricePence }).success,
      ).toBe(false);
    expect(
      offerFields.safeParse({
        ...offer,
        kind: "PAID",
        pricePence: 1000,
        usualPricePence: 2000,
      }).success,
    ).toBe(false);
  });
  it("requires consent to chat and honest pricing", () => {
    expect(
      offerFields.safeParse({ ...offer, agreesToContact: false }).success,
    ).toBe(false);
    expect(
      offerFields.safeParse({ ...offer, honestPricing: false }).success,
    ).toBe(false);
  });
  it("treats expired, pending, matched and closed requests as unavailable", () => {
    const now = new Date("2026-10-21T00:00:00Z");
    for (const status of ["PENDING", "MATCHED", "CLOSED", "REJECTED"])
      expect(
        ideaIsOpen({ status, expiresAt: new Date("2026-11-01") }, now),
      ).toBe(false);
    expect(ideaIsOpen({ status: "APPROVED", expiresAt: now }, now)).toBe(false);
    expect(
      ideaIsOpen(
        { status: "APPROVED", expiresAt: new Date("2026-11-01") },
        now,
      ),
    ).toBe(true);
  });
  it("labels the real price rather than claiming a verified saving", () => {
    expect(
      offerPrice({
        kind: "DISCOUNTED",
        pricePence: 5000,
        usualPricePence: 10000,
      }),
    ).toBe("£50.00 · usual price £100.00");
    expect(
      offerPrice({ kind: "FREE", pricePence: 0, usualPricePence: null }),
    ).toBe("Free help · £0");
  });
});
