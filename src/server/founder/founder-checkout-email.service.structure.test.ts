import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("founder checkout email workflow structure", () => {
  it("validates checkout email inputs, creates Stripe checkout, sends email, and logs the result", () => {
    const service = readSource("src/server/founder/founder-checkout-email.service.ts");
    const action = readSource("src/actions/admin/founder-service.actions.ts");

    expect(action).toContain("sendFounderServiceCheckoutEmailAction");
    expect(service).toContain("checkout-email-address-missing");
    expect(service).toContain("checkout-email-price-missing");
    expect(service).toContain("createFounderServiceCheckoutSession");
    expect(service).toContain("sendTransactionalEmailOrThrow");
    expect(service).toContain("FounderServiceEmailLogStatus.SENT");
    expect(service).toContain("stripeCheckoutSessionId: checkout.id");
    expect(service).toContain("stripeCheckoutUrl: checkout.url");
    expect(service).toContain("replyTo: publicReplyToAddress()");
  });

  it("keeps the Stripe metadata and mode rules wired to founder services", () => {
    const payment = readSource("src/server/founder/founder-payment.service.ts");

    expect(payment).toContain('mode: isMonthlyRetainer ? "subscription" : "payment"');
    expect(payment).toContain('source: "admin_founder_services_checkout_email"');
    expect(payment).toContain("founderServiceClientId: request.id");
    expect(payment).toContain("founderServiceName: request.service.title");
    expect(payment).toContain("customer_email: request.email");
    expect(payment).toContain("promotion_code: adminDiscountCode.stripePromotionCodeId");
  });
});
