import "server-only";

import {
  BillingInterval,
  CircleCardSubscriptionPlan,
  type MembershipTier,
  Prisma,
  type Role,
  SubscriptionStatus
} from "@prisma/client";
import type Stripe from "stripe";
import {
  CIRCLE_CARD_PRICING_CONFIG,
  getCircleCardProBillingConfigurationErrorMessage,
  isCircleCardBillingEnabled
} from "@/lib/circle-card/pricing";
import type { CircleCardBillingPeriod } from "@/lib/circle-card/billing-blueprint";
import {
  resolveCircleCardEntitlement,
  type CircleCardEntitlement
} from "@/lib/circle-card/permissions";
import type { PaidCircleCardPlanKey } from "@/lib/circle-card/permissions";
import { db } from "@/lib/db";
import { logServerWarning } from "@/lib/security/logging";
import { absoluteUrl } from "@/lib/utils";
import { requireStripeClient } from "@/server/stripe/client";
import {
  acquireWebhookProcessingLease,
  markWebhookFailed,
  markWebhookProcessed,
  stripeStatusToSubscriptionStatus
} from "@/server/subscriptions/subscription.service";

export const CIRCLE_CARD_PAID_ACCESS_POLICY =
  "Circle Card paid Pro access is granted for ACTIVE paid subscriptions. PAST_DUE or CANCELED subscriptions retain access only until the recorded currentPeriodEnd. TRIALING is not treated as paid access in this phase.";

type StripeObjectRef = string | { id?: string } | null | undefined;

type CircleCardSubscriptionForAccess = {
  plan: CircleCardSubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  lastInvoicePaidAt: Date | null;
};

type CircleCardReferralAttribution = {
  referralCode: string | null;
  referralClickId: string | null;
  referralId: string | null;
  referralSource: string | null;
};

type CircleCardCheckoutInput = {
  userId: string;
  email: string;
  name?: string | null;
  billingPeriod: CircleCardBillingPeriod;
  source?: string | null;
};

type CircleCardCheckoutResult = {
  id: string;
  url: string;
  priceId: string;
  billingInterval: BillingInterval;
};

type CircleCardPortalInput = {
  userId: string;
  email: string;
  name?: string | null;
  returnPath?: string;
};

function toStripeObjectId(value: StripeObjectRef): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return typeof value.id === "string" ? value.id : null;
}

function toDateFromStripeTimestamp(timestamp?: number | null): Date | null {
  if (!timestamp || !Number.isFinite(timestamp)) return null;
  return new Date(timestamp * 1000);
}

function resolveStripeProductId(
  product: string | Stripe.Product | Stripe.DeletedProduct | null | undefined
): string | null {
  if (!product) return null;
  if (typeof product === "string") return product;
  return typeof product.id === "string" ? product.id : null;
}

function billingIntervalForPeriod(period: CircleCardBillingPeriod) {
  return period === "annual" ? BillingInterval.YEAR : BillingInterval.MONTH;
}

function billingPeriodForInterval(interval: BillingInterval) {
  return interval === BillingInterval.YEAR ? "annual" : "monthly";
}

function normalizeMetadataValue(value: string | null | undefined) {
  return value?.trim().slice(0, 500) || "";
}

export function getCircleCardConfiguredPriceIds() {
  return {
    proMonthly: process.env.STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID?.trim() || "",
    proAnnual: process.env.STRIPE_CIRCLE_CARD_PRO_ANNUAL_PRICE_ID?.trim() || "",
    teamsMonthly: process.env.STRIPE_CIRCLE_CARD_TEAMS_MONTHLY_PRICE_ID?.trim() || "",
    teamsAnnual: process.env.STRIPE_CIRCLE_CARD_TEAMS_ANNUAL_PRICE_ID?.trim() || ""
  };
}

export function getCircleCardProStripePriceId(period: CircleCardBillingPeriod) {
  const priceIds = getCircleCardConfiguredPriceIds();
  const priceId = period === "annual" ? priceIds.proAnnual : priceIds.proMonthly;

  if (!priceId) {
    throw new Error(
      period === "annual"
        ? "STRIPE_CIRCLE_CARD_PRO_ANNUAL_PRICE_ID is required."
        : "STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID is required."
    );
  }

  return priceId;
}

