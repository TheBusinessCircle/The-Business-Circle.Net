import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CircleCardActivationReminderEmail } from "@/emails/circle-card-activation-reminder";
import {
  CircleCardProActivatedEmail,
  CircleCardProCancellationScheduledEmail,
  CircleCardProPaymentFailedEmail,
  CircleCardProSubscriptionRestoredEmail,
  buildCircleCardProActivatedText,
  buildCircleCardProCancellationScheduledText,
  buildCircleCardProPaymentFailedText,
  buildCircleCardProSubscriptionRestoredText
} from "@/emails/circle-card-pro-lifecycle";
import { CircleCardWeeklySummaryEmail } from "@/emails/circle-card-weekly-summary";

const base = {
  firstName: "Asha <script>alert(1)</script>",
  planName: "Circle Card Pro",
  monthlyPriceLabel: "£9.99 monthly",
  openCircleCardUrl: "https://circlecard.co.uk/app",
  manageBillingUrl: "https://circlecard.co.uk/app?section=billing"
};

function expectCircleCardIsolation(html: string) {
  expect(html).toContain("https://circlecard.co.uk/branding/circle-card-logo.png");
  expect(html).toContain("support@circlecard.co.uk");
  expect(html).toContain("Circle Card is operated by THE BUSINESS CIRCLE NETWORK LTD");
  expect(html).not.toContain("thebusinesscircle.net");
  expect(html).not.toContain("<script>alert(1)</script>");
}

