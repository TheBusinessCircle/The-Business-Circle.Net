import { describe, expect, it } from "vitest";
import {
  EmailBrandConfigurationError,
  parseEmailMailbox,
  parseEmailSender,
  requiresCircleCardEmailConfiguration,
  resolveEmailBrandIdentity
} from "@/lib/email/brand";

const productionEnvironment = {
  NODE_ENV: "production",
  RESEND_FROM_EMAIL: "The Business Circle Network <noreply@thebusinesscircle.net>",
  RESEND_REPLY_TO_EMAIL: "hello@thebusinesscircle.net",
  PUBLIC_CONTACT_EMAIL: "contact@thebusinesscircle.net",
  CIRCLE_CARD_RESEND_FROM_EMAIL: "Circle Card <noreply@circlecard.co.uk>",
  CIRCLE_CARD_RESEND_REPLY_TO_EMAIL: "support@circlecard.co.uk",
  CIRCLE_CARD_PUBLIC_CONTACT_EMAIL: "support@circlecard.co.uk"
} as const;

describe("email brand identity", () => {
  it("does not require Circle Card configuration for an unconfigured BCN runtime", () => {
    expect(
      requiresCircleCardEmailConfiguration({ APP_BRAND: "bcn" })
    ).toBe(false);
    expect(requiresCircleCardEmailConfiguration({})).toBe(false);
  });

  it("requires complete Circle Card configuration for its runtime or any partial setup", () => {
    expect(
      requiresCircleCardEmailConfiguration({ APP_BRAND: "circle-card" })
    ).toBe(true);
    expect(
      requiresCircleCardEmailConfiguration({
        APP_BRAND: "bcn",
        CIRCLE_CARD_RESEND_API_KEY: "re_synthetic"
      })
    ).toBe(true);
  });

  it.each(["unknown", "__proto__", "constructor"])(
    "fails closed for the runtime brand value %s",
    (brand) => {
      expect(() =>
        resolveEmailBrandIdentity(brand as "bcn", productionEnvironment)
      ).toThrowError(
        expect.objectContaining({ code: "EMAIL_BRAND_INVALID" })
      );
    }
  );

  it("resolves separate BCN and Circle Card production identities", () => {
    expect(resolveEmailBrandIdentity("bcn", productionEnvironment)).toMatchObject({
      sender: "The Business Circle Network <noreply@thebusinesscircle.net>",
      replyTo: "hello@thebusinesscircle.net",
      supportEmail: "contact@thebusinesscircle.net",
      canonicalOrigin: "https://thebusinesscircle.net",
      logoUrl: "https://thebusinesscircle.net/branding/the-business-circle-logo.png"
    });
    expect(resolveEmailBrandIdentity("circle-card", productionEnvironment)).toMatchObject({
      sender: "Circle Card <noreply@circlecard.co.uk>",
      replyTo: "support@circlecard.co.uk",
      supportEmail: "support@circlecard.co.uk",
      canonicalOrigin: "https://circlecard.co.uk",
      logoUrl: "https://circlecard.co.uk/branding/circle-card-logo.png"
    });
  });

  it("fails closed when Circle Card production identity is incomplete", () => {
    expect(() =>
      resolveEmailBrandIdentity("circle-card", {
        ...productionEnvironment,
        CIRCLE_CARD_RESEND_FROM_EMAIL: undefined
      })
    ).toThrow("CIRCLE_CARD_RESEND_FROM_EMAIL must be configured in production");
  });

  it.each([
    "Circle Card <noreply@other.example>",
    "Circle Card <onboarding@resend.dev>"
  ])("rejects the Circle Card production sender domain %s", (sender) => {
    expect(() =>
      resolveEmailBrandIdentity("circle-card", {
        ...productionEnvironment,
        CIRCLE_CARD_RESEND_FROM_EMAIL: sender
      })
    ).toThrow(EmailBrandConfigurationError);
  });

  it.each([
    "Circle Card <noreply@circlecard.co.uk>\r\nBcc: attacker@example.com",
    "Circle Card <not-an-email>",
    "Name <first@example.com>, Other <second@example.com>"
  ])("rejects malformed or injected sender %s", (sender) => {
    expect(() => parseEmailSender(sender, "CIRCLE_CARD_RESEND_FROM_EMAIL")).toThrow(
      EmailBrandConfigurationError
    );
  });

  it.each([
    "Circle Card <>",
    "<noreply@circlecard.co.uk>",
    "Circle Card, Support <noreply@circlecard.co.uk>",
    '"Broken <noreply@circlecard.co.uk>'
  ])("rejects malformed display-name syntax %s", (sender) => {
    expect(() => parseEmailSender(sender, "CIRCLE_CARD_RESEND_FROM_EMAIL")).toThrow(
      EmailBrandConfigurationError
    );
  });

  it("keeps the BCN production sender on its existing domain", () => {
    expect(() =>
      resolveEmailBrandIdentity("bcn", {
        ...productionEnvironment,
        RESEND_FROM_EMAIL: "BCN <noreply@other.example>"
      })
    ).toThrow("RESEND_FROM_EMAIL must use the thebusinesscircle.net domain");
  });

  it.each([
    "support@circlecard.co.uk\nBcc: attacker@example.com",
    "not-an-email",
    "one@example.com,two@example.com"
  ])("rejects malformed or injected mailbox %s", (mailbox) => {
    expect(() => parseEmailMailbox(mailbox, "CIRCLE_CARD_RESEND_REPLY_TO_EMAIL")).toThrow(
      EmailBrandConfigurationError
    );
  });
});
