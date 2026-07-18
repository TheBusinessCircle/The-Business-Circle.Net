import React from "react";
import {
  BcnEmailLayout,
  EmailDetailsList,
  EmailMutedText,
  EmailPanel,
  EmailParagraph
} from "@/emails/bcn-email-layout";
import { buildEmailBrandText } from "@/emails/text";
import { RUNTIME_BRANDS } from "@/config/runtime-brand";

type CircleCardProEmailBase = {
  firstName: string;
  planName: string;
  monthlyPriceLabel: string;
  openCircleCardUrl: string;
  manageBillingUrl: string;
};

type TrustedCircleCardProLinks = {
  openCircleCardUrl: string;
  manageBillingUrl: string;
};

type TrustedCircleCardProBase = TrustedCircleCardProLinks & {
  firstName: string;
  planName: string;
  monthlyPriceLabel: string;
};

export type CircleCardProActivatedEmailProps = CircleCardProEmailBase & {
  activationDate: Date;
  billingDateLabel: "Renews on" | "Paid through";
  billingDate: Date;
};

export type CircleCardProPaymentFailedEmailProps = CircleCardProEmailBase & {
  failedAt: Date;
  retryDate?: Date | null;
};

export type CircleCardProCancellationScheduledEmailProps = CircleCardProEmailBase & {
  cancellationScheduledAt: Date;
  accessEndsAt: Date;
};

export type CircleCardProSubscriptionRestoredEmailProps = CircleCardProEmailBase & {
  restoredAt: Date;
  renewalDate: Date;
};

function dateLabel(value: Date) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("Circle Card Pro lifecycle dates must be valid Date values.");
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London"
  }).format(value);
}

function requireDisplayText(value: string, label: string, maximumLength: number) {
  const normalized = value.trim();

  if (
    !normalized ||
    normalized.length > maximumLength ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new Error(`${label} must contain safe display text.`);
  }

  return normalized;
}

function requireCircleCardAppUrl(value: string, label: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute Circle Card URL.`);
  }

  if (
    url.protocol !== "https:" ||
    url.origin !== RUNTIME_BRANDS["circle-card"].canonicalOrigin ||
    url.username ||
    url.password ||
    (url.pathname !== "/app" && !url.pathname.startsWith("/app/"))
  ) {
    throw new Error(`${label} must use an allowlisted https://circlecard.co.uk/app URL.`);
  }

  return url.toString();
}

function trustedProLinks(input: CircleCardProEmailBase): TrustedCircleCardProLinks {
  return {
    openCircleCardUrl: requireCircleCardAppUrl(
      input.openCircleCardUrl,
      "Open Circle Card URL"
    ),
    manageBillingUrl: requireCircleCardAppUrl(
      input.manageBillingUrl,
      "Manage Billing URL"
    )
  };
}

function trustedProBase(input: CircleCardProEmailBase): TrustedCircleCardProBase {
  return {
    firstName: requireDisplayText(input.firstName, "First name", 120),
    planName: requireDisplayText(input.planName, "Plan name", 120),
    monthlyPriceLabel: requireDisplayText(
      input.monthlyPriceLabel,
      "Monthly price label",
      80
    ),
    ...trustedProLinks(input)
  };
}

