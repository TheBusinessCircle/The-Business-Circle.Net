import {
  FoundingReservationSource,
  MembershipTier,
  Role,
  SubscriptionStatus,
  type Prisma
} from "@prisma/client";
import { createElement } from "react";
import type Stripe from "stripe";
import { BillingReceiptEmail } from "@/emails";
import {
  getMembershipPlan,
  getMembershipBillingPlan,
  getMembershipPriceDifference,
  getMembershipStripePriceId,
  resolveMembershipPriceFromStripePriceId,
  resolveTierFromPriceId,
  type MembershipBillingInterval,
  type MembershipBillingVariant
} from "@/config/membership";
import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { logServerError, logServerWarning } from "@/lib/security/logging";
import { absoluteUrl } from "@/lib/utils";
import {
  attachFoundingReservationToCheckoutSession,
  claimFoundingReservation,
  releaseFoundingReservation,
  reserveFoundingSlot
} from "@/server/founding";
import { requireStripeClient } from "@/server/stripe/client";

const ENTITLED_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING
]);

type CheckoutSessionInput = {
  userId: string;
  email: string;
  name?: string | null;
  targetTier: MembershipTier;
  billingInterval: MembershipBillingInterval;
  coreAccessConfirmed?: boolean;
  successPath?: string;
  cancelPath?: string;
  allowFoundingOffer?: boolean;
};

type BillingPortalInput = {
  userId: string;
  email: string;
  name?: string | null;
  returnPath?: string;
};

type CheckoutSessionResult = {
  id: string;
  url: string;
  billingVariant: MembershipBillingVariant;
  billingInterval: MembershipBillingInterval;
  checkoutPrice: number;
  monthlyEquivalentPrice: number;
};

type BillingPortalSessionResult = {
  url: string;
};

type PlanChangeResult = {
  url: string;
  billingVariant: MembershipBillingVariant;
  billingInterval: MembershipBillingInterval;
  checkoutPrice: number;
  monthlyEquivalentPrice: number;
  priceDifference: number;
};

type ResolvedStripeSubscriptionContext = {
  userId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
};

function assertCoreAccessConfirmed(input: {
  targetTier: MembershipTier;
  coreAccessConfirmed?: boolean;
}) {
  if (input.targetTier === MembershipTier.CORE && !input.coreAccessConfirmed) {
    throw new Error("core-access-confirmation-required");
  }
}

function toStripeObjectId(
  value: string | { id?: string } | null | undefined
): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value.id === "string") {
    return value.id;
  }

  return null;
}

function toDateFromStripeTimestamp(timestamp?: number | null): Date | null {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp * 1000);
}

function resolveStripeProductId(
  product: string | Stripe.Product | Stripe.DeletedProduct | null | undefined
): string | null {
  if (!product) {
    return null;
  }

  if (typeof product === "string") {
    return product;
  }

  if (typeof product.id === "string") {
    return product.id;
  }

  return null;
}

async function ensureStripeCustomerId(input: {
  userId: string;
  email: string;
  name?: string | null;
}): Promise<string> {
  const existing = await db.subscription.findUnique({
    where: { userId: input.userId },
    select: { stripeCustomerId: true }
  });

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  const stripe = requireStripeClient();
  const customer = await stripe.customers.create({
    email: input.email,
    name: input.name ?? undefined,
    metadata: {
      userId: input.userId
    }
  });

  await db.subscription.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      stripeCustomerId: customer.id,
      status: SubscriptionStatus.INCOMPLETE,
      tier: MembershipTier.FOUNDATION
    },
    update: {
      stripeCustomerId: customer.id
    }
  });

  return customer.id;
}

async function syncUserMembershipTier(userId: string, tier: MembershipTier) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!user) {
    return;
  }

  const nextRole =
    user.role === Role.ADMIN
      ? Role.ADMIN
      : tier === MembershipTier.FOUNDATION
        ? Role.MEMBER
        : Role.INNER_CIRCLE;

  await db.user.update({
    where: { id: userId },
    data: {
      membershipTier: tier,
      role: nextRole
    }
  });
}

