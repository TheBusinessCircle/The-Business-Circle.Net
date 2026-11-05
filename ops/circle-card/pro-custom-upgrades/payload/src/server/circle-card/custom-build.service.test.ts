import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { CustomBuildOrder } from "@/lib/circle-card/custom-build";
const mocks = vi.hoisted(()=>({
  query:vi.fn(), execute:vi.fn(), transaction:vi.fn(), findCard:vi.fn(), access:vi.fn(),
  customer:vi.fn(), create:vi.fn(), retrieve:vi.fn(), intent:vi.fn(), charge:vi.fn(), disputes:vi.fn()
}));
vi.mock("server-only",()=>({}));
vi.mock("@/config/runtime-brand",()=>({getRuntimeBrand:()=>({key:"circle-card",canonicalOrigin:"https://circlecard.co.uk"})}));
vi.mock("@/lib/prisma",()=>({prisma:{
  $queryRaw:mocks.query,$executeRaw:mocks.execute,$transaction:mocks.transaction,
  circleCard:{findFirst:mocks.findCard}
}}));
vi.mock("./billing.service",()=>({loadCircleCardAccessForUser:mocks.access,ensureCircleCardStripeCustomerId:mocks.customer}));
vi.mock("@/server/stripe/client",()=>({requireStripeClient:()=>({
  checkout:{sessions:{create:mocks.create,retrieve:mocks.retrieve}},
  paymentIntents:{retrieve:mocks.intent},charges:{retrieve:mocks.charge},disputes:{list:mocks.disputes}
})}));
import { createCustomBuildCheckout, reconcileCustomBuildOrder, processCustomBuildStripeEvent, customBuildCheckoutSchema } from "./custom-build.service";

