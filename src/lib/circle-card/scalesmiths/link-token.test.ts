import { describe, expect, it } from "vitest";
import {
  createScaleSmithsLinkToken, hashScaleSmithsLinkToken,
  isValidScaleSmithsExternalId, linkChallengeIsUsable
} from "./link-token";

describe("single-use ScaleSmiths partner linking", () => {
  it("creates strong tokens, stores only a digest, and generates distinct tokens", () => {
    const a = createScaleSmithsLinkToken();
    const b = createScaleSmithsLinkToken();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toBe(b);
    expect(hashScaleSmithsLinkToken(a)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashScaleSmithsLinkToken(a)).not.toBe(a);
  });

  it("rejects a challenge for the wrong account or partner and expired/reused challenges", () => {
    const base = {
      expectedUserId: "u1", challengeUserId: "u1",
      expectedPartnerId: "partner-22", challengePartnerId: "partner-22",
      consumedAt: null, expiresAt: new Date("2026-11-21T11:00:00Z"),
      now: new Date("2026-11-21T10:55:00Z")
    };
    expect(linkChallengeIsUsable(base)).toBe(true);
    expect(linkChallengeIsUsable({ ...base, challengeUserId: "u2" })).toBe(false);
    expect(linkChallengeIsUsable({ ...base, challengePartnerId: "partner-99" })).toBe(false);
    expect(linkChallengeIsUsable({ ...base, consumedAt: base.now })).toBe(false);
    expect(linkChallengeIsUsable({ ...base, now: base.expiresAt })).toBe(false);
  });

  it("rejects path/control characters in partner identifiers", () => {
    expect(isValidScaleSmithsExternalId("partner-123")).toBe(true);
    expect(isValidScaleSmithsExternalId("../../admin")).toBe(false);
    expect(isValidScaleSmithsExternalId("partner 123")).toBe(false);
  });
});
