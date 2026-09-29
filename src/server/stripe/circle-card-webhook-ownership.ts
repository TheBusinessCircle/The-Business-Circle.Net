import "server-only";

import type Stripe from "stripe";
import { db } from "@/lib/db";

export const CIRCLE_CARD_STRIPE_EVENT_TYPES = [
  "checkout.session.completed",
  "checkout.session.expired",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required"
] as const;

export type CircleCardStripeEventOwnership =
  | "circle-card"
  | "bcn"
  | "founder-service"
  | "ambiguous"
  | "unsupported";

type StripeObjectReference = string | { id?: string } | null | undefined;

function objectId(value: StripeObjectReference) {
  if (typeof value === "string") return value;
  return typeof value?.id === "string" ? value.id : null;
}

function configuredCircleCardPriceIds() {
  return new Set(
    [
      process.env.STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID,
      process.env.STRIPE_CIRCLE_CARD_PRO_ANNUAL_PRICE_ID,
      process.env.STRIPE_CIRCLE_CARD_TEAMS_MONTHLY_PRICE_ID,
      process.env.STRIPE_CIRCLE_CARD_TEAMS_ANNUAL_PRICE_ID
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
  );
}

function resolveOwnership(input: {
  circle: boolean;
  bcn: boolean;
  founder: boolean;
}): CircleCardStripeEventOwnership {
  const matches = Number(input.circle) + Number(input.bcn) + Number(input.founder);
  if (matches !== 1) return "ambiguous";
  if (input.circle) return "circle-card";
  if (input.founder) return "founder-service";
  return "bcn";
}

async function checkoutOwnership(session: Stripe.Checkout.Session) {
  const subscriptionId = objectId(session.subscription as StripeObjectReference);
  const identifiers = [
    { latestCheckoutSessionId: session.id },
    ...(subscriptionId ? [{ stripeSubscriptionId: subscriptionId }] : [])
  ];
  const legacyIdentifiers = [
    { stripeCheckoutSessionId: session.id },
    ...(subscriptionId ? [{ stripeSubscriptionId: subscriptionId }] : [])
  ];
  const [circle, bcnSubscription, pendingRegistration, founder] = await Promise.all([
    db.circleCardSubscription.findFirst({
      where: { OR: identifiers },
      select: { id: true }
    }),
    db.subscription.findFirst({
      where: { OR: legacyIdentifiers },
      select: { id: true }
    }),
    db.pendingRegistration.findFirst({
      where: { OR: legacyIdentifiers },
      select: { id: true }
    }),
    db.founderServiceRequest.findFirst({
      where: { OR: legacyIdentifiers },
      select: { id: true }
    })
  ]);

  const configuredPrices = configuredCircleCardPriceIds();
  const hasCirclePrice = Boolean(
    session.line_items?.data.some((item) =>
      item.price?.id ? configuredPrices.has(item.price.id) : false
    )
  );

  return resolveOwnership({
    circle: Boolean(circle || hasCirclePrice),
    bcn: Boolean(bcnSubscription || pendingRegistration),
    founder: Boolean(founder)
  });
}

async function subscriptionOwnership(subscription: Stripe.Subscription) {
  const [circle, bcnSubscription, pendingRegistration, founder] = await Promise.all([
    db.circleCardSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true }
    }),
    db.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true }
    }),
    db.pendingRegistration.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true }
    }),
    db.founderServiceRequest.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true }
    })
  ]);
  const configuredPrices = configuredCircleCardPriceIds();
  const hasCirclePrice = subscription.items.data.some((item) =>
    configuredPrices.has(item.price.id)
  );

  return resolveOwnership({
    circle: Boolean(circle || hasCirclePrice),
    bcn: Boolean(bcnSubscription || pendingRegistration),
    founder: Boolean(founder)
  });
}

async function invoiceOwnership(invoice: Stripe.Invoice) {
  const subscriptionId = objectId(invoice.subscription as StripeObjectReference);
  if (!subscriptionId) return "ambiguous" as const;

  const [circle, bcnSubscription, pendingRegistration, founder] = await Promise.all([
    db.circleCardSubscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true }
    }),
    db.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true }
    }),
    db.pendingRegistration.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true }
    }),
    db.founderServiceRequest.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true }
    })
  ]);
  const configuredPrices = configuredCircleCardPriceIds();
  const hasCirclePrice = invoice.lines.data.some((line) =>
    line.price?.id ? configuredPrices.has(line.price.id) : false
  );

  return resolveOwnership({
    circle: Boolean(circle || hasCirclePrice),
    bcn: Boolean(bcnSubscription || pendingRegistration),
    founder: Boolean(founder)
  });
}

export async function classifyCircleCardStripeEventOwnership(
  event: Stripe.Event
): Promise<CircleCardStripeEventOwnership> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.expired":
      return checkoutOwnership(event.data.object as Stripe.Checkout.Session);
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return subscriptionOwnership(event.data.object as Stripe.Subscription);
    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.payment_action_required":
      return invoiceOwnership(event.data.object as Stripe.Invoice);
    default:
      return "unsupported";
  }
}