const user = {id:"owner",email:"owner@example.com"};
const input = {cardId:"card",brief:"Please use our blue branding and our review link.",termsAccepted:true as const};
let row: CustomBuildOrder;
let provider: Record<string,unknown>;
const sqlText = (sql:TemplateStringsArray)=>sql.join("?");
beforeEach(()=>{
  vi.stubEnv("STRIPE_SECRET_KEY","sk_test_unit_fixture_only");
  row = {
    id:"order",userId:"owner",cardId:"card",customerId:"cus_circle",amountPence:4999,currency:"gbp",checkoutSessionId:null,checkoutAttempt:0,
    paymentIntentId:null,paymentStatus:"PENDING",buildStatus:"AWAITING_PAYMENT",brief:input.brief,
    termsVersion:"2026-11-05",termsAcceptedAt:new Date(),paidAt:null,createdAt:new Date(),updatedAt:new Date()
  };
  mocks.access.mockResolvedValue({hasProAccess:true,isInRecoveryGrace:false,accessEndsAt:new Date(Date.now()+86400000),entitlement:{hasPaidCircleCardSubscription:true}});
  mocks.findCard.mockResolvedValue({id:"card"});
  mocks.customer.mockResolvedValue("cus_circle");
  const metadata = {product:"circle_card_custom_build",orderId:"order",userId:"owner",cardId:"card"};
  provider = {id:"cs_one",mode:"payment",status:"complete",payment_status:"paid",currency:"gbp",amount_total:4999,
    customer:"cus_circle",client_reference_id:"order",metadata,
    payment_intent:{id:"pi_one",status:"succeeded",currency:"gbp",amount_received:4999,customer:"cus_circle",metadata,
      latest_charge:{id:"ch_one",payment_intent:"pi_one",customer:"cus_circle",disputed:false,refunded:false,amount_refunded:0}}
  };
  mocks.retrieve.mockImplementation(async()=>provider);
  mocks.create.mockResolvedValue({id:"cs_one",customer:"cus_circle",url:"https://checkout.stripe.com/c/pay/cs_one"});
  mocks.disputes.mockResolvedValue({data:[]});
  mocks.query.mockImplementation(async(sql:TemplateStringsArray,...values:unknown[])=>{
    const text=sqlText(sql);
    if(text.includes('WHERE "checkoutSessionId"=') && row.checkoutSessionId !== values[0]) return [];
    if(text.includes('WHERE "paymentIntentId"=') && row.paymentIntentId !== values[0]) return [];
    return [{...row}];
  });
  mocks.execute.mockImplementation(async(sql:TemplateStringsArray,...values:unknown[])=>{
    const text=sqlText(sql);
    if(text.includes('SET "checkoutSessionId"=')) { row.checkoutSessionId=String(values[0]);row.checkoutAttempt=Number(values[1]); }
    else if(text.includes('"paymentIntentId"=')) {
      row.paymentStatus=values[0] as CustomBuildOrder["paymentStatus"];row.paymentIntentId=String(values[1]);row.paidAt ??= new Date();
      if(row.buildStatus==="AWAITING_PAYMENT"&&row.paymentStatus==="PAID")row.buildStatus="QUEUED";
    } else if(text.includes('SET "paymentStatus"=')) row.paymentStatus=values[0] as CustomBuildOrder["paymentStatus"];
    return 1;
  });
  mocks.transaction.mockImplementation(async(callback:(tx:unknown)=>Promise<unknown>)=>callback({$queryRaw:mocks.query,$executeRaw:mocks.execute}));
});
describe("custom design purchase",()=>{
  it("refuses a non-paying Pro account before creating checkout or an order",async()=>{
    mocks.access.mockResolvedValue({hasProAccess:true,isInRecoveryGrace:false,accessEndsAt:null,entitlement:{hasPaidCircleCardSubscription:false}});
    await expect(createCustomBuildCheckout(user,input)).rejects.toMatchObject({status:403});
    expect(mocks.create).not.toHaveBeenCalled();expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("rejects another member's card",async()=>{
    mocks.findCard.mockResolvedValue(null);
    await expect(createCustomBuildCheckout(user,input)).rejects.toMatchObject({status:404});
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects browser-supplied price, currency or product overrides",()=>{
    expect(customBuildCheckoutSchema.safeParse({...input,amount:1,currency:"usd"}).success).toBe(false);
  });
  it("creates one fixed-price checkout and reuses it on a second click",async()=>{
    await createCustomBuildCheckout(user,input);
    provider={...provider,status:"open",url:"https://checkout.stripe.com/c/pay/cs_one"};
    const second=await createCustomBuildCheckout(user,input);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(second.existingOrder).toBe(true);
    const [params,options]=mocks.create.mock.calls[0];
    expect(params.mode).toBe("payment");
    expect(params.line_items).toMatchObject([{quantity:1,price_data:{unit_amount:4999,currency:"gbp"}}]);
    expect(params.payment_method_types).toBeUndefined();
    expect(options.idempotencyKey).toBe("circle-custom-build:order:1");
    expect(mocks.query.mock.calls.some(([sql])=>sqlText(sql).includes("FOR UPDATE"))).toBe(true);
  });
  it("does not charge again for an existing paid design",async()=>{
    row.paymentStatus="PAID";
    const result=await createCustomBuildCheckout(user,input);
    expect(result.url).toBe("/app/upgrades/custom-build?order=order");
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
describe("custom design payment confirmation",()=>{
  beforeEach(()=>{row.checkoutSessionId="cs_one";});
  it("queues a verified paid order and preserves completed work on replay",async()=>{
    expect(await reconcileCustomBuildOrder(row)).toMatchObject({paymentStatus:"PAID",buildStatus:"QUEUED",paymentIntentId:"pi_one"});
    row.buildStatus="COMPLETE";
    await reconcileCustomBuildOrder(row);
    expect(row.buildStatus).toBe("COMPLETE");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("keeps delayed unpaid checkout processing",async()=>{
    provider={...provider,payment_status:"unpaid"};
    expect(await reconcileCustomBuildOrder(row)).toMatchObject({paymentStatus:"PROCESSING",buildStatus:"AWAITING_PAYMENT"});
  });
  it("marks an authoritatively failed delayed payment as failed",async()=>{
    provider={...provider,payment_status:"unpaid",payment_intent:{...(provider.payment_intent as object),status:"requires_payment_method"}};
    await processCustomBuildStripeEvent({type:"checkout.session.async_payment_failed",livemode:false,data:{object:{id:"cs_one"}}} as Stripe.Event);
    expect(row.paymentStatus).toBe("FAILED");
    expect(row.buildStatus).toBe("AWAITING_PAYMENT");
  });
  it.each([{amount_total:1},{currency:"usd"},{customer:"cus_someone_else"},{metadata:{product:"circle_card_custom_build",orderId:"forged"}}])("rejects an invalid provider payment %#",async(change)=>{
    provider={...provider,...change};
    await expect(reconcileCustomBuildOrder(row)).rejects.toThrow();
    expect(row.paymentStatus).toBe("PENDING");
  });
  it("does not activate from a forged return or unbound event",async()=>{
    expect(await processCustomBuildStripeEvent({type:"checkout.session.completed",livemode:false,data:{object:{id:"cs_forged"}}} as Stripe.Event)).toBe(false);
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
  it("requires the Stripe event mode to match",async()=>{
    await expect(processCustomBuildStripeEvent({type:"checkout.session.completed",livemode:true,data:{object:{id:"cs_one"}}} as Stripe.Event)).rejects.toThrow("mode mismatch");
  });
  it("fulfils delayed success through the same verified provider path",async()=>{
    expect(await processCustomBuildStripeEvent({type:"checkout.session.async_payment_succeeded",livemode:false,data:{object:{id:"cs_one"}}} as Stripe.Event)).toBe(true);
    expect(row.paymentStatus).toBe("PAID");
  });
  it("keeps refunded designs inactive even when a completed event is replayed",async()=>{
    const intent=provider.payment_intent as Record<string,unknown>;
    intent.latest_charge={...(intent.latest_charge as object),refunded:true,amount_refunded:4999};
    await reconcileCustomBuildOrder(row);
    await processCustomBuildStripeEvent({type:"checkout.session.completed",livemode:false,data:{object:{id:"cs_one"}}} as Stripe.Event);
    expect(row.paymentStatus).toBe("REFUNDED");
  });
  it("suspends an open dispute and restores a won dispute",async()=>{
    const intent=provider.payment_intent as Record<string,unknown>;
    intent.latest_charge={...(intent.latest_charge as object),disputed:true};
    mocks.disputes.mockResolvedValue({data:[{status:"under_review"}]});
    await reconcileCustomBuildOrder(row);expect(row.paymentStatus).toBe("DISPUTED");
    mocks.disputes.mockResolvedValue({data:[{status:"won"}]});
    await reconcileCustomBuildOrder(row);expect(row.paymentStatus).toBe("PAID");
  });
  it("keeps a disputed charge inactive when provider dispute details are unavailable",async()=>{
    const intent=provider.payment_intent as Record<string,unknown>;
    intent.latest_charge={...(intent.latest_charge as object),disputed:true};
    mocks.disputes.mockResolvedValue({data:[]});
    await reconcileCustomBuildOrder(row);expect(row.paymentStatus).toBe("DISPUTED");
  });
  it("does not let an old unpaid observation erase paid fulfilment",async()=>{
    row.paymentStatus="PAID";row.buildStatus="COMPLETE";
    provider={...provider,payment_status:"unpaid",status:"expired"};
    await reconcileCustomBuildOrder(row);
    expect(row.paymentStatus).toBe("PAID");expect(row.buildStatus).toBe("COMPLETE");
  });
});
