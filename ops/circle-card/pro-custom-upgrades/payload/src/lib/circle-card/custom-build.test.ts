import { describe, expect, it } from "vitest";
import { hasPaidProForCustomBuild, canShowPurchasedCustomDesign } from "./custom-build";
import type { CircleCardAccessSnapshot } from "./permissions";
const now = new Date("2026-11-05T12:00:00Z");
const paid = {
  hasProAccess:true, isInRecoveryGrace:false, accessEndsAt:new Date("2026-12-05T12:00:00Z"),
  entitlement:{hasPaidCircleCardSubscription:true}
} as CircleCardAccessSnapshot;
describe("paid custom design access", () => {
  it("allows a current paid subscriber", () => expect(hasPaidProForCustomBuild(paid,now)).toBe(true));
  it("rejects complimentary or trial Pro", () => expect(hasPaidProForCustomBuild({...paid,entitlement:{...paid.entitlement,hasPaidCircleCardSubscription:false}},now)).toBe(false));
  it("rejects payment recovery without a current paid period", () => expect(hasPaidProForCustomBuild({...paid,isInRecoveryGrace:true},now)).toBe(false));
  it("expires exactly at the paid-through time", () => expect(hasPaidProForCustomBuild({...paid,accessEndsAt:now},now)).toBe(false));
  it("does not immediately revoke a scheduled cancellation", () => expect(hasPaidProForCustomBuild({...paid,cancelAtPeriodEnd:true} as CircleCardAccessSnapshot,now)).toBe(true));
  it("hides and restores the same purchased design without another purchase", () => {
    const order = {paymentStatus:"PAID",buildStatus:"COMPLETE"};
    expect(canShowPurchasedCustomDesign(order,{...paid,accessEndsAt:now},now)).toBe(false);
    expect(canShowPurchasedCustomDesign(order,paid,now)).toBe(true);
    expect(order).toEqual({paymentStatus:"PAID",buildStatus:"COMPLETE"});
  });
  it.each(["PENDING","PROCESSING","REFUNDED","DISPUTED"])("does not activate a %s order", paymentStatus => {
    expect(canShowPurchasedCustomDesign({paymentStatus,buildStatus:"COMPLETE"},paid,now)).toBe(false);
  });
  it("leaves existing designs to their existing Pro rules", () => expect(canShowPurchasedCustomDesign(null,paid,now)).toBe(true));
  it("does not remove a self-service design merely because checkout was opened", () => {
    expect(canShowPurchasedCustomDesign({paymentStatus:"PENDING",buildStatus:"AWAITING_PAYMENT"},paid,now)).toBe(true);
  });
});
