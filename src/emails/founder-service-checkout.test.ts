import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FounderServiceCheckoutEmail } from "@/emails/founder-service-checkout";

describe("founder service checkout email", () => {
  it("renders the branded checkout content", () => {
    const markup = renderToStaticMarkup(
      createElement(FounderServiceCheckoutEmail, {
        recipientName: "Alex Founder",
        body: "Hi Alex,\n\nThanks for reaching out about the Clarity Audit.",
        serviceName: "BCN Clarity Audit",
        priceAmount: 49500,
        currency: "GBP",
        discountCode: "INNER10",
        checkoutUrl: "https://checkout.stripe.com/c/session_123",
        ctaLabel: "Secure your place"
      })
    );

    expect(markup).toContain("The Business Circle Network");
    expect(markup).toContain("BCN Clarity Audit");
    expect(markup).toContain("£495.00");
    expect(markup).toContain("https://checkout.stripe.com/c/session_123");
    expect(markup).toContain("Secure your place");
    expect(markup).toContain("just reply to this email");
    expect(markup).toContain("The Business Circle Network LTD");
  });
});
