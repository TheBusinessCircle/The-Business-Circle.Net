import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CircleCardWelcomeEmail } from "@/emails/circle-card-welcome";
import { PasswordChangedEmail } from "@/emails/password-changed";
import { PasswordResetEmail } from "@/emails/password-reset";
import { VerifyEmailAddressEmail } from "@/emails/verify-email-address";

describe("authentication email branding", () => {
  it("renders Circle Card verification wording and origin without BCN product copy", () => {
    const html = renderToStaticMarkup(
      createElement(VerifyEmailAddressEmail, {
        brand: "circle-card",
        firstName: "Asha",
        verificationUrl:
          "https://circlecard.co.uk/api/auth/verify-email?uid=user&token=test",
        ttlHours: 48
      })
    );

    expect(html).toContain("Circle Card account");
    expect(html).toContain("https://circlecard.co.uk/api/auth/verify-email");
    expect(html).toContain(
      "https://circlecard.co.uk/branding/circle-card-logo.png"
    );
    expect(html).not.toContain("The Business Circle Network");
    expect(html).not.toContain("thebusinesscircle.net");
  });

  it("renders Circle Card reset and changed-confirmation wording", () => {
    const resetHtml = renderToStaticMarkup(
      createElement(PasswordResetEmail, {
        brand: "circle-card",
        firstName: "Asha",
        resetUrl: "https://circlecard.co.uk/reset-password?token=test",
        ttlMinutes: 60
      })
    );
    const changedHtml = renderToStaticMarkup(
      createElement(PasswordChangedEmail, {
        brand: "circle-card",
        firstName: "Asha",
        loginUrl: "https://circlecard.co.uk/login"
      })
    );

    expect(resetHtml).toContain("Circle Card password");
    expect(resetHtml).toContain("https://circlecard.co.uk/reset-password");
    expect(resetHtml).toContain("https://circlecard.co.uk/branding/circle-card-logo.png");
    expect(resetHtml).not.toContain("thebusinesscircle.net");
    expect(changedHtml).toContain("sign back in to Circle Card");
    expect(changedHtml).toContain("https://circlecard.co.uk/login");
    expect(changedHtml).toContain("https://circlecard.co.uk/branding/circle-card-logo.png");
    expect(changedHtml).not.toContain("thebusinesscircle.net");
  });

  it("renders the Circle Card welcome email without BCN product destinations", () => {
    const html = renderToStaticMarkup(
      createElement(CircleCardWelcomeEmail, {
        firstName: "Asha",
        dashboardUrl: "https://circlecard.co.uk/app/onboarding"
      })
    );

    expect(html).toContain("Welcome to Circle Card");
    expect(html).toContain("https://circlecard.co.uk/app/onboarding");
    expect(html).toContain("https://circlecard.co.uk/branding/circle-card-logo.png");
    expect(html).not.toContain("The Business Circle");
    expect(html).not.toContain("thebusinesscircle.net");
  });

  it("preserves the existing BCN verification wording and link", () => {
    const html = renderToStaticMarkup(
      createElement(VerifyEmailAddressEmail, {
        brand: "bcn",
        firstName: "Asha",
        verificationUrl:
          "https://thebusinesscircle.net/api/auth/verify-email?uid=user&token=test",
        ttlHours: 48
      })
    );

    expect(html).toContain("The Business Circle Network");
    expect(html).toContain("https://thebusinesscircle.net/api/auth/verify-email");
    expect(html).toContain(
      "https://thebusinesscircle.net/branding/the-business-circle-logo.png"
    );
  });
});
