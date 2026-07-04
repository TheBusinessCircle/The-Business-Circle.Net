import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOwnerMock = vi.hoisted(() => vi.fn());
const generateMock = vi.hoisted(() => vi.fn());
const statusMock = vi.hoisted(() => vi.fn());
const profileMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/circle-card/commission.service", () => ({
  requireCircleCardCommissionOwner: requireOwnerMock,
  generateCurrentMonthCircleCardCommissionLedger: generateMock,
  updateCircleCardCommissionStatus: statusMock,
  updateCircleCardAmbassadorProfile: profileMock
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

import {
  generateCircleCardCommissionLedgerAction,
  markCircleCardCommissionPaidAction,
  voidCircleCardCommissionAction
} from "@/actions/admin/circle-card-commission.actions";

describe("Circle Card commission owner actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOwnerMock.mockResolvedValue({ user: { id: "owner_1" } });
    generateMock.mockResolvedValue({ createdRows: 1 });
  });

  it("blocks ledger generation when owner access is rejected", async () => {
    requireOwnerMock.mockRejectedValueOnce(new Error("Platform owner access required."));
    await expect(generateCircleCardCommissionLedgerAction()).rejects.toThrow(
      "Platform owner access required."
    );
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("generates the ledger only after owner access succeeds", async () => {
    await generateCircleCardCommissionLedgerAction();
    expect(requireOwnerMock).toHaveBeenCalledTimes(1);
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it("records manual paid and void states without triggering payouts", async () => {
    const paid = new FormData();
    paid.set("ledgerId", "ledger_paid");
    await markCircleCardCommissionPaidAction(paid);

    const voided = new FormData();
    voided.set("ledgerId", "ledger_void");
    await voidCircleCardCommissionAction(voided);

    expect(statusMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      ledgerId: "ledger_paid",
      status: "PAID",
      reviewedById: "owner_1"
    }));
    expect(statusMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      ledgerId: "ledger_void",
      status: "VOID",
      reviewedById: "owner_1"
    }));
  });
});