function resolveCircleCardPlanFromPriceId(priceId: string | null | undefined) {
  const priceIds = getCircleCardConfiguredPriceIds();
  if (priceId && (priceId === priceIds.proMonthly || priceId === priceIds.proAnnual)) {
    return CircleCardSubscriptionPlan.PRO;
  }
  if (priceId && (priceId === priceIds.teamsMonthly || priceId === priceIds.teamsAnnual)) {
    return CircleCardSubscriptionPlan.TEAMS;
  }
  return null;
}

function resolveCircleCardBillingIntervalFromPriceId(priceId: string | null | undefined) {
  const priceIds = getCircleCardConfiguredPriceIds();
  if (priceId && (priceId === priceIds.proAnnual || priceId === priceIds.teamsAnnual)) {
    return BillingInterval.YEAR;
  }
  return BillingInterval.MONTH;
}

function resolvePrimaryPrice(subscription: Stripe.Subscription): Stripe.SubscriptionItem | null {
  return subscription.items.data[0] ?? null;
}

function isCircleCardMetadata(metadata: Stripe.Metadata | null | undefined) {
  return (
    metadata?.circleCardPlan === "PRO" ||
    metadata?.circleCardPlan === "TEAMS" ||
    metadata?.product === "circle-card-pro"
  );
}

function hasCircleCardPrice(priceIds: Array<string | null | undefined>) {
  return priceIds.some((priceId) => Boolean(resolveCircleCardPlanFromPriceId(priceId)));
}

export function isCircleCardSubscriptionEntitled(
  subscription: CircleCardSubscriptionForAccess | null | undefined,
  now = new Date()
) {
  if (!subscription || subscription.plan !== CircleCardSubscriptionPlan.PRO) {
    return false;
  }

  if (subscription.status === SubscriptionStatus.ACTIVE) {
    return !subscription.currentPeriodEnd || subscription.currentPeriodEnd >= now;
  }

  if (
    (subscription.status === SubscriptionStatus.PAST_DUE ||
      subscription.status === SubscriptionStatus.CANCELED) &&
    subscription.currentPeriodEnd
  ) {
    return subscription.currentPeriodEnd >= now;
  }

  return false;
}

function monthEnd(periodMonth: Date) {
  return new Date(Date.UTC(periodMonth.getUTCFullYear(), periodMonth.getUTCMonth() + 1, 1));
}

export function isPaidCircleCardProCommissionEligibleForMonth(
  subscription: CircleCardSubscriptionForAccess | null | undefined,
  periodMonth: Date,
  now = new Date()
) {
  if (!subscription?.lastInvoicePaidAt) return false;
  if (!isCircleCardSubscriptionEntitled(subscription, now)) return false;

  const periodEnd = monthEnd(periodMonth);
  const accessStart = subscription.currentPeriodStart ?? subscription.lastInvoicePaidAt;
  const accessEnd = subscription.currentPeriodEnd ?? periodEnd;

  return accessStart < periodEnd && accessEnd >= periodMonth;
}

async function findStripeCustomerIdByEmail(email: string) {
  const stripe = requireStripeClient();
  const customers = await stripe.customers.list({ email, limit: 10 });
  const normalized = email.trim().toLowerCase();

  return customers.data.find((customer) => customer.email?.trim().toLowerCase() === normalized)?.id ?? null;
}

export async function ensureCircleCardStripeCustomerId(input: {
  userId: string;
  email: string;
  name?: string | null;
}) {
  const [circleCardSubscription, bcnSubscription] = await Promise.all([
    db.circleCardSubscription.findUnique({
      where: { userId: input.userId },
      select: { stripeCustomerId: true }
    }),
    db.subscription.findUnique({
      where: { userId: input.userId },
      select: { stripeCustomerId: true }
    })
  ]);

  if (circleCardSubscription?.stripeCustomerId) return circleCardSubscription.stripeCustomerId;
  if (bcnSubscription?.stripeCustomerId) return bcnSubscription.stripeCustomerId;

  const stripe = requireStripeClient();
  const matchedCustomerId = await findStripeCustomerIdByEmail(input.email);
  const customer = matchedCustomerId
    ? await stripe.customers.update(matchedCustomerId, {
        email: input.email,
        name: input.name ?? undefined,
        metadata: { userId: input.userId }
      })
    : await stripe.customers.create({
        email: input.email,
        name: input.name ?? undefined,
        metadata: { userId: input.userId }
      });

  return customer.id;
}

