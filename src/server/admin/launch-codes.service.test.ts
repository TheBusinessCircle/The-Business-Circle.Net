import { beforeEach, describe, expect, it, vi } from "vitest";
import { LaunchCodeStatus, MembershipTier } from "@prisma/client";

const dbMock = vi.hoisted(() => {
  const tx = {
    launchCodeRedemption: {
      count: vi.fn(),
      findFirst: vi.fn()
    }
  };

  return {
    tx,
    launchCode: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn()
    },
    launchCodeRedemption: {
      updateMany: vi.fn()
    },
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx))
  };
});

vi.mock("@/lib/db", () => ({
  db: dbMock
}));

import {
  buildLaunchCodeAnalyticsMetadata,
  DEFAULT_LAUNCH_CODES,
  seedDefaultLaunchCodes,
  validateLaunchCode
} from "@/server/admin/launch-codes.service";

function activeCode(overrides: Record<string, unknown> = {}) {
  return {
    id: "launch_code_1",
    code: "FACEBOOK25",
    name: "Facebook Founder Access",
    platform: "FACEBOOK",
    status: LaunchCodeStatus.ACTIVE,
    maxRedemptions: 25,
    trialDays: 90,
    startsAt: null,
    endsAt: null,
    ...overrides
  };
}

describe("launch-codes.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.launchCodeRedemption.updateMany.mockResolvedValue({ count: 0 });
    dbMock.launchCode.updateMany.mockResolvedValue({ count: 0 });
    dbMock.tx.launchCodeRedemption.count.mockResolvedValue(0);
    dbMock.tx.launchCodeRedemption.findFirst.mockResolvedValue(null);
  });

  it("validates an active code with remaining places", async () => {
    dbMock.launchCode.findUnique.mockResolvedValue(activeCode());

    const result = await validateLaunchCode({
      code: " facebook25 ",
      email: "member@example.com"
    });

    expect(result).toEqual({
      valid: true,
      launchCode: {
        id: "launch_code_1",
        code: "FACEBOOK25",
        name: "Facebook Founder Access",
        platform: "FACEBOOK",
        trialDays: 90,
        maxRedemptions: 25,
        remainingUses: 25
      }
    });
  });

  it("never includes the redeemable launch code in analytics metadata", () => {
    const codeCanary = "PRIVATE-LAUNCH-CODE";
    const metadata = buildLaunchCodeAnalyticsMetadata({
      platform: "PARTNER",
      selectedTier: MembershipTier.FOUNDATION,
      launchCodeId: "launch_code_1",
      trialDays: 30,
      code: codeCanary
    } as Parameters<typeof buildLaunchCodeAnalyticsMetadata>[0] & { code: string });

    expect(metadata).not.toHaveProperty("code");
    expect(JSON.stringify(metadata)).not.toContain(codeCanary);
  });

  it("rejects an invalid code", async () => {
    dbMock.launchCode.findUnique.mockResolvedValue(null);

    await expect(validateLaunchCode({ code: "NOPE25" })).resolves.toEqual({
      valid: false,
      reason: "invalid"
    });
  });

  it("rejects a paused code", async () => {
    dbMock.launchCode.findUnique.mockResolvedValue(
      activeCode({ status: LaunchCodeStatus.PAUSED })
    );

    await expect(validateLaunchCode({ code: "FACEBOOK25" })).resolves.toEqual({
      valid: false,
      reason: "paused"
    });
  });

  it("marks and rejects a full code", async () => {
    dbMock.launchCode.findUnique.mockResolvedValue(activeCode());
    dbMock.tx.launchCodeRedemption.count.mockResolvedValue(25);

    await expect(validateLaunchCode({ code: "FACEBOOK25" })).resolves.toEqual({
      valid: false,
      reason: "full"
    });
    expect(dbMock.launchCode.updateMany).toHaveBeenCalledWith({
      where: { id: "launch_code_1", status: LaunchCodeStatus.ACTIVE },
      data: { status: LaunchCodeStatus.FULL }
    });
  });

  it("rejects an expired code", async () => {
    dbMock.launchCode.findUnique.mockResolvedValue(
      activeCode({ endsAt: new Date(Date.now() - 1000) })
    );

    await expect(validateLaunchCode({ code: "FACEBOOK25" })).resolves.toEqual({
      valid: false,
      reason: "expired"
    });
  });

  it("prevents duplicate successful redemption by email", async () => {
    dbMock.launchCode.findUnique.mockResolvedValue(activeCode());
    dbMock.tx.launchCodeRedemption.findFirst.mockResolvedValue({ id: "redemption_1" });

    await expect(
      validateLaunchCode({
        code: "FACEBOOK25",
        email: "member@example.com"
      })
    ).resolves.toEqual({
      valid: false,
      reason: "already-used"
    });
  });

  it("seeds default launch codes idempotently", async () => {
    dbMock.launchCode.upsert.mockImplementation(async (input: unknown) => input);

    await seedDefaultLaunchCodes();

    expect(dbMock.launchCode.upsert).toHaveBeenCalledTimes(DEFAULT_LAUNCH_CODES.length);
    expect(dbMock.launchCode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: "FACEBOOK25" },
        create: expect.objectContaining({
          code: "FACEBOOK25",
          platform: "FACEBOOK",
          maxRedemptions: 25,
          trialDays: 90,
          status: LaunchCodeStatus.ACTIVE
        })
      })
    );
  });
});
