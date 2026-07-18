import { beforeEach, describe, expect, it, vi } from "vitest";

const reconcileMock = vi.hoisted(() => vi.fn());
const logWarningMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/server/circle-card/billing.service", () => ({
  reconcileCircleCardSubscriptionForUser: reconcileMock
}));
vi.mock("@/lib/security/logging", () => ({
  logServerWarning: logWarningMock
}));

import {
  reconcileCircleCardBillingReturn,
  resolveCircleCardBillingReturnState
} from "@/server/circle-card/billing-return.service";

describe("Circle Card billing return reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reconcileMock.mockResolvedValue({ outcome: "reconciled" });
  });

  it.each(["success", "portal-return"])(
    "reconciles authoritative Stripe state for billing=%s",
    async (billing) => {
      await expect(
        reconcileCircleCardBillingReturn({ userId: "user-1", billing })
      ).resolves.toEqual({ triggered: true, outcome: "reconciled" });
      expect(reconcileMock).toHaveBeenCalledWith("user-1");
    }
  );

  it("does not reconcile for forged or unrelated values", async () => {
    await expect(
      reconcileCircleCardBillingReturn({ userId: "user-1", billing: "success-now-pro" })
    ).resolves.toEqual({ triggered: false, outcome: null });
    expect(reconcileMock).not.toHaveBeenCalled();
  });

  it("rejects repeated values and requires an exact allowlisted state", () => {
    expect(resolveCircleCardBillingReturnState(["portal-return", "success"])).toBeNull();
    expect(resolveCircleCardBillingReturnState(["success"])).toBeNull();
    expect(resolveCircleCardBillingReturnState(["forged", "success"])).toBeNull();
  });

  it.each([
    "success123",
    "Success",
    " success",
    "success ",
    "success#fragment",
    "%73uccess",
    "portal_return",
    "portal-return/"
  ])("rejects non-exact billing return state %s", (billing) => {
    expect(resolveCircleCardBillingReturnState(billing)).toBeNull();
  });

  it("contains reconciliation failures without granting or crashing the page", async () => {
    reconcileMock.mockRejectedValue(new Error("Stripe unavailable"));

    await expect(
      reconcileCircleCardBillingReturn({ userId: "user-1", billing: "success" })
    ).resolves.toEqual({ triggered: true, outcome: "failed" });
    expect(logWarningMock).toHaveBeenCalledWith(
      "circle-card-billing-return-reconciliation-failed",
      expect.objectContaining({ userId: "user-1", returnState: "success" })
    );
  });
});