async function loadServerDerivedReferralAttribution(userId: string): Promise<CircleCardReferralAttribution> {
  const referral = await db.circleCardGrowthReferral.findUnique({
    where: { referredUserId: userId },
    select: {
      id: true,
      referrerUserId: true,
      referralCode: true,
      referralSource: true
    }
  });

  if (!referral || referral.referrerUserId === userId) {
    return {
      referralCode: null,
      referralClickId: null,
      referralId: null,
      referralSource: null
    };
  }

  return {
    referralCode: referral.referralCode,
    referralClickId: referral.id,
    referralId: referral.id,
    referralSource: referral.referralSource
  };
}

async function assertNoDuplicateActiveProSubscription(userId: string) {
  const existing = await db.circleCardSubscription.findUnique({
    where: { userId },
    select: {
      plan: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      lastInvoicePaidAt: true
    }
  });

  if (isCircleCardSubscriptionEntitled(existing)) {
    throw new Error("circle-card-pro-already-active");
  }
}

export async function createCircleCardProCheckoutSession(
  input: CircleCardCheckoutInput
): Promise<CircleCardCheckoutResult> {
  if (!isCircleCardBillingEnabled()) {
    throw new Error("Circle Card billing is disabled.");
  }

  const configurationError = getCircleCardProBillingConfigurationErrorMessage();
  if (configurationError) {
    throw new Error(configurationError);
  }

  await assertNoDuplicateActiveProSubscription(input.userId);

  const stripe = requireStripeClient();
  const priceId = getCircleCardProStripePriceId(input.billingPeriod);
  const billingInterval = billingIntervalForPeriod(input.billingPeriod);
  const customerId = await ensureCircleCardStripeCustomerId(input);
  const attribution = await loadServerDerivedReferralAttribution(input.userId);
  const metadata: Stripe.MetadataParam = {
    userId: input.userId,
    circleCardPlan: "PRO",
    billingPeriod: input.billingPeriod,
    source: normalizeMetadataValue(input.source) || "circle_card_pro_checkout",
    referralCode: attribution.referralCode ?? "",
    referralClickId: attribution.referralClickId ?? "",
    referralId: attribution.referralId ?? "",
    referralSource: attribution.referralSource ?? ""
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: absoluteUrl("/dashboard/circle-card?billing=success&plan=pro"),
    cancel_url: absoluteUrl("/circle-card/pro?billing=cancelled"),
    client_reference_id: input.userId,
    metadata,
    subscription_data: {
      metadata
    }
  });

  if (!session.url) {
    throw new Error("Stripe checkout session did not return a redirect URL.");
  }

  await db.circleCardSubscription.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      plan: CircleCardSubscriptionPlan.PRO,
      status: SubscriptionStatus.INCOMPLETE,
      billingInterval,
      stripeCustomerId: customerId,
      stripePriceId: priceId
    },
    update: {
      plan: CircleCardSubscriptionPlan.PRO,
      status: SubscriptionStatus.INCOMPLETE,
      billingInterval,
      stripeCustomerId: customerId,
      stripePriceId: priceId
    }
  });

  return {
    id: session.id,
    url: session.url,
    priceId,
    billingInterval
  };
}

export async function createCircleCardBillingPortalSession(input: CircleCardPortalInput) {
  const stripe = requireStripeClient();
  const customerId = await ensureCircleCardStripeCustomerId(input);
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: absoluteUrl(input.returnPath ?? "/dashboard/circle-card?billing=portal-return")
  });

  return { url: session.url };
}

function resolveUserIdFromSubscription(subscription: Stripe.Subscription) {
  return subscription.metadata?.userId?.trim() || null;
}

