import "server-only";

import { createHash } from "node:crypto";
import { createElement, type ReactElement } from "react";
import { Prisma, StripeWebhookEventStatus } from "@prisma/client";
import {
  CircleCardProActivatedEmail,
  CircleCardProCancellationScheduledEmail,
  CircleCardProPaymentFailedEmail,
  CircleCardProSubscriptionRestoredEmail,
  buildCircleCardProActivatedText,
  buildCircleCardProCancellationScheduledText,
  buildCircleCardProPaymentFailedText,
  buildCircleCardProSubscriptionRestoredText,
  type CircleCardProActivatedEmailProps,
  type CircleCardProCancellationScheduledEmailProps,
  type CircleCardProPaymentFailedEmailProps,
  type CircleCardProSubscriptionRestoredEmailProps
} from "@/emails/circle-card-pro-lifecycle";
import { renderEmailHtml } from "@/emails/render";
import { RUNTIME_BRANDS } from "@/config/runtime-brand";
import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { logServerWarning } from "@/lib/security/logging";

type CircleCardLifecycleEmailKind =
  | "pro-activated"
  | "payment-failed"
  | "cancellation-scheduled"
  | "subscription-restored";

export const CIRCLE_CARD_LIFECYCLE_EMAIL_DELIVERY_POLICY =
  "Billing state is authoritative and is stored first. Lifecycle emails are reserved durably and attempted at most once; failed attempts require a controlled manual resend from stored Stripe evidence.";

type LifecycleTemplate = {
  subject: string;
  react: ReactElement;
  text: string;
};

type LifecycleEmailBase = {
  userId: string;
  evidenceId: string;
  planName: string;
  monthlyPriceLabel: string;
};

type ActivatedInput = LifecycleEmailBase &
  Omit<
    CircleCardProActivatedEmailProps,
    | "firstName"
    | "planName"
    | "monthlyPriceLabel"
    | "openCircleCardUrl"
    | "manageBillingUrl"
  >;

type PaymentFailedInput = LifecycleEmailBase &
  Omit<
    CircleCardProPaymentFailedEmailProps,
    | "firstName"
    | "planName"
    | "monthlyPriceLabel"
    | "openCircleCardUrl"
    | "manageBillingUrl"
  >;

type CancellationInput = LifecycleEmailBase &
  Omit<
    CircleCardProCancellationScheduledEmailProps,
    | "firstName"
    | "planName"
    | "monthlyPriceLabel"
    | "openCircleCardUrl"
    | "manageBillingUrl"
  >;

type RestoredInput = LifecycleEmailBase &
  Omit<
    CircleCardProSubscriptionRestoredEmailProps,
    | "firstName"
    | "planName"
    | "monthlyPriceLabel"
    | "openCircleCardUrl"
    | "manageBillingUrl"
  >;

const circleCardOrigin = RUNTIME_BRANDS["circle-card"].canonicalOrigin;
const openCircleCardUrl = `${circleCardOrigin}/app`;
const manageBillingUrl = `${circleCardOrigin}/app?section=settings#circle-card-plan`;

function firstName(value: string | null) {
  return value?.trim().split(/\s+/)[0] || "there";
}

function ledgerId(kind: CircleCardLifecycleEmailKind, evidenceId: string) {
  const digest = createHash("sha256").update(`${kind}:${evidenceId}`).digest("hex");
  return `circle-card-email:${kind}:${digest}`;
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code === "P2002"
    : Boolean(
        error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "P2002"
      );
}

function reservationState(input: {
  code:
    | "EMAIL_PENDING"
    | "EMAIL_RECIPIENT_LOAD_FAILED"
    | "EMAIL_RECIPIENT_MISSING"
    | "EMAIL_DELIVERY_FAILED"
    | "EMAIL_PROCESSING_FAILED";
  kind: CircleCardLifecycleEmailKind;
  userId: string;
  evidenceId: string;
}) {
  return JSON.stringify({
    code: input.code,
    brand: "circle-card",
    kind: input.kind,
    userId: input.userId,
    evidenceId: input.evidenceId
  });
}

async function reserveLifecycleEmail(input: {
  kind: CircleCardLifecycleEmailKind;
  userId: string;
  evidenceId: string;
}) {
  const id = ledgerId(input.kind, input.evidenceId);

  try {
    await db.stripeWebhookEvent.create({
      data: {
        id,
        type: `circle_card.email.${input.kind}`,
        status: StripeWebhookEventStatus.PROCESSING,
        processingStartedAt: new Date(),
        lastError: reservationState({ ...input, code: "EMAIL_PENDING" })
      }
    });
    return { status: "reserved", id } as const;
  } catch (error) {
    if (isUniqueConflict(error)) {
      return { status: "duplicate" } as const;
    }

    logServerWarning("circle-card-lifecycle-email-idempotency-failed", {
      kind: input.kind,
      reason: error instanceof Error ? error.name : "unknown"
    });
    return { status: "unavailable" } as const;
  }
}

async function recordFailedReservation(
  id: string,
  input: {
    kind: CircleCardLifecycleEmailKind;
    userId: string;
    evidenceId: string;
  },
  code:
    | "EMAIL_RECIPIENT_LOAD_FAILED"
    | "EMAIL_RECIPIENT_MISSING"
    | "EMAIL_DELIVERY_FAILED"
    | "EMAIL_PROCESSING_FAILED"
) {
  await db.stripeWebhookEvent.update({
    where: { id },
    data: {
      status: StripeWebhookEventStatus.FAILED,
      lastError: reservationState({ ...input, code })
    }
  }).catch(() => undefined);
}