function resolveRequestedTier(value: string | null | undefined): MembershipTier {
  if (value === MembershipTier.CORE) {
    return MembershipTier.CORE;
  }

  if (value === MembershipTier.INNER_CIRCLE) {
    return MembershipTier.INNER_CIRCLE;
  }

  return MembershipTier.FOUNDATION;
}

function resolveGrantedTier(
  billedTier: MembershipTier,
  status: SubscriptionStatus
): MembershipTier {
  if (isSubscriptionEntitled(status)) {
    return billedTier;
  }

  return MembershipTier.FOUNDATION;
}

function resolvePrimaryPrice(
  subscription: Stripe.Subscription
): Stripe.SubscriptionItem | null {
  return subscription.items.data[0] ?? null;
}

async function resolveSubscriptionContext(
  params: {
    metadataUserId?: string | null;
    customerId?: string | null;
    subscriptionId?: string | null;
  }
): Promise<ResolvedStripeSubscriptionContext> {
  const customerId = params.customerId ?? null;
  const subscriptionId = params.subscriptionId ?? null;

  if (params.metadataUserId) {
    return {
      userId: params.metadataUserId,
      customerId,
      subscriptionId
    };
  }

  const orFilters: Prisma.SubscriptionWhereInput[] = [];
  if (subscriptionId) {
    orFilters.push({ stripeSubscriptionId: subscriptionId });
  }
  if (customerId) {
    orFilters.push({ stripeCustomerId: customerId });
  }

  if (!orFilters.length) {
    return {
      userId: null,
      customerId,
      subscriptionId
    };
  }

  const matched = await db.subscription.findFirst({
    where: {
      OR: orFilters
    },
    select: { userId: true }
  });

  return {
    userId: matched?.userId ?? null,
    customerId,
    subscriptionId
  };
}

