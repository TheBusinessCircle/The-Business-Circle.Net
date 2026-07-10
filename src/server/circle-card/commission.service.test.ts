import { beforeEach, describe, expect, it, vi } from "vitest";
import { MembershipTier, Role, SubscriptionStatus } from "@prisma/client";

vi.mock("server-only", () => ({}));

const referralFindManyMock = vi.hoisted(() => vi.fn());
const referralUpdateManyMock = vi.hoisted(() => vi.fn());
const ledgerCreateManyMock = vi.hoisted(() => vi.fn());
const ledgerFindManyMock = vi.hoisted(() => vi.fn());
const ledgerUpdateMock = vi.hoisted(() => vi.fn());
const circleCardSubscriptionFindUniqueMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    circleCardGrowthReferral: { findMany: referralFindManyMock },
    circleCardSubscription: { findUnique: circleCardSubscriptionFindUniqueMock },
    circleCardCommissionLedger: {
      findMany: ledgerFindManyMock,
      update: ledgerUpdateMock
    },
    $transaction: transactionMock
  }
}));
vi.mock("@/lib/session", () => ({ requireAdmin: vi.fn() }));

import { generateCurrentMonthCircleCardCommissionLedger } from "@/server/circle-card/commission.service";

describe("Circle Card commission ledger generation", () => {
  const createdKeys = new Set<string>();

  beforeEach(() => {
    vi.clearAllMocks();
    createdKeys.clear();
    ledgerFindManyMock.mockResolvedValue([]);
    circleCardSubscriptionFindUniqueMock.mockResolvedValue(null);
    referralFindManyMock.mockResolvedValue([
      {
        id: "referral_1",
        referrerUserId: "referrer_1",
        referredUserId: "pro_1",
        signedUpAt: new Date("2026-06-01T00:00:00.000Z"),
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
        convertedToProAt: null,
        referrerUser: {
          id: "referrer_1",
          suspended: false,
          circleCardAmbassadorProfile: null
        },
        referredUser: {
          id: "pro_1",
          name: "Pro User",
          email: "pro@example.com",
          role: Role.MEMBER,
          membershipTier: MembershipTier.FOUNDATION,
          suspended: false,
          createdAt: new Date("2026-06-01T00:00:00.000Z"),
          circleCardSubscription: {
            plan: "PRO",
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: new Date("2026-06-15T00:00:00.000Z"),
            currentPeriodEnd: new Date("2026-08-15T00:00:00.000Z"),
            lastInvoicePaidAt: new Date("2026-06-15T00:00:00.000Z"),
            createdAt: new Date("2026-06-15T00:00:00.000Z")
          },
          circleCardAmbassadorProfile: null
        }
      }
    ]);
    ledgerCreateManyMock.mockImplementation(async ({ data }: { data: Array<Record<string, unknown>> }) => {
      let count = 0;
      for (const row of data) {
        const key = `${row.referrerUserId}:${row.referredUserId}:${String(row.periodMonth)}`;
        if (!createdKeys.has(key)) {
          createdKeys.add(key);
          count += 1;
        }
      }
      return { count };
    });
    transactionMock.mockImplementation(async (callback) => callback({
      circleCardGrowthReferral: { updateMany: referralUpdateManyMock },
      circleCardCommissionLedger: { createMany: ledgerCreateManyMock }
    }));
  });

  it("is idempotent for the same referrer, referred user and month", async () => {
    const month = new Date("2026-07-20T12:00:00.000Z");
    const first = await generateCurrentMonthCircleCardCommissionLedger(month);
    const second = await generateCurrentMonthCircleCardCommissionLedger(month);

    expect(first).toMatchObject({ eligibleRows: 1, createdRows: 1, duplicateRowsSkipped: 0 });
    expect(second).toMatchObject({ eligibleRows: 1, createdRows: 0, duplicateRowsSkipped: 1 });
    expect(ledgerCreateManyMock).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });
});
