import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({auth:vi.fn(),user:vi.fn(),cards:vi.fn(),access:vi.fn(),orders:vi.fn()}));
vi.mock("@/auth",()=>({auth:mocks.auth}));
vi.mock("@/lib/prisma",()=>({prisma:{user:{findUnique:mocks.user},circleCard:{findMany:mocks.cards}}}));
vi.mock("@/server/circle-card/billing.service",()=>({loadCircleCardAccessForUser:mocks.access}));
vi.mock("@/server/circle-card/custom-build.service",()=>({loadCustomBuildOrders:mocks.orders}));
vi.mock("@/lib/circle-card/pricing",()=>({getCircleCardBillingReadiness:()=>({billingEnabled:true,proLaunchConfigured:true}),canUserStartCircleCardCheckout:()=>true}));
import { CustomBuildOffer } from "./custom-build-offer";
const paid={hasProAccess:true,isInRecoveryGrace:false,accessEndsAt:new Date("2035-01-01"),entitlement:{hasPaidCircleCardSubscription:true}};
beforeEach(()=>{
  mocks.auth.mockResolvedValue({user:{id:"owner"}});
  mocks.user.mockResolvedValue({id:"owner",suspended:false});
  mocks.cards.mockResolvedValue([{id:"card",fullName:"Local Business",businessName:null}]);
  mocks.orders.mockResolvedValue([]);mocks.access.mockResolvedValue(paid);
});
describe("custom design upgrade offer",()=>{
  it("explains price and locks purchase for visitors",async()=>{
    mocks.auth.mockResolvedValue(null);
    const html=renderToStaticMarkup(await CustomBuildOffer());
    expect(html).toContain("£49.99");expect(html).toContain("£9.99/month");
    expect(html).toContain("Sign in to continue");expect(html).not.toContain("Order custom design");
  });
  it("does not offer purchase to Free or complimentary Pro",async()=>{
    for(const access of [{...paid,hasProAccess:false},{...paid,entitlement:{hasPaidCircleCardSubscription:false}}]){
      mocks.access.mockResolvedValue(access);
      const html=renderToStaticMarkup(await CustomBuildOffer());
      expect(html).toContain("Unlock with active paid Pro");expect(html).not.toContain("Order custom design");
    }
  });
  it("offers the fixed-price design brief form to a paid subscriber",async()=>{
    const html=renderToStaticMarkup(await CustomBuildOffer());
    expect(html).toContain("Order custom design");expect(html).toContain("Which card");
    expect(html).toContain("one round of changes");
  });
  it("shows an existing paid order instead of selling the design again",async()=>{
    mocks.orders.mockResolvedValue([{id:"order",cardId:"card",paymentStatus:"PAID",brief:"Use our blue logo and supplied photos."}]);
    const html=renderToStaticMarkup(await CustomBuildOffer());
    expect(html).toContain("View your design order");expect(html).not.toContain("Order custom design");
  });
  it("explains saved designs and paid-period cancellation",async()=>{
    const html=renderToStaticMarkup(await CustomBuildOffer());
    expect(html).toContain("until the paid period ends");
    expect(html).toContain("keep the design and content saved");
    expect(html).toContain("no repeat £49.99 design fee");
  });
});