async function upsertSubscriptionFromStripeSubscription(
  subscription: Stripe.Subscription,
  knownUserId?: string
) {
  const priceItem = resolvePrimaryPrice(subscription);
  const priceId = priceItem?.price.id ?? null;
  const billedTier = getTierFromStripePriceId(priceId);
  const normalizedStatus = stripeStatusToSubscriptionStatus(subscription.status);
  const grantedTier = resolveGrantedTier(billedTier, normalizedStatus);
  const context = await resolveSubscriptionContext({
    metadataUserId: knownUserId ?? subscription.metadata?.userId ?? null,
    customerId: toStripeObjectId(subscription.customer as string | { id?: string } | null),
    subscriptionId: subscription.id
  });

  if (!context.userId) {
    return null;
  }

  const persisted = await db.subscription.upsert({
    where: {
      userId: context.userId
    },
    create: {
      userId: context.userId,
      stripeCustomerId: context.customerId ?? undefined,
      stripeSubscriptionId: context.subscriptionId ?? undefined,
      stripeProductId: resolveStripeProductId(priceItem?.price.product),
      stripePriceId: priceId ?? undefined,
      status: normalizedStatus,
      tier: billedTier,
      currentPeriodStart: toDateFromStripeTimestamp(subscription.current_period_start),
      currentPeriodEnd: toDateFromStripeTimestamp(subscription.current_period_end),
      trialStart: toDateFromStripeTimestamp(subscription.trial_start),
      trialEnd: toDateFromStripeTimestamp(subscription.trial_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: toDateFromStripeTimestamp(subscription.canceled_at),
      metadata: {
        source: "stripe-webhook"
      }
    },
    update: {
      stripeCustomerId: context.customerId ?? undefined,
      stripeSubscriptionId: context.subscriptionId ?? undefined,
      stripeProductId: resolveStripeProductId(priceItem?.price.product),
      stripePriceId: priceId ?? undefined,
      status: normalizedStatus,
      tier: billedTier,
      currentPeriodStart: toDateFromStripeTimestamp(subscription.current_period_start),
      currentPeriodEnd: toDateFromStripeTimestamp(subscription.current_period_end),
      trialStart: toDateFromStripeTimestamp(subscription.trial_start),
      trialEnd: toDateFromStripeTimestamp(subscription.trial_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: toDateFromStripeTimestamp(subscription.canceled_at),
      metadata: {
        source: "stripe-webhook"
      }
    },
    select: {
      id: true,
      userId: true,
      tier: true,
      stripeSubscriptionId: true,
      stripePriceId: true
    }
  });

  await syncUserMembershipTier(context.userId, grantedTier);
  return persisted;
}

async function upsertSubscriptionFromCheckoutSession(
  session: Stripe.Checkout.Session
) {
  const context = await resolveSubscriptionContext({
    metadataUserId: session.metadata?.userId ?? session.client_reference_id ?? null,
    customerId: toStripeObjectId(session.customer as string | { id?: string } | null),
    subscriptionId: toStripeObjectId(
      session.subscription as string | { id?: string } | null
    )
  });

  if (!context.userId) {
    return;
  }

  const foundingReservationId = session.metadata?.foundingReservationId ?? null;

  if (context.subscriptionId) {
    const stripe = requireStripeClient();
    const subscription = await stripe.subscriptions.retrieve(context.subscriptionId);
    const persisted = await upsertSubscriptionFromStripeSubscription(subscription, context.userId);

    if (foundingReservationId && persisted?.id) {
      await claimFoundingReservation({
        reservationId: foundingReservationId,
        subscriptionId: persisted.id
      });
    }

    return;
  }

  const requestedTier = resolveRequestedTier(session.metadata?.targetTier);

  const persisted = await db.subscription.upsert({
    where: { userId: context.userId },
    create: {
      userId: context.userId,
      stripeCustomerId: context.customerId ?? undefined,
      status: SubscriptionStatus.INCOMPLETE,
      tier: requestedTier
    },
    update: {
      stripeCustomerId: context.customerId ?? undefined,
      status: SubscriptionStatus.INCOMPLETE,
      tier: requestedTier
    },
    select: {
      id: true
    }
  });

  if (foundingReservationId && persisted?.id) {
    await claimFoundingReservation({
      reservationId: foundingReservationId,
      subscriptionId: persisted.id
    });
  }

  await syncUserMembershipTier(context.userId, MembershipTier.FOUNDATION);
}

function invoiceAmountAsCurrency(
  amountInMinorUnits: number | null | undefined,
  currency: string | null | undefined
) {
  const normalizedAmount = Number.isFinite(amountInMinorUnits ?? NaN)
    ? (amountInMinorUnits as number) / 100
    : 0;
  const normalizedCurrency = (currency ?? "GBP").toUpperCase();

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: normalizedCurrency
  }).format(normalizedAmount);
}

function invoicePlanName(invoice: Stripe.Invoice) {
  const priceId = invoice.lines.data[0]?.price?.id;
  const tier = getTierFromStripePriceId(priceId);
  return getMembershipPlan(tier).name;
}

function invoiceRecipientEmail(invoice: Stripe.Invoice) {
  const customerEmail = invoice.customer_email?.trim();
  if (customerEmail) {
    return customerEmail;
  }

  if (typeof invoice.customer === "object" && invoice.customer && "email" in invoice.customer) {
    const fromCustomerObject = (invoice.customer.email ?? "").trim();
    if (fromCustomerObject) {
      return fromCustomerObject;
    }
  }

  return null;
}

function invoiceFirstName(invoice: Stripe.Invoice) {
  const rawName = invoice.customer_name?.trim() || "Member";
  const split = rawName.split(/\s+/).filter(Boolean)[0];
  return split || "Member";
}

