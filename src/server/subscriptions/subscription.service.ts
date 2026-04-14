import {
  FoundingReservationSource,
  MembershipTier,
  PendingRegistrationStatus,
  Role,
  SubscriptionStatus,
  type Prisma
} from "@prisma/client";
import { createElement } from "react";
import type Stripe from "stripe";
import { BillingReceiptEmail } from "@/emails";
import {
  getMembershipPlan,
  getMembershipPriceDifference,
  getMembershipStripePriceId,
  resolveTierFromPriceId,
  type MembershipBillingInterval,
  type MembershipBillingVariant
} from "@/config/membership";
import {
  finalizePendingRegistrationAccess,
  provisionUserFromPendingRegistration
} from "@/lib/auth/register";
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
import {
  resolveManagedMembershipPlan,
  resolveManagedMembershipPlanFromStripePriceId,
  resolveManagedMembershipTierFromStripePriceId,
  recordBillingDiscountRedemption
} from "@/server/products-pricing";
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

type PendingRegistrationCheckoutInput = {
  pendingRegistrationId: string;
  email: string;
  name?: string | null;
  targetTier: MembershipTier;
  billingInterval: MembershipBillingInterval;
  coreAccessConfirmed?: boolean;
  inviteCode?: string | null;
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

function resolvePendingRegistrationIdFromSession(
  session: Stripe.Checkout.Session
): string | null {
  const fromMetadata = session.metadata?.pendingRegistrationId ?? null;
  if (fromMetadata) {
    return fromMetadata;
  }

  return session.client_reference_id ?? null;
}

function isCheckoutPaymentSuccessful(session: Stripe.Checkout.Session) {
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

function extractPromotionCodeIdFromSession(
  session: Stripe.Checkout.Session
): string | null {
  if (!Array.isArray(session.discounts) || !session.discounts.length) {
    return null;
  }

  const promotionCode =
    session.discounts[0]?.promotion_code ?? null;
  return toStripeObjectId(promotionCode as string | { id?: string } | null);
}

async function resolvePromotionCodeIdFromSession(
  session: Stripe.Checkout.Session
) {
  const direct = extractPromotionCodeIdFromSession(session);
  if (direct) {
    return direct;
  }

  const stripe = requireStripeClient();
  const expanded = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["discounts", "discounts.promotion_code"]
  });

  return extractPromotionCodeIdFromSession(expanded);
}

async function resolveUserIdFromCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<string | null> {
  const metadataUserId = session.metadata?.userId ?? null;
  if (metadataUserId) {
    return metadataUserId;
  }

  const pendingRegistrationId = session.metadata?.pendingRegistrationId ?? null;
  if (pendingRegistrationId) {
    const pendingRegistration = await db.pendingRegistration.findUnique({
      where: {
        id: pendingRegistrationId
      },
      select: {
        completedUserId: true
      }
    });

    return pendingRegistration?.completedUserId ?? null;
  }

  const subscriptionId = toStripeObjectId(
    session.subscription as string | { id?: string } | null
  );
  const customerId = toStripeObjectId(
    session.customer as string | { id?: string } | null
  );

  const orFilters: Prisma.SubscriptionWhereInput[] = [];
  if (subscriptionId) {
    orFilters.push({ stripeSubscriptionId: subscriptionId });
  }
  if (customerId) {
    orFilters.push({ stripeCustomerId: customerId });
  }

  if (!orFilters.length) {
    return null;
  }

  const subscription = await db.subscription.findFirst({
    where: {
      OR: orFilters
    },
    select: {
      userId: true
    }
  });

  return subscription?.userId ?? null;
}

