import { describe, expect, it } from "vitest";
import { shouldStoreCircleCardReferralAttribution } from "@/lib/circle-card/referral-engine";

describe("Circle Card browser referral attribution", () => {
  it("stores the first valid attribution", () => {
    expect(
      shouldStoreCircleCardReferralAttribution({
        hasExistingAttribution: false,
        nextSourceType: "spin_to_connect"
      })
    ).toBe(true);
  });

  it("does not overwrite an earlier attribution on a later visit", () => {
    expect(
      shouldStoreCircleCardReferralAttribution({
        hasExistingAttribution: true,
        nextSourceType: "public_card_ref",
        hasExplicitReferralCode: true
      })
    ).toBe(false);
  });
});
