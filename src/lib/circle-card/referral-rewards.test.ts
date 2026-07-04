import { describe, expect, it } from "vitest";
import { calculateCircleCardMonthlyCommissions } from "@/lib/circle-card/referral-rewards";

function referrals(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    referralId: `referral_${index + 1}`,
    referredUserId: `user_${index + 1}`,
    convertedToProAt: new Date(Date.UTC(2026, 0, index + 1)),
    entitlementSource: "BCN_INCLUDED_PRO"
  }));
}

describe("Circle Card monthly commission calculation", () => {
  it("applies the Founding Ambassador £3, £2 and £1 tiers", () => {
    const result = calculateCircleCardMonthlyCommissions({
      referrerType: "FOUNDING_AMBASSADOR",
      activeProReferrals: referrals(17),
      currentMonth: new Date("2026-07-20T12:00:00.000Z")
    });

    expect(result.slice(0, 10).every((row) => row.amountPence === 300)).toBe(true);
    expect(result.slice(10, 15).every((row) => row.amountPence === 200)).toBe(true);
    expect(result.slice(15).every((row) => row.amountPence === 100)).toBe(true);
    expect(result[0]?.tierApplied).toBe("FOUNDING_FIRST_10");
    expect(result[10]?.tierApplied).toBe("FOUNDING_NEXT_5");
    expect(result[15]?.tierApplied).toBe("FOUNDING_ADDITIONAL");
  });

  it("pays Standard referrers £1 for every active Pro referral", () => {
    const result = calculateCircleCardMonthlyCommissions({
      referrerType: "STANDARD",
      activeProReferrals: referrals(4)
    });

    expect(result).toHaveLength(4);
    expect(result.every((row) => row.amountPence === 100 && row.tierApplied === "STANDARD")).toBe(true);
  });

  it("returns no commission when there are no active Pro referrals", () => {
    expect(
      calculateCircleCardMonthlyCommissions({
        referrerType: "STANDARD",
        activeProReferrals: []
      })
    ).toEqual([]);
  });
});