async function deliverLifecycleEmail(input: {
  kind: CircleCardLifecycleEmailKind;
  userId: string;
  evidenceId: string;
  template: (recipient: { firstName: string }) => Promise<LifecycleTemplate>;
}) {
  const reservation = await reserveLifecycleEmail(input);
  if (reservation.status === "duplicate") {
    return { sent: false, duplicate: true } as const;
  }
  if (reservation.status === "unavailable") {
    return { sent: false, duplicate: false } as const;
  }
  const reservedId = reservation.id;

  let recipient: { email: string; name: string | null } | null;
  try {
    recipient = await db.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true }
    });
  } catch (error) {
    await recordFailedReservation(
      reservedId,
      input,
      "EMAIL_RECIPIENT_LOAD_FAILED"
    );
    logServerWarning("circle-card-lifecycle-email-recipient-load-failed", {
      kind: input.kind,
      reason: error instanceof Error ? error.name : "unknown"
    });
    return { sent: false, duplicate: false } as const;
  }
  if (!recipient?.email) {
    await recordFailedReservation(reservedId, input, "EMAIL_RECIPIENT_MISSING");
    logServerWarning("circle-card-lifecycle-email-recipient-missing", {
      kind: input.kind
    });
    return { sent: false, duplicate: false } as const;
  }

  try {
    const template = await input.template({ firstName: firstName(recipient.name) });
    const delivery = await sendTransactionalEmail({
      brand: "circle-card",
      to: recipient.email,
      subject: template.subject,
      html: await renderEmailHtml(template.react),
      text: template.text,
      tags: [
        { name: "product", value: "circle-card" },
        { name: "lifecycle", value: input.kind }
      ]
    });

    await db.stripeWebhookEvent.update({
      where: { id: reservedId },
      data: delivery.sent
        ? {
            status: StripeWebhookEventStatus.PROCESSED,
            processedAt: new Date(),
            lastError: null
          }
        : {
            status: StripeWebhookEventStatus.FAILED,
            lastError: reservationState({
              ...input,
              code: "EMAIL_DELIVERY_FAILED"
            })
          }
    });

    if (!delivery.sent) {
      logServerWarning("circle-card-lifecycle-email-delivery-failed", {
        kind: input.kind
      });
    }

    return { sent: delivery.sent, duplicate: false } as const;
  } catch (error) {
    await recordFailedReservation(
      reservedId,
      input,
      "EMAIL_PROCESSING_FAILED"
    );
    logServerWarning("circle-card-lifecycle-email-processing-failed", {
      kind: input.kind,
      reason: error instanceof Error ? error.name : "unknown"
    });
    return { sent: false, duplicate: false } as const;
  }
}

function trustedBase(input: LifecycleEmailBase, recipient: { firstName: string }) {
  return {
    firstName: recipient.firstName,
    planName: input.planName,
    monthlyPriceLabel: input.monthlyPriceLabel,
    openCircleCardUrl,
    manageBillingUrl
  };
}

export function sendCircleCardProActivatedEmail(input: ActivatedInput) {
  return deliverLifecycleEmail({
    kind: "pro-activated",
    userId: input.userId,
    evidenceId: input.evidenceId,
    template: async (recipient) => {
      const props: CircleCardProActivatedEmailProps = {
        ...trustedBase(input, recipient),
        activationDate: input.activationDate,
        billingDateLabel: input.billingDateLabel,
        billingDate: input.billingDate
      };
      return {
        subject: "Your Circle Card Pro access is active",
        react: createElement(CircleCardProActivatedEmail, props),
        text: buildCircleCardProActivatedText(props)
      };
    }
  });
}

export function sendCircleCardProPaymentFailedEmail(input: PaymentFailedInput) {
  return deliverLifecycleEmail({
    kind: "payment-failed",
    userId: input.userId,
    evidenceId: input.evidenceId,
    template: async (recipient) => {
      const props: CircleCardProPaymentFailedEmailProps = {
        ...trustedBase(input, recipient),
        failedAt: input.failedAt,
        retryDate: input.retryDate
      };
      return {
        subject: "Action needed for your Circle Card Pro payment",
        react: createElement(CircleCardProPaymentFailedEmail, props),
        text: buildCircleCardProPaymentFailedText(props)
      };
    }
  });
}

export function sendCircleCardProCancellationScheduledEmail(input: CancellationInput) {
  return deliverLifecycleEmail({
    kind: "cancellation-scheduled",
    userId: input.userId,
    evidenceId: input.evidenceId,
    template: async (recipient) => {
      const props: CircleCardProCancellationScheduledEmailProps = {
        ...trustedBase(input, recipient),
        cancellationScheduledAt: input.cancellationScheduledAt,
        accessEndsAt: input.accessEndsAt
      };
      return {
        subject: "Your Circle Card Pro cancellation is scheduled",
        react: createElement(CircleCardProCancellationScheduledEmail, props),
        text: buildCircleCardProCancellationScheduledText(props)
      };
    }
  });
}

export function sendCircleCardProSubscriptionRestoredEmail(input: RestoredInput) {
  return deliverLifecycleEmail({
    kind: "subscription-restored",
    userId: input.userId,
    evidenceId: input.evidenceId,
    template: async (recipient) => {
      const props: CircleCardProSubscriptionRestoredEmailProps = {
        ...trustedBase(input, recipient),
        restoredAt: input.restoredAt,
        renewalDate: input.renewalDate
      };
      return {
        subject: "Your Circle Card Pro subscription is restored",
        react: createElement(CircleCardProSubscriptionRestoredEmail, props),
        text: buildCircleCardProSubscriptionRestoredText(props)
      };
    }
  });
}
