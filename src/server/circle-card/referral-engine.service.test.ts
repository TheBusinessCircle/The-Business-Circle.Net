import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/circle-card/plan-policy.service", () => ({
  isPublicCircleCardTargetWithinOwnerPlan: vi.fn().mockResolvedValue(true)
}));

const userFindUniqueMock = vi.hoisted(() => vi.fn());
const referralFindUniqueMock = vi.hoisted(() => vi.fn());
const referralFindFirstMock = vi.hoisted(() => vi.fn());
const referralUpdateMock = vi.hoisted(() => vi.fn());
const referralCountMock = vi.hoisted(() => vi.fn());
const notificationFindFirstMock = vi.hoisted(() => vi.fn());
const notificationCreateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUniqueMock },
    circleCardGrowthReferral: {
      findUnique: referralFindUniqueMock,
      findFirst: referralFindFirstMock,
      update: referralUpdateMock,
      count: referralCountMock
    },
    circleCardNotification: {
      findFirst: notificationFindFirstMock,
      create: notificationCreateMock
    }
  }
}));

import { attributeCircleCardReferralSignup } from "@/server/circle-card/referral-engine.service";

describe("Circle Card referral attribution safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindUniqueMock.mockResolvedValue({ id: "referred_1" });
    referralFindUniqueMock.mockResolvedValue(null);
    referralCountMock.mockResolvedValue(2);
    notificationFindFirstMock.mockResolvedValue({ id: "existing-notification" });
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

  it("attaches a valid referral click to the new user", async () => {
    referralFindFirstMock.mockResolvedValue({
      id: "click_1",
      referrerUserId: "referrer_1",
      referrerCardId: "card_1",
      referralCode: "valid-code",
      referralSource: "spin_to_connect",
      proInterestAt: null,
      teamsInterestAt: null,
      metadata: { sourceCardSlug: "origin-card" }
    });
    referralUpdateMock.mockResolvedValue({ id: "click_1" });

    await expect(
      attributeCircleCardReferralSignup({
        referredUserId: "referred_1",
        referralClickId: "click_1",
        sourceType: "spin_to_connect",
        sourceCardSlug: "origin-card",
        sourceEvent: "SPIN_COMPLETED"
      })
    ).resolves.toEqual({ attributed: true, referralId: "click_1" });
    expect(referralUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "click_1" },
        data: expect.objectContaining({
          referredUserId: "referred_1",
          activationStatus: "SIGNED_UP"
        })
      })
    );
  });
});
