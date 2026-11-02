import { describe, expect, it } from "vitest";
import { directoryCircleTrustScore, getLocalHubPath, HUCKNALL_HUB_PATH, isHucknallBusinessPostcode,
  isValidBusinessPostcode, normalizeBusinessPostcode, sortLocalHubBusinesses, type LocalHubBusiness } from "./local-hubs";

describe("local hub postcode matching", () => {
  it.each(["ng157aa", " NG15 7AA ", "ng15 7aa", "NG15\t7AA"])("normalizes %s", value => {
    expect(normalizeBusinessPostcode(value)).toBe("NG15 7AA");
    expect(isHucknallBusinessPostcode(value)).toBe(true);
  });
  it.each(["", "NG15", "NG150 7AA", "NG1 5AA", "NG16 7AA", "NG15 7CI", "NG15 anything", null])("does not enroll %s", value => {
    expect(isHucknallBusinessPostcode(value)).toBe(false);
  });
  it.each(["SW1A 1AA", "M1 1AE", "NG16 1AA", "GIR 0AA"])("accepts a nonlocal UK format %s without enrolling it", value => {
    expect(isValidBusinessPostcode(value)).toBe(true);
    expect(isHucknallBusinessPostcode(value)).toBe(false);
  });
});

describe("local hub consent and lifecycle", () => {
  const eligible = { cardType: "BUSINESS", businessPostcode: "NG15 7AA", isPublished: true, showInDiscover: true };
  it("enrolls an opted-in published business without any payment requirement", () => {
    expect(getLocalHubPath(eligible)).toBe(HUCKNALL_HUB_PATH);
  });
  it.each([{ showInDiscover: false }, { isPublished: false }, { archivedAt: new Date() },
    { cardType: "PERSONAL" }, { cardType: "CREATOR" }, { businessPostcode: "NG16 1AA" }, { businessPostcode: null }])("removes a listing when eligibility changes: %j", change => {
    expect(getLocalHubPath({ ...eligible, ...change })).toBeNull();
  });
});

describe("earned directory ranking", () => {
  it("excludes the existing paid membership point", () => {
    const signals = [
      { id: "verified-connections" as const, label: "", description: "", scoreContribution: 3 },
      { id: "bcn-member" as const, label: "", description: "", scoreContribution: 1 }
    ];
    expect(directoryCircleTrustScore({ signals })).toBe(3);
    expect(directoryCircleTrustScore({ signals: signals.slice(0, 1) })).toBe(3);
  });
  it("ranks trust before names, includes zero-score newcomers and resolves ties consistently", () => {
    const business = (name: string, trustScore: number): LocalHubBusiness => ({ id: name, name,
      slug: name.toLowerCase(), trustScore, description: null, category: "shopping", verifiedTestimonials: 0 });
    const original = [business("Zebra", 5), business("Beta", 0), business("Alpha", 0), business("Able", 3)];
    expect(sortLocalHubBusinesses(original).map(item => item.name)).toEqual(["Zebra", "Able", "Alpha", "Beta"]);
    expect(original[0].name).toBe("Zebra");
  });
});
