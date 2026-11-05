import { afterEach, describe, expect, it } from "vitest";
import {
  helpSchema,
  providerSchema,
  profileSchema,
  safeAffiliateDestination,
} from "./validation";
import { isBcnV2Enabled, isBcnHiddenProductPath } from "./flags";
const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
});
describe("BCN isolation and public intake", () => {
  it("is off unless explicitly enabled with a valid deployment URL", () => {
    delete process.env.BCN_V2_ENABLED;
    expect(isBcnV2Enabled()).toBe(false);
    process.env.BCN_V2_ENABLED = "true";
    delete process.env.APP_URL;
    delete process.env.NEXTAUTH_URL;
    expect(isBcnV2Enabled()).toBe(false);
  });
  it("cannot activate on the independent product host", () => {
    process.env.BCN_V2_ENABLED = "true";
    for (const h of ["circlecard.co.uk", "www.circlecard.co.uk"]) {
      process.env.APP_URL = `https://${h}`;
      expect(isBcnV2Enabled()).toBe(false);
    }
    process.env.APP_URL = "https://thebusinesscircle.net";
    expect(isBcnV2Enabled()).toBe(true);
  });
  it("identifies every legacy product page prefix without blocking legitimate BCN accounts", () => {
    for (const p of [
      "/circle-card",
      "/circle-card/pro",
      "/card/example",
      "/dashboard/circle-card/studio",
      "/admin/circle-card/moderation",
      "/uploads/circle-card/photo",
    ]) {
      expect(isBcnHiddenProductPath(p)).toBe(true);
    }
    expect(isBcnHiddenProductPath("/login")).toBe(false);
    expect(isBcnHiddenProductPath("/dashboard")).toBe(false);
  });
  it("requires intake permission and rejects the spam trap", () => {
    const r = {
      name: "Test Owner",
      email: "owner@example.test",
      business: "Test Business",
      category: "website",
      summary: "I need help improving our service website.",
      consent: true,
    };
    expect(helpSchema.safeParse(r).success).toBe(true);
    expect(helpSchema.safeParse({ ...r, consent: false }).success).toBe(false);
    expect(helpSchema.safeParse({ ...r, website: "spam" }).success).toBe(false);
  });
  it("rejects script URLs, credentials and malformed profile websites", () => {
    const p = {
      business: "Test",
      location: "Nottingham",
      category: "website",
      description: "A clear description of this business.",
      publicConsent: true,
    };
    for (const website of [
      "javascript:alert(1)",
      "http://example.test",
      "https://user:password@example.test",
    ]) {
      expect(profileSchema.safeParse({ ...p, website }).success).toBe(false);
    }
    expect(
      profileSchema.safeParse({ ...p, website: "https://example.test" })
        .success,
    ).toBe(true);
  });
  it("requires provider listing permission independently of approval", () => {
    expect(
      providerSchema.safeParse({
        business: "Provider",
        category: "website",
        location: "UK",
        description: "A real service provider with a clear offer.",
        website: "",
        approved: true,
        agreementReference: "",
        relatedBusinessDisclosure: "",
      }).success,
    ).toBe(false);
  });
  it("affiliate URLs fail closed until approved, active and disclosed", () => {
    const offer = {
      active: true,
      approvedAt: new Date(),
      destination: "https://example.test/path",
      allowedHost: "example.test",
      approvalReference: "agreement-1",
      disclosure: "Ad: BCN may receive a referral commission.",
    };
    expect(safeAffiliateDestination(offer)).toBe(offer.destination);
    for (const change of [
      { active: false },
      { approvedAt: null },
      { approvalReference: "" },
      { disclosure: "" },
      { allowedHost: "evil.test" },
      { destination: "javascript:alert(1)" },
    ])
      expect(safeAffiliateDestination({ ...offer, ...change })).toBeNull();
  });
});
