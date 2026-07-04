import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}), { virtual: true });

const userFindUniqueMock = vi.hoisted(() => vi.fn());
const referralFindUniqueMock = vi.hoisted(() => vi.fn());
const referralFindFirstMock = vi.hoisted(() => vi.fn());
const referralUpdateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUniqueMock },
    circleCardGrowthReferral: {
      findUnique: referralFindUniqueMock,
      findFirst: referralFindFirstMock,
      update: referralUpdateMock
    }
  }
}));

import { attributeCircleCardReferralSignup } from "@/server/circle-card/referral-engine.service";

describe("Circle Card referral attribution safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindUniqueMock.mockResolvedValue({ id: "referred_1" });
    referralFindUniqueMock.mockResolvedValue(null);
  });

  it("blocks self-referral attribution", async () => {
    referralFindFirstMock.mockResolvedValue({
      id: "click_1",
      referrerUserId: "referred_1",
      referrerCardId: null,
      referralCode: "self-code",
      referralSource: "referral_link",
      proInterestAt: null,
      teamsInterestAt: null,
      metadata: {}
    });

    await expect(
      attributeCircleCardReferralSignup({
        referredUserId: "referred_1",
        referralClickId: "click_1"
      })
    ).resolves.toEqual({ attributed: false, reason: "self-referral" });
    expect(referralUpdateMock).not.toHaveBeenCalled();
  });

  it("keeps the first attribution and blocks duplicates", async () => {
    referralFindUniqueMock.mockResolvedValue({ id: "existing_referral" });

    await expect(
      attributeCircleCardReferralSignup({
        referredUserId: "referred_1",
        referralCode: "different-code"
      })
    ).resolves.toEqual({ attributed: false, reason: "already-attributed" });
    expect(referralFindFirstMock).not.toHaveBeenCalled();
    expect(referralUpdateMock).not.toHaveBeenCalled();
  });
});