async function redeemBillingDiscountFromCheckoutSession(
  session: Stripe.Checkout.Session
) {
  if (!isCheckoutPaymentSuccessful(session)) {
    return;
  }

  try {
    const promotionCodeId = await resolvePromotionCodeIdFromSession(session);
    if (!promotionCodeId) {
      return;
    }

    const userId = await resolveUserIdFromCheckoutSession(session);

    await recordBillingDiscountRedemption({
      promotionCodeId,
      checkoutSessionId: session.id,
      subscriptionId: toStripeObjectId(
        session.subscription as string | { id?: string } | null
      ),
      customerId: toStripeObjectId(
        session.customer as string | { id?: string } | null
      ),
      userId
    });
  } catch (error) {
    logServerWarning("billing-discount-redemption-failed", error);
  }
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

async function findPendingRegistrationForStripeReferences(input: {
  pendingRegistrationId?: string | null;
  checkoutSessionId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  if (input.pendingRegistrationId) {
    return db.pendingRegistration.findUnique({
      where: {
        id: input.pendingRegistrationId
      },
      select: {
        id: true,
        stripeCheckoutSessionId: true
      }
    });
  }

  const orFilters: Prisma.PendingRegistrationWhereInput[] = [];

  if (input.subscriptionId) {
    orFilters.push({
      stripeSubscriptionId: input.subscriptionId
    });
  }

  if (input.checkoutSessionId) {
    orFilters.push({
      stripeCheckoutSessionId: input.checkoutSessionId
    });
  }

  if (input.customerId) {
    orFilters.push({
      stripeCustomerId: input.customerId
    });
  }

  if (!orFilters.length) {
    return null;
  }

  return db.pendingRegistration.findFirst({
    where: {
      OR: orFilters
    },
    select: {
      id: true,
      stripeCheckoutSessionId: true
    }
  });
}

async function updatePendingRegistrationStripeState(input: {
  pendingRegistrationId?: string | null;
  checkoutSessionId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  status?: PendingRegistrationStatus;
}) {
  const pendingRegistration = await findPendingRegistrationForStripeReferences(input);

  if (!pendingRegistration) {
    return null;
  }

  const data = {
    ...(input.status
      ? {
          status: input.status
        }
      : {}),
    ...(input.checkoutSessionId
      ? {
          stripeCheckoutSessionId: input.checkoutSessionId
        }
      : {}),
    ...(input.customerId
      ? {
          stripeCustomerId: input.customerId
        }
      : {}),
    ...(input.subscriptionId
      ? {
          stripeSubscriptionId: input.subscriptionId
        }
      : {})
  };

  if (input.status) {
    await db.pendingRegistration.updateMany({
      where: {
        id: pendingRegistration.id,
        status: {
          not: PendingRegistrationStatus.COMPLETED
        }
      },
      data
    });
  } else if (Object.keys(data).length) {
    await db.pendingRegistration.update({
      where: {
        id: pendingRegistration.id
      },
      data
    });
  }

  return {
    id: pendingRegistration.id,
    checkoutSessionId:
      input.checkoutSessionId ?? pendingRegistration.stripeCheckoutSessionId ?? null
  };
}

async function completePendingRegistrationFromStripeSubscription(
  subscription: Stripe.Subscription,
  input: {
    pendingRegistrationId?: string | null;
    checkoutSessionId?: string | null;
  } = {}
) {
  const normalizedStatus = stripeStatusToSubscriptionStatus(subscription.status);
  if (!isSubscriptionEntitled(normalizedStatus)) {
    return false;
  }

  const customerId = toStripeObjectId(subscription.customer as string | { id?: string } | null);
  const pendingRegistration = await updatePendingRegistrationStripeState({
    pendingRegistrationId:
      input.pendingRegistrationId ?? subscription.metadata?.pendingRegistrationId ?? null,
    checkoutSessionId: input.checkoutSessionId ?? null,
    customerId,
    subscriptionId: subscription.id
  });

  if (!pendingRegistration) {
    return false;
  }

  const provisioned = await provisionUserFromPendingRegistration({
    pendingRegistrationId: pendingRegistration.id,
    stripeCheckoutSessionId: pendingRegistration.checkoutSessionId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id
  });

  if (!provisioned) {
    return false;
  }

  const persistedSubscription = await upsertSubscriptionFromStripeSubscription(
    subscription,
    provisioned.user.id
  );

  if (!persistedSubscription?.id) {
    return false;
  }

  const foundingReservationId = subscription.metadata?.foundingReservationId ?? null;
  if (foundingReservationId) {
    await claimFoundingReservation({
      reservationId: foundingReservationId,
      subscriptionId: persistedSubscription.id,
      userId: provisioned.user.id
    });
  }

  await finalizePendingRegistrationAccess({
    pendingRegistrationId: provisioned.pendingRegistrationId,
    userId: provisioned.user.id,
    email: provisioned.user.email,
    fullName: provisioned.fullName,
    selectedTier: provisioned.selectedTier,
    inviteCode: provisioned.inviteCode,
    stripeCheckoutSessionId: pendingRegistration.checkoutSessionId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id
  });

  return true;
}

async function completePendingRegistrationFromCheckoutSession(
  session: Stripe.Checkout.Session
) {
  const pendingRegistrationId = resolvePendingRegistrationIdFromSession(session);
  if (!pendingRegistrationId) {
    return false;
  }

  const customerId = toStripeObjectId(session.customer as string | { id?: string } | null);
  const subscriptionId = toStripeObjectId(
    session.subscription as string | { id?: string } | null
  );
  await updatePendingRegistrationStripeState({
    pendingRegistrationId,
    checkoutSessionId: session.id,
    customerId,
    subscriptionId
  });

  if (!subscriptionId) {
    return false;
  }

  const stripe = requireStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return completePendingRegistrationFromStripeSubscription(subscription, {
    pendingRegistrationId,
    checkoutSessionId: session.id
  });
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
  const billedTier = await resolveManagedMembershipTierFromStripePriceId(priceId);
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
  if (resolvePendingRegistrationIdFromSession(session)) {
    await completePendingRegistrationFromCheckoutSession(session);
    await redeemBillingDiscountFromCheckoutSession(session);
    return;
  }

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

    await redeemBillingDiscountFromCheckoutSession(session);
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
  await redeemBillingDiscountFromCheckoutSession(session);
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

async function invoicePlanName(invoice: Stripe.Invoice) {
  const priceId = invoice.lines.data[0]?.price?.id;
  const tier = await resolveManagedMembershipTierFromStripePriceId(priceId);
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
  const planName = await invoicePlanName(invoice);
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
  const completedPendingRegistration =
    await completePendingRegistrationFromStripeSubscription(subscription);

  if (completedPendingRegistration) {
    return;
  }

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
    await updatePendingRegistrationStripeState({
      pendingRegistrationId: resolvePendingRegistrationIdFromSession(session),
      checkoutSessionId: session.id,
      customerId: toStripeObjectId(session.customer as string | { id?: string } | null),
      subscriptionId: toStripeObjectId(
        session.subscription as string | { id?: string } | null
      ),
      status: PendingRegistrationStatus.EXPIRED
    });
  },
  handleSubscriptionChanged: async (subscription) => {
    const completedPendingRegistration =
      await completePendingRegistrationFromStripeSubscription(subscription);

    if (completedPendingRegistration) {
      return;
    }

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
  const selectedPlan = await resolveManagedMembershipPlan(
    input.targetTier,
    billingVariant,
    input.billingInterval
  );
  const priceId = selectedPlan.stripePriceId;
  const planKey = selectedPlan.planKey;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: absoluteUrl(input.successPath ?? "/dashboard?billing=success"),
      cancel_url: absoluteUrl(input.cancelPath ?? "/join?billing=cancelled"),
      client_reference_id: input.userId,
      metadata: {
        userId: input.userId,
        targetTier: input.targetTier,
        billingVariant,
        billingInterval: input.billingInterval,
        planKey,
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
          planKey,
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

export async function createStripeCheckoutSessionForPendingRegistration(
  input: PendingRegistrationCheckoutInput
): Promise<CheckoutSessionResult> {
  assertCoreAccessConfirmed(input);

  const stripe = requireStripeClient();
  const foundingReservation =
    input.allowFoundingOffer === false
      ? null
      : await reserveFoundingSlot({
          pendingRegistrationId: input.pendingRegistrationId,
          tier: input.targetTier,
          source: FoundingReservationSource.CHECKOUT
        });
  const billingVariant: MembershipBillingVariant = foundingReservation ? "founding" : "standard";
  const selectedPlan = await resolveManagedMembershipPlan(
    input.targetTier,
    billingVariant,
    input.billingInterval
  );
  const priceId = selectedPlan.stripePriceId;
  const planKey = selectedPlan.planKey;
  const metadata = {
    checkoutKind: "pending_registration",
    pendingRegistrationId: input.pendingRegistrationId,
    targetTier: input.targetTier,
    billingVariant,
    billingInterval: input.billingInterval,
    planKey,
    coreAccessConfirmed: input.coreAccessConfirmed ? "true" : "false",
    inviteCode: input.inviteCode ?? "",
    ...(foundingReservation
      ? {
          foundingReservationId: foundingReservation.id
        }
      : {})
  };

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: input.email,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: absoluteUrl(
        input.successPath ?? "/join/complete?session_id={CHECKOUT_SESSION_ID}"
      ),
      cancel_url: absoluteUrl(
        input.cancelPath ??
          `/join?billing=cancelled&tier=${input.targetTier}&period=${input.billingInterval}`
      ),
      client_reference_id: input.pendingRegistrationId,
      metadata,
      subscription_data: {
        metadata
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

  await updatePendingRegistrationStripeState({
    pendingRegistrationId: input.pendingRegistrationId,
    checkoutSessionId: session.id,
    customerId: toStripeObjectId(session.customer as string | { id?: string } | null),
    subscriptionId: toStripeObjectId(
      session.subscription as string | { id?: string } | null
    )
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

  const currentPlan = await resolveManagedMembershipPlanFromStripePriceId(primaryPriceItem.price.id);
  const billingVariant: MembershipBillingVariant =
    currentPlan.tier === input.targetTier ? currentPlan.billingVariant : "standard";
  const targetPlan = await resolveManagedMembershipPlan(
    input.targetTier,
    billingVariant,
    input.billingInterval
  );
  const targetPriceId = targetPlan.stripePriceId;

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
        billingInterval: input.billingInterval,
        planKey: targetPlan.planKey
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

export async function reconcilePendingRegistrationFromCheckoutSessionId(
  checkoutSessionId: string
) {
  const stripe = requireStripeClient();
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["subscription", "customer", "discounts", "discounts.promotion_code"]
  });

  await upsertSubscriptionFromCheckoutSession(session);

  if (!resolvePendingRegistrationIdFromSession(session)) {
    const email =
      session.customer_details?.email?.trim().toLowerCase() ??
      session.customer_email?.trim().toLowerCase() ??
      null;
    const subscriptionId = toStripeObjectId(
      session.subscription as string | { id?: string } | null
    );

    if (email && subscriptionId) {
      const pendingRegistration = await db.pendingRegistration.findFirst({
        where: {
          email,
          status: {
            in: [PendingRegistrationStatus.PENDING, PendingRegistrationStatus.PAID]
          }
        },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true
        }
      });

      if (pendingRegistration) {
        const subscription =
          typeof session.subscription === "object" && session.subscription
            ? (session.subscription as Stripe.Subscription)
            : await stripe.subscriptions.retrieve(subscriptionId);

        await completePendingRegistrationFromStripeSubscription(subscription, {
          pendingRegistrationId: pendingRegistration.id,
          checkoutSessionId: session.id
        });
      }
    }
  }
  return session;
}

export async function reconcilePendingRegistrationFromStripeReference(input: {
  checkoutSessionId?: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
  email?: string | null;
  pendingRegistrationId?: string | null;
}) {
  const stripe = requireStripeClient();

  if (input.checkoutSessionId) {
    await reconcilePendingRegistrationFromCheckoutSessionId(input.checkoutSessionId);
    return;
  }

  const pendingRegistrationId = input.pendingRegistrationId ?? null;
  const pendingRegistration = pendingRegistrationId
    ? await db.pendingRegistration.findUnique({
        where: { id: pendingRegistrationId },
        select: {
          id: true,
          stripeCheckoutSessionId: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          email: true
        }
      })
    : input.email
      ? await db.pendingRegistration.findFirst({
          where: {
            email: input.email,
            status: {
              in: [PendingRegistrationStatus.PENDING, PendingRegistrationStatus.PAID]
            }
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            stripeCheckoutSessionId: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            email: true
          }
        })
      : null;

  if (pendingRegistration?.stripeCheckoutSessionId) {
    await reconcilePendingRegistrationFromCheckoutSessionId(
      pendingRegistration.stripeCheckoutSessionId
    );
    return;
  }

  const subscriptionId = input.subscriptionId ?? pendingRegistration?.stripeSubscriptionId ?? null;
  const customerId = input.customerId ?? pendingRegistration?.stripeCustomerId ?? null;
  const email = input.email ?? pendingRegistration?.email ?? null;

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await completePendingRegistrationFromStripeSubscription(subscription, {
      pendingRegistrationId: pendingRegistration?.id ?? null
    });
    return;
  }

  let resolvedCustomerId = customerId;
  if (!resolvedCustomerId && email) {
    const customers = await stripe.customers.list({ email, limit: 1 });
    resolvedCustomerId = customers.data[0]?.id ?? null;
  }

  if (!resolvedCustomerId) {
    return;
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: resolvedCustomerId,
    status: "all",
    limit: 1
  });
  const subscription = subscriptions.data[0] ?? null;
  if (!subscription) {
    return;
  }

  await completePendingRegistrationFromStripeSubscription(subscription, {
    pendingRegistrationId: pendingRegistration?.id ?? null
  });
}