async function sendBillingReceiptForInvoice(invoice: Stripe.Invoice) {
  const recipient = invoiceRecipientEmail(invoice);
  if (!recipient) {
    return;
  }

  const amount = invoiceAmountAsCurrency(invoice.amount_paid ?? invoice.amount_due, invoice.currency);
  const planName = invoicePlanName(invoice);
  const firstName = invoiceFirstName(invoice);

  const sendResult = await sendTransactionalEmail({
    to: recipient,
    subject: "Your Business Circle billing receipt",
    text: [
      `Hi ${firstName},`,
      "",
      `We received your payment of ${amount} for ${planName}.`,
      "Thank you for being part of The Business Circle Network."
    ].join("\n"),
    react: createElement(BillingReceiptEmail, {
      firstName,
      amount,
      planName
    }),
    tags: [
      { name: "type", value: "billing-receipt" },
      { name: "source", value: "stripe-webhook" }
    ]
  });

  if (!sendResult.sent && !sendResult.skipped) {
    logServerWarning("billing-receipt-email-delivery-failed");
  }
}

async function syncSubscriptionFromInvoice(invoice: Stripe.Invoice) {
  const subscriptionId = toStripeObjectId(
    invoice.subscription as string | { id?: string } | null
  );

  if (!subscriptionId) {
    return;
  }

  const stripe = requireStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscriptionFromStripeSubscription(subscription);
}

type StripeWebhookProcessors = {
  handleCheckoutSessionCompleted: (session: Stripe.Checkout.Session) => Promise<void>;
  handleCheckoutSessionExpired: (session: Stripe.Checkout.Session) => Promise<void>;
  handleSubscriptionChanged: (subscription: Stripe.Subscription) => Promise<void>;
  handleInvoiceEvent: (invoice: Stripe.Invoice) => Promise<void>;
};

const defaultWebhookProcessors: StripeWebhookProcessors = {
  handleCheckoutSessionCompleted: upsertSubscriptionFromCheckoutSession,
  handleCheckoutSessionExpired: async (session) => {
    await releaseFoundingReservation({
      reservationId: session.metadata?.foundingReservationId ?? null,
      checkoutSessionId: session.id
    });
  },
  handleSubscriptionChanged: async (subscription) => {
    await upsertSubscriptionFromStripeSubscription(subscription);
  },
  handleInvoiceEvent: syncSubscriptionFromInvoice
};

export function isBillingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripePriceIdForTier(
  tier: MembershipTier,
  billingVariant: MembershipBillingVariant = "standard",
  billingInterval: MembershipBillingInterval = "monthly"
): string {
  const priceId = getMembershipStripePriceId(tier, billingVariant, billingInterval);
  if (!priceId) {
    throw new Error(
      `Missing Stripe price id for tier ${tier} (${billingVariant}, ${billingInterval}).`
    );
  }

  return priceId;
}

export function getTierFromStripePriceId(
  priceId: string | null | undefined
): MembershipTier {
  return resolveTierFromPriceId(priceId);
}

export function stripeStatusToSubscriptionStatus(
  status: Stripe.Subscription.Status
): SubscriptionStatus {
  switch (status) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
      return SubscriptionStatus.CANCELED;
    case "unpaid":
      return SubscriptionStatus.UNPAID;
    case "incomplete":
      return SubscriptionStatus.INCOMPLETE;
    case "incomplete_expired":
      return SubscriptionStatus.INCOMPLETE_EXPIRED;
    case "paused":
      return SubscriptionStatus.PAUSED;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}

export function isSubscriptionEntitled(
  status: SubscriptionStatus | null | undefined
): boolean {
  if (!status) {
    return false;
  }

  return ENTITLED_SUBSCRIPTION_STATUSES.has(status);
}

