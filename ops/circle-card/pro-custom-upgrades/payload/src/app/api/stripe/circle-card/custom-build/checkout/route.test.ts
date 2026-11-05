import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({origin:vi.fn(),auth:vi.fn(),rate:vi.fn(),checkout:vi.fn()}));
vi.mock("@/lib/security/origin",()=>({isTrustedOrigin:mocks.origin}));
vi.mock("@/lib/auth/api",()=>({requireApiUser:mocks.auth}));
vi.mock("@/lib/security/rate-limit",()=>({consumeRateLimit:mocks.rate,rateLimitHeaders:()=>({})}));
vi.mock("@/lib/circle-card/pricing",()=>({getCircleCardBillingReadiness:()=>({billingEnabled:true,proLaunchConfigured:true}),canUserStartCircleCardCheckout:()=>true}));
vi.mock("@/lib/security/logging",()=>({logServerError:vi.fn()}));
vi.mock("@/server/circle-card/custom-build.service",async ()=>{
  const { z }=await import("zod");
  return {
    createCustomBuildCheckout:mocks.checkout,
    customBuildCheckoutSchema:z.object({cardId:z.string().min(1),brief:z.string().min(20),termsAccepted:z.literal(true)}).strict(),
    CustomBuildError:class extends Error { status=403; }
  };
});
import { POST } from "./route";
const body={cardId:"card",brief:"Please use our blue branding and supplied images.",termsAccepted:true};
const request=(input:unknown=body)=>new Request("https://circlecard.co.uk/api/stripe/circle-card/custom-build/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
beforeEach(()=>{
  mocks.origin.mockReturnValue(true);mocks.auth.mockResolvedValue({user:{id:"owner",email:"owner@example.com"}});
  mocks.rate.mockResolvedValue({allowed:true});mocks.checkout.mockResolvedValue({url:"https://checkout.stripe.com/c/pay/example"});
});
describe("guarded custom design checkout route",()=>{
  it("rejects an untrusted origin",async()=>{mocks.origin.mockReturnValue(false);expect((await POST(request())).status).toBe(403);expect(mocks.auth).not.toHaveBeenCalled();});
  it("requires authentication before checkout",async()=>{mocks.auth.mockResolvedValue({response:new Response("sign in",{status:401})});expect((await POST(request())).status).toBe(401);expect(mocks.checkout).not.toHaveBeenCalled();});
  it("rejects price tampering and missing terms",async()=>{
    for(const input of [{...body,price:1},{...body,termsAccepted:false}]){
      expect((await POST(request(input))).status).toBe(400);
    }expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it("rate limits checkout attempts",async()=>{mocks.rate.mockResolvedValue({allowed:false});expect((await POST(request())).status).toBe(429);expect(mocks.checkout).not.toHaveBeenCalled();});
  it("passes only server-authenticated ownership to the purchase service",async()=>{
    expect((await POST(request())).status).toBe(200);
    expect(mocks.checkout).toHaveBeenCalledWith({id:"owner",email:"owner@example.com"},body);
  });
});