async function resolveUserIdFromCheckoutSession(session: Stripe.Checkout.Session) {
  const metadataUserId = session.metadata?.userId?.trim();
  if (metadataUserId) return metadataUserId;

  const subscriptionId = toStripeObjectId(session.subscription as StripeObjectRef);
  const customerId = toStripeObjectId(session.customer as StripeObjectRef);
  const OR: Prisma.CircleCardSubscriptionWhereInput[] = [];

  if (subscriptionId) OR.push({ stripeSubscriptionId: subscriptionId });
  if (customerId) OR.push({ stripeCustomerId: customerId });
  if (!OR.length) return null;

  const existing = await db.circleCardSubscription.findFirst({
    where: { OR },
    select: { userId: true }
  });

  return existing?.userId ?? null;
}

async function upsertCircleCardSubscriptionFromStripeSubscription(
  subscription: Stripe.Subscription,
  knownUserId?: string | null,
  options: { checkoutSessionId?: string | null; invoicePaidAt?: Date | null } = {}
) {
  const priceItem = resolvePrimaryPrice(subscription);
  const priceId = priceItem?.price.id ?? subscription.metadata?.stripePriceId ?? null;
  const plan =
    subscription.metadata?.circleCardPlan === "TEAMS"
      ? CircleCardSubscriptionPlan.TEAMS
      : resolveCircleCardPlanFromPriceId(priceId) ?? CircleCardSubscriptionPlan.PRO;
  const billingInterval = resolveCircleCardBillingIntervalFromPriceId(priceId);
  const userId = knownUserId ?? resolveUserIdFromSubscription(subscription);
  const customerId = toStripeObjectId(subscription.customer as StripeObjectRef);

  if (!userId || !customerId || !priceId) {
    return null;
  }

  const normalizedStatus = stripeStatusToSubscriptionStatus(subscription.status);
  const persisted = await db.circleCardSubscription.upsert({
    where: { userId },
    create: {
      userId,
      plan,
      status: normalizedStatus,
      billingInterval,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeProductId: resolveStripeProductId(priceItem?.price.product),
      currentPeriodStart: toDateFromStripeTimestamp(subscription.current_period_start),
      currentPeriodEnd: toDateFromStripeTimestamp(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelledAt: toDateFromStripeTimestamp(subscription.canceled_at),
      trialEndsAt: toDateFromStripeTimestamp(subscription.trial_end),
      lastInvoicePaidAt: options.invoicePaidAt ?? undefined
    },
    update: {
      plan,
      status: normalizedStatus,
      billingInterval,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeProductId: resolveStripeProductId(priceItem?.price.product),
      currentPeriodStart: toDateFromStripeTimestamp(subscription.current_period_start),
      currentPeriodEnd: toDateFromStripeTimestamp(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelledAt: toDateFromStripeTimestamp(subscription.canceled_at),
      trialEndsAt: toDateFromStripeTimestamp(subscription.trial_end),
      ...(options.invoicePaidAt ? { lastInvoicePaidAt: options.invoicePaidAt } : {})
    },
    select: {
      id: true,
      userId: true,
      plan: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      lastInvoicePaidAt: true
    }
  });

  if (options.invoicePaidAt && plan === CircleCardSubscriptionPlan.PRO) {
    await markAttributedReferralConvertedToPaidPro(userId, options.invoicePaidAt);
  }

  return persisted;
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const subscriptionId = toStripeObjectId(session.subscription as StripeObjectRef);
  const userId = await resolveUserIdFromCheckoutSession(session);

  if (!subscriptionId || !userId) return;

  const stripe = requireStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const invoicePaidAt =
    session.payment_status === "paid" ? new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000) : null;

  await upsertCircleCardSubscriptionFromStripeSubscription(subscription, userId, {
    checkoutSessionId: session.id,
    invoicePaidAt
  });
}

async function handleSubscriptionChanged(subscription: Stripe.Subscription) {
  await upsertCircleCardSubscriptionFromStripeSubscription(subscription);
}

async function handleInvoice(invoice: Stripe.Invoice, outcome: "paid" | "failed") {
  const subscriptionId = toStripeObjectId(invoice.subscription as StripeObjectRef);
  if (!subscriptionId) return;

  const stripe = requireStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await upsertCircleCardSubscriptionFromStripeSubscription(subscription, null, {
    invoicePaidAt: outcome === "paid" ? new Date() : null
  });
}

async function markAttributedReferralConvertedToPaidPro(userId: string, convertedAt: Date) {
  const referral = await db.circleCardGrowthReferral.findUnique({
    where: { referredUserId: userId },
    select: { id: true, referrerUserId: true, convertedToProAt: true }
  });

  if (!referral || referral.referrerUserId === userId || referral.convertedToProAt) {
    return;
  }

  await db.circleCardGrowthReferral.updateMany({
    where: {
      id: referral.id,
      referredUserId: userId,
      referrerUserId: { not: userId },
      convertedToProAt: null
    },
    data: { convertedToProAt: convertedAt }
  });
}

async function isCircleCardCheckoutSession(session: Stripe.Checkout.Session) {
  if (isCircleCardMetadata(session.metadata)) return true;
  const subscriptionId = toStripeObjectId(session.subscription as StripeObjectRef);
  if (!subscriptionId) return false;

  const stripe = requireStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return isCircleCardStripeSubscription(subscription);
}

function isCircleCardStripeSubscription(subscription: Stripe.Subscription) {
  const primaryPriceId = resolvePrimaryPrice(subscription)?.price.id ?? null;
  return isCircleCardMetadata(subscription.metadata) || hasCircleCardPrice([primaryPriceId]);
}

async function isCircleCardInvoice(invoice: Stripe.Invoice) {
  const invoicePriceIds = invoice.lines.data.map((line) => line.price?.id ?? null);
  if (hasCircleCardPrice(invoicePriceIds)) return true;

  const subscriptionId = toStripeObjectId(invoice.subscription as StripeObjectRef);
  if (!subscriptionId) return false;

  const stripe = requireStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return isCircleCardStripeSubscription(subscription);
}

export async function processCircleCardStripeWebhookEvent(event: Stripe.Event) {
  let handlesEvent = false;

  switch (event.type) {
    case "checkout.session.completed":
      handlesEvent = await isCircleCardCheckoutSession(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      handlesEvent = isCircleCardStripeSubscription(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
    case "invoice.payment_failed":
      handlesEvent = await isCircleCardInvoice(event.data.object as Stripe.Invoice);
      break;
    default:
      handlesEvent = false;
  }

  if (!handlesEvent) {
    return false;
  }

  const shouldProcess = await acquireWebhookProcessingLease(event);
  if (!shouldProcess) {
    return true;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChanged(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoice(event.data.object as Stripe.Invoice, "paid");
        break;
      case "invoice.payment_failed":
        await handleInvoice(event.data.object as Stripe.Invoice, "failed");
        break;
    }

    await markWebhookProcessed(event.id);
  } catch (error) {
    await markWebhookFailed(event.id, error);
    throw error;
  }

  return true;
}

export async function loadCircleCardEntitlementForUser(input: {
  userId: string;
  role: Role;
  membershipTier: MembershipTier;
  hasActiveSubscription: boolean;
  suspended: boolean;
}): Promise<CircleCardEntitlement> {
  const [circleCardSubscription, ambassadorProfile] = await Promise.all([
    db.circleCardSubscription.findUnique({
      where: { userId: input.userId },
      select: {
        plan: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        lastInvoicePaidAt: true
      }
    }),
    db.circleCardAmbassadorProfile.findUnique({
      where: { userId: input.userId },
      select: { freeProGranted: true, active: true }
    })
  ]);
  const hasPaidCircleCardSubscription = isCircleCardSubscriptionEntitled(circleCardSubscription);
  const circleCardSubscriptionPlan = hasPaidCircleCardSubscription
    ? (circleCardSubscription?.plan as PaidCircleCardPlanKey)
    : null;

  return resolveCircleCardEntitlement({
    role: input.role,
    membershipTier: input.membershipTier,
    suspended: input.suspended,
    hasActiveSubscription: input.hasActiveSubscription,
    hasActiveCircleCardSubscription: hasPaidCircleCardSubscription,
    circleCardSubscriptionPlan,
    circleCardAmbassadorFreePro:
      Boolean(ambassadorProfile?.freeProGranted) && ambassadorProfile?.active !== false
  });
}

export async function getCircleCardBillingAdminMetrics() {
  const now = new Date();
  const [
    paidSubscribers,
    monthlySubscribers,
    annualSubscribers,
    trialingCount,
    pastDueCount,
    cancellingAtPeriodEnd,
    cancelledCount,
    paidReferralCount,
    pendingTotals,
    paidTotals
  ] = await Promise.all([
    db.circleCardSubscription.count({
      where: { plan: CircleCardSubscriptionPlan.PRO, status: SubscriptionStatus.ACTIVE }
    }),
    db.circleCardSubscription.count({
      where: {
        plan: CircleCardSubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        billingInterval: BillingInterval.MONTH
      }
    }),
    db.circleCardSubscription.count({
      where: {
        plan: CircleCardSubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        billingInterval: BillingInterval.YEAR
      }
    }),
    db.circleCardSubscription.count({ where: { status: SubscriptionStatus.TRIALING } }),
    db.circleCardSubscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
    db.circleCardSubscription.count({ where: { cancelAtPeriodEnd: true, currentPeriodEnd: { gte: now } } }),
    db.circleCardSubscription.count({ where: { status: SubscriptionStatus.CANCELED } }),
    db.circleCardGrowthReferral.count({ where: { convertedToProAt: { not: null } } }),
    db.circleCardCommissionLedger.aggregate({
      where: { status: { in: ["PENDING", "APPROVED"] } },
      _sum: { amountPence: true }
    }),
    db.circleCardCommissionLedger.aggregate({
      where: { status: "PAID" },
      _sum: { amountPence: true }
    })
  ]);

  return {
    paidSubscribers,
    monthlySubscribers,
    annualSubscribers,
    trialingCount,
    pastDueCount,
    cancellingAtPeriodEnd,
    cancelledCount,
    paidReferralCount,
    pendingCommissionPence: pendingTotals._sum.amountPence ?? 0,
    paidCommissionPence: paidTotals._sum.amountPence ?? 0,
    policy: CIRCLE_CARD_PAID_ACCESS_POLICY
  };
}

export function circleCardPlanFromSubscriptionPlan(plan: CircleCardSubscriptionPlan) {
  return plan === CircleCardSubscriptionPlan.TEAMS ? "TEAMS" : "PRO";
}

export function circleCardCheckoutPriceSummary(period: CircleCardBillingPeriod) {
  const config = CIRCLE_CARD_PRICING_CONFIG.PRO;
  return {
    billingPeriod: period,
    billingInterval: billingIntervalForPeriod(period),
    priceMajor: period === "annual" ? config.priceAnnual : config.priceMonthly,
    periodLabel: billingPeriodForInterval(billingIntervalForPeriod(period))
  };
}

export async function reconcileCurrentCircleCardCommissionRows(now = new Date()) {
  const periodMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const rows = await db.circleCardCommissionLedger.findMany({
    where: {
      periodMonth,
      status: "PENDING"
    },
    select: {
      id: true,
      referredUserId: true
    }
  });

  let voided = 0;
  for (const row of rows) {
    const subscription = await db.circleCardSubscription.findUnique({
      where: { userId: row.referredUserId },
      select: {
        plan: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        lastInvoicePaidAt: true
      }
    });

    if (isPaidCircleCardProCommissionEligibleForMonth(subscription, periodMonth, now)) {
      continue;
    }

    await db.circleCardCommissionLedger.update({
      where: { id: row.id },
      data: {
        status: "VOID",
        voidedAt: now,
        statusReason: "Automatic reconciliation: no paid Circle Card Pro subscription for period."
      }
    });
    voided += 1;
  }

  if (voided > 0) {
    logServerWarning("circle-card-commission-pending-rows-reconciled", { voided });
  }

  return { periodMonth, voided };
}