function ManageBillingPanel({ manageBillingUrl }: { manageBillingUrl: string }) {
  return (
    <EmailPanel title="Manage billing">
      <EmailMutedText>
        Update your payment method, review invoices or manage your subscription securely.
      </EmailMutedText>
      <p style={{ margin: 0, wordBreak: "break-all" }}>
        <a
          href={manageBillingUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#d6a84f", fontSize: "13px", lineHeight: 1.6 }}
        >
          {manageBillingUrl}
        </a>
      </p>
    </EmailPanel>
  );
}

export function CircleCardProActivatedEmail(input: CircleCardProActivatedEmailProps) {
  const trusted = trustedProBase(input);

  return (
    <BcnEmailLayout
      brand="circle-card"
      previewText={`${trusted.planName} is now active.`}
      eyebrow="CIRCLE CARD PRO"
      heading="Your Pro access is active"
      lead={<>Hi {trusted.firstName}, your Circle Card Pro subscription is ready to use.</>}
      ctaLabel="Open Circle Card"
      ctaUrl={trusted.openCircleCardUrl}
      fallbackUrl={trusted.openCircleCardUrl}
    >
      <EmailPanel title="Subscription details">
        <EmailDetailsList
          items={[
            { label: "Plan", value: trusted.planName },
            { label: "Price", value: trusted.monthlyPriceLabel },
            { label: "Activated", value: dateLabel(input.activationDate) },
            { label: input.billingDateLabel, value: dateLabel(input.billingDate) }
          ]}
        />
      </EmailPanel>
      <ManageBillingPanel manageBillingUrl={trusted.manageBillingUrl} />
      <EmailParagraph>
        You can cancel from Manage Billing. Cancellation normally takes effect at the end of
        the paid period. This email confirms Circle Card access; it is not your official Stripe
        receipt.
      </EmailParagraph>
    </BcnEmailLayout>
  );
}

export function buildCircleCardProActivatedText(input: CircleCardProActivatedEmailProps) {
  const trusted = trustedProBase(input);

  return buildEmailBrandText("circle-card", {
    greeting: `Hi ${trusted.firstName},`,
    eyebrow: "Circle Card Pro",
    heading: "Your Pro access is active",
    bodyLines: [
      `Plan: ${trusted.planName}.`,
      `Price: ${trusted.monthlyPriceLabel}.`,
      `Activated: ${dateLabel(input.activationDate)}.`,
      `${input.billingDateLabel}: ${dateLabel(input.billingDate)}.`,
      `Manage Billing: ${trusted.manageBillingUrl}.`,
      "You can cancel from Manage Billing. Cancellation normally takes effect at the end of the paid period.",
      "This email confirms Circle Card access; it is not your official Stripe receipt."
    ],
    ctaLabel: "Open Circle Card",
    ctaUrl: trusted.openCircleCardUrl
  });
}

export function CircleCardProPaymentFailedEmail(input: CircleCardProPaymentFailedEmailProps) {
  const trusted = trustedProBase(input);

  return (
    <BcnEmailLayout
      brand="circle-card"
      previewText="Action is needed for your Circle Card Pro payment."
      eyebrow="CIRCLE CARD PRO"
      heading="Your payment could not be completed"
      lead={<>Hi {trusted.firstName}, we could not complete your latest Circle Card Pro payment.</>}
      ctaLabel="Manage Billing"
      ctaUrl={trusted.manageBillingUrl}
      fallbackUrl={trusted.manageBillingUrl}
    >
      <EmailPanel title="Payment details">
        <EmailDetailsList
          items={[
            { label: "Plan", value: trusted.planName },
            { label: "Price", value: trusted.monthlyPriceLabel },
            { label: "Payment attempt", value: dateLabel(input.failedAt) },
            ...(input.retryDate
              ? [{ label: "Next retry", value: dateLabel(input.retryDate) }]
              : [])
          ]}
        />
      </EmailPanel>
      <EmailParagraph>
        Update your payment method in Manage Billing. Pro access may remain available while
        Stripe retries the payment or during any applicable grace period. Your Circle Card data
        remains in your account even if paid features later become unavailable.
      </EmailParagraph>
    </BcnEmailLayout>
  );
}

export function buildCircleCardProPaymentFailedText(input: CircleCardProPaymentFailedEmailProps) {
  const trusted = trustedProBase(input);

  return buildEmailBrandText("circle-card", {
    greeting: `Hi ${trusted.firstName},`,
    eyebrow: "Circle Card Pro",
    heading: "Your payment could not be completed",
    bodyLines: [
      `Plan: ${trusted.planName}.`,
      `Price: ${trusted.monthlyPriceLabel}.`,
      `Payment attempt: ${dateLabel(input.failedAt)}.`,
      ...(input.retryDate ? [`Next retry: ${dateLabel(input.retryDate)}.`] : []),
      "Update your payment method in Manage Billing. Pro access may remain available while Stripe retries the payment or during any applicable grace period.",
      "Your Circle Card data remains in your account even if paid features later become unavailable."
    ],
    ctaLabel: "Manage Billing",
    ctaUrl: trusted.manageBillingUrl
  });
}

export function CircleCardProCancellationScheduledEmail(
  input: CircleCardProCancellationScheduledEmailProps
) {
  const trusted = trustedProBase(input);

  return (
    <BcnEmailLayout
      brand="circle-card"
      previewText="Your Circle Card Pro cancellation is scheduled."
      eyebrow="CIRCLE CARD PRO"
      heading="Cancellation scheduled"
      lead={<>Hi {trusted.firstName}, your Circle Card Pro subscription is scheduled to end.</>}
      ctaLabel="Open Circle Card"
      ctaUrl={trusted.openCircleCardUrl}
      fallbackUrl={trusted.openCircleCardUrl}
    >
      <EmailPanel title="Subscription details">
        <EmailDetailsList
          items={[
            { label: "Plan", value: trusted.planName },
            { label: "Price", value: trusted.monthlyPriceLabel },
            { label: "Cancellation scheduled", value: dateLabel(input.cancellationScheduledAt) },
            { label: "Pro access ends", value: dateLabel(input.accessEndsAt) }
          ]}
        />
      </EmailPanel>
      <ManageBillingPanel manageBillingUrl={trusted.manageBillingUrl} />
      <EmailParagraph>
        Pro features remain available through the paid period shown above. Your Circle Card and
        account data are not deleted when Pro access ends.
      </EmailParagraph>
    </BcnEmailLayout>
  );
}

export function buildCircleCardProCancellationScheduledText(
  input: CircleCardProCancellationScheduledEmailProps
) {
  const trusted = trustedProBase(input);

  return buildEmailBrandText("circle-card", {
    greeting: `Hi ${trusted.firstName},`,
    eyebrow: "Circle Card Pro",
    heading: "Cancellation scheduled",
    bodyLines: [
      `Plan: ${trusted.planName}.`,
      `Price: ${trusted.monthlyPriceLabel}.`,
      `Cancellation scheduled: ${dateLabel(input.cancellationScheduledAt)}.`,
      `Pro access ends: ${dateLabel(input.accessEndsAt)}.`,
      "Pro features remain available through the paid period. Your Circle Card and account data are not deleted when Pro access ends.",
      `Manage Billing: ${trusted.manageBillingUrl}.`
    ],
    ctaLabel: "Open Circle Card",
    ctaUrl: trusted.openCircleCardUrl
  });
}

export function CircleCardProSubscriptionRestoredEmail(
  input: CircleCardProSubscriptionRestoredEmailProps
) {
  const trusted = trustedProBase(input);

  return (
    <BcnEmailLayout
      brand="circle-card"
      previewText="Your Circle Card Pro subscription has been restored."
      eyebrow="CIRCLE CARD PRO"
      heading="Your Pro subscription is restored"
      lead={<>Hi {trusted.firstName}, your Circle Card Pro access is active again.</>}
      ctaLabel="Open Circle Card"
      ctaUrl={trusted.openCircleCardUrl}
      fallbackUrl={trusted.openCircleCardUrl}
    >
      <EmailPanel title="Subscription details">
        <EmailDetailsList
          items={[
            { label: "Plan", value: trusted.planName },
            { label: "Price", value: trusted.monthlyPriceLabel },
            { label: "Restored", value: dateLabel(input.restoredAt) },
            { label: "Renews on", value: dateLabel(input.renewalDate) }
          ]}
        />
      </EmailPanel>
      <ManageBillingPanel manageBillingUrl={trusted.manageBillingUrl} />
      <EmailParagraph>
        Your Pro features are available again. Any future cancellation can be managed through
        Manage Billing and normally takes effect at the end of the paid period.
      </EmailParagraph>
    </BcnEmailLayout>
  );
}

export function buildCircleCardProSubscriptionRestoredText(
  input: CircleCardProSubscriptionRestoredEmailProps
) {
  const trusted = trustedProBase(input);

  return buildEmailBrandText("circle-card", {
    greeting: `Hi ${trusted.firstName},`,
    eyebrow: "Circle Card Pro",
    heading: "Your Pro subscription is restored",
    bodyLines: [
      `Plan: ${trusted.planName}.`,
      `Price: ${trusted.monthlyPriceLabel}.`,
      `Restored: ${dateLabel(input.restoredAt)}.`,
      `Renews on: ${dateLabel(input.renewalDate)}.`,
      "Your Pro features are available again.",
      `Manage Billing: ${trusted.manageBillingUrl}.`
    ],
    ctaLabel: "Open Circle Card",
    ctaUrl: trusted.openCircleCardUrl
  });
}