describe("Circle Card service email foundation", () => {
  it("renders activation reminder and weekly summary as standalone Circle Card", () => {
    const reminder = renderToStaticMarkup(
      createElement(CircleCardActivationReminderEmail, {
        firstName: "Asha",
        dashboardUrl: "https://circlecard.co.uk/app?section=my-card",
        completionScore: 70,
        missingItems: ["Add a profile image"]
      })
    );
    const summary = renderToStaticMarkup(
      createElement(CircleCardWeeklySummaryEmail, {
        firstName: "Asha",
        completionScore: 80,
        cardViews: 12,
        shares: 3,
        walletContacts: 5,
        nextBestAction: "Share your card",
        completeProfileUrl: "https://circlecard.co.uk/app?section=home",
        shareCardUrl: "https://circlecard.co.uk/card/asha"
      })
    );

    expectCircleCardIsolation(reminder);
    expectCircleCardIsolation(summary);
    expect(reminder).toContain("https://circlecard.co.uk/app?section=my-card");
    expect(summary).toContain("https://circlecard.co.uk/card/asha");
  });

  it("renders Pro activation HTML and text with the required typed details", () => {
    const input = {
      ...base,
      activationDate: new Date("2026-07-01T12:00:00.000Z"),
      billingDateLabel: "Renews on" as const,
      billingDate: new Date("2026-08-01T12:00:00.000Z")
    };
    const html = renderToStaticMarkup(createElement(CircleCardProActivatedEmail, input));
    const text = buildCircleCardProActivatedText(input);

    expectCircleCardIsolation(html);
    for (const detail of [
      "Circle Card Pro",
      "£9.99 monthly",
      "1 July 2026",
      "1 August 2026",
      "Open Circle Card",
      "Manage Billing",
      "not your official Stripe receipt"
    ]) {
      expect(html).toContain(detail);
      expect(text).toContain(detail);
    }
  });

  it("renders payment-failed, cancellation and restored lifecycle variants", () => {
    const failedInput = {
      ...base,
      failedAt: new Date("2026-07-02T12:00:00.000Z"),
      retryDate: new Date("2026-07-05T12:00:00.000Z")
    };
    const cancellationInput = {
      ...base,
      cancellationScheduledAt: new Date("2026-07-03T12:00:00.000Z"),
      accessEndsAt: new Date("2026-08-01T12:00:00.000Z")
    };
    const restoredInput = {
      ...base,
      restoredAt: new Date("2026-07-04T12:00:00.000Z"),
      renewalDate: new Date("2026-08-04T12:00:00.000Z")
    };
    const variants = [
      [
        renderToStaticMarkup(createElement(CircleCardProPaymentFailedEmail, failedInput)),
        buildCircleCardProPaymentFailedText(failedInput),
        "Your payment could not be completed"
      ],
      [
        renderToStaticMarkup(
          createElement(CircleCardProCancellationScheduledEmail, cancellationInput)
        ),
        buildCircleCardProCancellationScheduledText(cancellationInput),
        "Cancellation scheduled"
      ],
      [
        renderToStaticMarkup(
          createElement(CircleCardProSubscriptionRestoredEmail, restoredInput)
        ),
        buildCircleCardProSubscriptionRestoredText(restoredInput),
        "Your Pro subscription is restored"
      ]
    ];

    for (const [html, text, heading] of variants) {
      expectCircleCardIsolation(html);
      expect(html).toContain(heading);
      expect(text).toContain(heading);
      expect(html).toContain("£9.99 monthly");
      expect(text).toContain("£9.99 monthly");
      expect(text).toContain("support@circlecard.co.uk");
      expect(text).toContain("Circle Card is operated by THE BUSINESS CIRCLE NETWORK LTD");
      expect(text).toContain("https://circlecard.co.uk/app");
    }
  });

  it.each([
    "javascript:alert(1)",
    "http://circlecard.co.uk/app",
    "https://circlecard.co.uk.evil.example/app",
    "https://attacker.example/app",
    "https://circlecard.co.uk/pro"
  ])("rejects a non-allowlisted Open Circle Card URL: %s", (openCircleCardUrl) => {
    const input = {
      ...base,
      openCircleCardUrl,
      activationDate: new Date("2026-07-01T12:00:00.000Z"),
      billingDateLabel: "Paid through" as const,
      billingDate: new Date("2026-08-01T12:00:00.000Z")
    };

    expect(() =>
      renderToStaticMarkup(createElement(CircleCardProActivatedEmail, input))
    ).toThrow("Open Circle Card URL");
    expect(() => buildCircleCardProActivatedText(input)).toThrow(
      "Open Circle Card URL"
    );
  });

  it("rejects an external Manage Billing URL and escapes billing display inputs", () => {
    const unsafeBillingInput = {
      ...base,
      manageBillingUrl: "https://billing.attacker.example/session",
      activationDate: new Date("2026-07-01T12:00:00.000Z"),
      billingDateLabel: "Renews on" as const,
      billingDate: new Date("2026-08-01T12:00:00.000Z")
    };
    expect(() =>
      renderToStaticMarkup(createElement(CircleCardProActivatedEmail, unsafeBillingInput))
    ).toThrow("Manage Billing URL");

    const escapedInput = {
      ...unsafeBillingInput,
      planName: '<img src=x onerror="alert(1)">',
      monthlyPriceLabel: "<script>alert(1)</script>",
      manageBillingUrl: base.manageBillingUrl
    };
    const html = renderToStaticMarkup(
      createElement(CircleCardProActivatedEmail, escapedInput)
    );
    expect(html).not.toContain('<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("rejects control characters and invalid dates in typed lifecycle inputs", () => {
    const controlledInput = {
      ...base,
      planName: "Circle Card Pro\r\nInjected header-style content",
      activationDate: new Date("2026-07-01T12:00:00.000Z"),
      billingDateLabel: "Renews on" as const,
      billingDate: new Date("2026-08-01T12:00:00.000Z")
    };
    expect(() =>
      renderToStaticMarkup(createElement(CircleCardProActivatedEmail, controlledInput))
    ).toThrow("Plan name must contain safe display text");

    expect(() =>
      buildCircleCardProActivatedText({
        ...controlledInput,
        planName: base.planName,
        billingDate: new Date("invalid")
      })
    ).toThrow("lifecycle dates must be valid");
  });
});