export async function createStripeCheckoutSessionForUser(
  input: CheckoutSessionInput
): Promise<CheckoutSessionResult> {
  assertCoreAccessConfirmed(input);

  const stripe = requireStripeClient();
  const customerId = await ensureStripeCustomerId({
    userId: input.userId,
    email: input.email,
    name: input.name
  });
  const foundingReservation =
        input.allowFoundingOffer === false
      ? null
      : await reserveFoundingSlot({
          userId: input.userId,
          tier: input.targetTier,
          source: FoundingReservationSource.CHECKOUT
        });
  const billingVariant: MembershipBillingVariant = foundingReservation ? "founding" : "standard";
  const selectedPlan = getMembershipBillingPlan(
    input.targetTier,
    billingVariant,
    input.billingInterval,
    foundingReservation
      ? {
          monthlyPrice: foundingReservation.foundingPrice
        }
      : undefined
  );
  const priceId = getStripePriceIdForTier(
    input.targetTier,
    billingVariant,
    input.billingInterval
  );

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: absoluteUrl(input.successPath ?? "/dashboard?billing=success"),
      cancel_url: absoluteUrl(input.cancelPath ?? "/membership?billing=cancelled"),
      client_reference_id: input.userId,
      metadata: {
        userId: input.userId,
        targetTier: input.targetTier,
        billingVariant,
        billingInterval: input.billingInterval,
        ...(foundingReservation
          ? {
              foundingReservationId: foundingReservation.id
            }
          : {})
      },
      subscription_data: {
        metadata: {
          userId: input.userId,
          targetTier: input.targetTier,
          billingVariant,
          billingInterval: input.billingInterval,
          ...(foundingReservation
            ? {
                foundingReservationId: foundingReservation.id
              }
            : {})
        }
      }
    });
  } catch (error) {
    if (foundingReservation) {
      await releaseFoundingReservation({
        reservationId: foundingReservation.id
      });
    }

    throw error;
  }

  if (!session.url) {
    if (foundingReservation) {
      await releaseFoundingReservation({
        reservationId: foundingReservation.id
      });
    }

    throw new Error("Stripe checkout session did not return a redirect URL.");
  }

  if (foundingReservation) {
    await attachFoundingReservationToCheckoutSession(foundingReservation.id, session.id);
  }

  await db.subscription.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      stripeCustomerId: customerId,
      stripePriceId: priceId,
      status: SubscriptionStatus.INCOMPLETE,
      tier: input.targetTier
    },
    update: {
      stripeCustomerId: customerId,
      stripePriceId: priceId,
      status: SubscriptionStatus.INCOMPLETE,
      tier: input.targetTier
    }
  });

  return {
    id: session.id,
    url: session.url,
    billingVariant,
    billingInterval: input.billingInterval,
    checkoutPrice: selectedPlan.checkoutPrice,
    monthlyEquivalentPrice: selectedPlan.monthlyEquivalentPrice
  };
}

export async function updateStripeSubscriptionPlanForUser(input: {
  userId: string;
  email: string;
  name?: string | null;
  targetTier: MembershipTier;
  billingInterval: MembershipBillingInterval;
  coreAccessConfirmed?: boolean;
}): Promise<PlanChangeResult> {
  assertCoreAccessConfirmed(input);

  const currentSubscription = await db.subscription.findUnique({
    where: {
      userId: input.userId
    },
    select: {
      id: true,
      stripeSubscriptionId: true,
      stripePriceId: true
    }
  });

  if (!currentSubscription?.stripeSubscriptionId) {
    const checkout = await createStripeCheckoutSessionForUser({
      userId: input.userId,
      email: input.email,
      name: input.name,
      targetTier: input.targetTier,
      billingInterval: input.billingInterval,
      coreAccessConfirmed: input.coreAccessConfirmed
    });

    return {
      url: checkout.url,
      billingVariant: checkout.billingVariant,
      billingInterval: checkout.billingInterval,
      checkoutPrice: checkout.checkoutPrice,
      monthlyEquivalentPrice: checkout.monthlyEquivalentPrice,
      priceDifference: checkout.monthlyEquivalentPrice
    };
  }

  const stripe = requireStripeClient();
  const subscription = await stripe.subscriptions.retrieve(currentSubscription.stripeSubscriptionId);
  const primaryPriceItem = resolvePrimaryPrice(subscription);

  if (!primaryPriceItem) {
    throw new Error("Stripe subscription is missing its primary price item.");
  }

  const currentPlan = resolveMembershipPriceFromStripePriceId(primaryPriceItem.price.id);
  const billingVariant: MembershipBillingVariant =
    currentPlan.tier === input.targetTier ? currentPlan.billingVariant : "standard";
  const targetPlan = getMembershipBillingPlan(
    input.targetTier,
    billingVariant,
    input.billingInterval
  );
  const targetPriceId = getStripePriceIdForTier(
    input.targetTier,
    billingVariant,
    input.billingInterval
  );

  if (primaryPriceItem.price.id === targetPriceId) {
    return {
      url: `/dashboard?billing=plan-updated&tier=${input.targetTier}&variant=${billingVariant}&interval=${input.billingInterval}&delta=0`,
      billingVariant,
      billingInterval: input.billingInterval,
      checkoutPrice: targetPlan.checkoutPrice,
      monthlyEquivalentPrice: targetPlan.monthlyEquivalentPrice,
      priceDifference: 0
    };
  }

  try {
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: primaryPriceItem.id,
          price: targetPriceId
        }
      ],
      cancel_at_period_end: false,
      proration_behavior: "create_prorations",
      metadata: {
        ...subscription.metadata,
        userId: input.userId,
        targetTier: input.targetTier,
        billingVariant,
        billingInterval: input.billingInterval
      }
    });

    await upsertSubscriptionFromStripeSubscription(updatedSubscription, input.userId);

    const priceDifference = getMembershipPriceDifference({
      currentMonthlyEquivalentPrice: currentPlan.monthlyEquivalentPrice,
      targetMonthlyEquivalentPrice: targetPlan.monthlyEquivalentPrice
    });

    return {
      url: `/dashboard?billing=plan-updated&tier=${input.targetTier}&variant=${billingVariant}&interval=${input.billingInterval}&delta=${priceDifference}`,
      billingVariant,
      billingInterval: input.billingInterval,
      checkoutPrice: targetPlan.checkoutPrice,
      monthlyEquivalentPrice: targetPlan.monthlyEquivalentPrice,
      priceDifference
    };
  } catch (error) {
    throw error;
  }
}

export async function createStripeBillingPortalSessionForUser(
  input: BillingPortalInput
): Promise<BillingPortalSessionResult> {
  const stripe = requireStripeClient();
  const customerId = await ensureStripeCustomerId({
    userId: input.userId,
    email: input.email,
    name: input.name
  });

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: absoluteUrl(input.returnPath ?? "/dashboard")
  });

  return {
    url: session.url
  };
}

export async function processStripeWebhookEvent(
  event: Stripe.Event,
  processors: Partial<StripeWebhookProcessors> = {}
) {
  const resolvedProcessors: StripeWebhookProcessors = {
    ...defaultWebhookProcessors,
    ...processors
  };

  switch (event.type) {
    case "checkout.session.completed": {
      await resolvedProcessors.handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session
      );
      break;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      await resolvedProcessors.handleCheckoutSessionExpired(
        event.data.object as Stripe.Checkout.Session
      );
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await resolvedProcessors.handleSubscriptionChanged(
        event.data.object as Stripe.Subscription
      );
      break;
    }
    case "invoice.payment_failed": {
      await resolvedProcessors.handleInvoiceEvent(event.data.object as Stripe.Invoice);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      await resolvedProcessors.handleInvoiceEvent(invoice);
      try {
        await sendBillingReceiptForInvoice(invoice);
      } catch (error) {
        logServerError("billing-receipt-email-send-failed", error);
      }
      break;
    }
    default:
      break;
  }
}

