import "server-only";

import { randomUUID } from "node:crypto";
import {
  BillingInterval,
  CircleCardSubscriptionPlan,
  Prisma,
  SubscriptionStatus
} from "@prisma/client";
import { cache } from "react";
import type Stripe from "stripe";
import {
  CIRCLE_CARD_PRICING_CONFIG,
  getCircleCardProBillingConfigurationErrorMessage,
  isCircleCardBillingEnabled
} from "@/lib/circle-card/pricing";
import type { CircleCardBillingPeriod } from "@/lib/circle-card/billing-blueprint";
import {
  buildCircleCardAccessSnapshot,
  resolveCircleCardEntitlement,
  type CircleCardAccessSnapshot
} from "@/lib/circle-card/permissions";
import type { PaidCircleCardPlanKey } from "@/lib/circle-card/permissions";
import {
  circleCardEffectiveAccessEndsAt,
  circleCardRecoveryGraceEndsAt,
  deriveCircleCardPaidLifecycleStatus,
  isCircleCardPaidAccessActive
} from "@/lib/circle-card/subscription-lifecycle";
import { db } from "@/lib/db";
import { hasEntitledSubscription } from "@/lib/membership/access";
import { logServerInfo, logServerWarning } from "@/lib/security/logging";
import { absoluteUrl } from "@/lib/utils";
import {
  appendCircleCardProResultParams,
  buildCircleCardProHref,
  normalizeCircleCardProIntent,
  type CircleCardProIntent
} from "@/lib/circle-card/pro-intent";
import { requireStripeClient } from "@/server/stripe/client";
import {
  acquireWebhookProcessingLease,
  markWebhookFailed,
  markWebhookProcessed,
  stripeStatusToSubscriptionStatus
} from "@/server/subscriptions/subscription.service";

export const CIRCLE_CARD_PAID_ACCESS_POLICY =
  "Circle Card paid Pro access requires confirmed invoice paid-through evidence. PAST_DUE receives one fixed seven-day recovery grace after a previously paid period. CANCELED retains access only through confirmed accessEndsAt. Trials are not a launch entitlement.";

const CIRCLE_CARD_CHECKOUT_CLAIM_MS = 2 * 60 * 1000;
const CIRCLE_CARD_CHECKOUT_ATTEMPT_RECOVERY_MS = 4 * 60 * 1000;
const CIRCLE_CARD_CHECKOUT_SESSION_SECONDS = 35 * 60;
const CIRCLE_CARD_RECONCILIATION_CONFLICT = "circle-card-reconciliation-conflict";

type StripeObjectRef = string | { id?: string } | null | undefined;

type CircleCardSubscriptionForAccess = {
  plan: CircleCardSubscriptionPlan;
  status: SubscriptionStatus;
  accessEndsAt: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  paymentFailedAt?: Date | null;
  recoveryGraceEndsAt?: Date | null;
  cancelAtPeriodEnd?: boolean;
  cancellationEffectiveAt?: Date | null;
  latestCheckoutSessionId?: string | null;
  checkoutSessionExpiresAt?: Date | null;
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
  intent?: Partial<CircleCardProIntent>;
};

type CircleCardCheckoutResult = {
  id: string;
  url: string;
  priceId: string;
  billingInterval: BillingInterval;
  reused: boolean;
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
  const priceId = period === "monthly" ? priceIds.proMonthly : "";

  if (!priceId) {
    throw new Error("STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID is required.");
  }

  return priceId;
}

function resolveCircleCardPlanFromPriceId(priceId: string | null | undefined) {
  const priceIds = getCircleCardConfiguredPriceIds();
  if (priceId && priceId === priceIds.proMonthly) {
    return CircleCardSubscriptionPlan.PRO;
  }
  return null;
}

function resolveCircleCardBillingIntervalFromPriceId(priceId: string | null | undefined) {
  void priceId;
  return BillingInterval.MONTH;
}

function resolvePrimaryPrice(subscription: Stripe.Subscription): Stripe.SubscriptionItem | null {
  return subscription.items.data[0] ?? null;
}

function isCircleCardMetadata(metadata: Stripe.Metadata | null | undefined) {
  return metadata?.circleCardPlan === "PRO" || metadata?.product === "circle-card-pro";
}

function hasCircleCardPrice(priceIds: Array<string | null | undefined>) {
  return priceIds.some((priceId) => Boolean(resolveCircleCardPlanFromPriceId(priceId)));
}

export function isCircleCardSubscriptionEntitled(
  subscription: CircleCardSubscriptionForAccess | null | undefined,
  now = new Date()
) {
  return isCircleCardPaidAccessActive(subscription, now);
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

async function findStripeCustomerIdsByEmail(email: string) {
  const stripe = requireStripeClient();
  const customers = await stripe.customers.list({ email, limit: 100 });
  const normalized = email.trim().toLowerCase();

  return customers.data
    .filter((customer) => customer.email?.trim().toLowerCase() === normalized)
    .map((customer) => customer.id);
}

async function resolveCircleCardStripeCustomerContext(input: {
  userId: string;
  email: string;
  name?: string | null;
}) {
  const [circleCardSubscription, bcnSubscription, exactEmailCustomerIds] = await Promise.all([
    db.circleCardSubscription.findUnique({
      where: { userId: input.userId },
      select: { stripeCustomerId: true }
    }),
    db.subscription.findUnique({
      where: { userId: input.userId },
      select: { stripeCustomerId: true }
    }),
    findStripeCustomerIdsByEmail(input.email)
  ]);

  const stripe = requireStripeClient();
  const storedCustomerId =
    circleCardSubscription?.stripeCustomerId ?? bcnSubscription?.stripeCustomerId ?? null;
  const matchedCustomerId = exactEmailCustomerIds[0] ?? null;
  const customer = storedCustomerId
    ? { id: storedCustomerId }
    : matchedCustomerId
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

  return {
    customerId: customer.id,
    customerIdsToInspect: [...new Set([
      customer.id,
      ...exactEmailCustomerIds,
      circleCardSubscription?.stripeCustomerId,
      bcnSubscription?.stripeCustomerId
    ].filter((customerId): customerId is string => Boolean(customerId)))]
  };
}

export async function ensureCircleCardStripeCustomerId(input: {
  userId: string;
  email: string;
  name?: string | null;
}) {
  return (await resolveCircleCardStripeCustomerContext(input)).customerId;
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

function stripeSubscriptionIsNonTerminal(subscription: Stripe.Subscription) {
  return subscription.status !== "canceled" && subscription.status !== "incomplete_expired";
}

function stripeSubscriptionMatchesCircleCardPro(
  subscription: Stripe.Subscription,
  storedSubscriptionId?: string | null
) {
  const priceId = resolvePrimaryPrice(subscription)?.price.id ?? null;
  return (
    resolveCircleCardPlanFromPriceId(priceId) === CircleCardSubscriptionPlan.PRO ||
    subscription.id === storedSubscriptionId
  );
}

async function reusableCheckoutSession(userId: string, now: Date) {
  const existing = await db.circleCardSubscription.findUnique({
    where: { userId },
    select: {
      latestCheckoutSessionId: true,
      checkoutSessionExpiresAt: true
    }
  });

  if (!existing?.latestCheckoutSessionId) {
    return null;
  }

  if (!existing.checkoutSessionExpiresAt || existing.checkoutSessionExpiresAt <= now) {
    await db.circleCardSubscription.updateMany({
      where: { userId, latestCheckoutSessionId: existing.latestCheckoutSessionId },
      data: {
        latestCheckoutSessionId: null,
        checkoutSessionExpiresAt: null,
        checkoutAttemptId: null,
        checkoutStartedAt: null
      }
    });
    return null;
  }

  const stripe = requireStripeClient();
  const session = await stripe.checkout.sessions.retrieve(existing.latestCheckoutSessionId);
  if (
    session.status !== "open" ||
    !session.url ||
    !session.expires_at ||
    session.expires_at * 1000 <= now.getTime()
  ) {
    await db.circleCardSubscription.updateMany({
      where: {
        userId,
        latestCheckoutSessionId: existing.latestCheckoutSessionId
      },
      data: {
        latestCheckoutSessionId: null,
        checkoutSessionExpiresAt: null,
        checkoutAttemptId: null,
        checkoutStartedAt: null
      }
    });
    return null;
  }

  return session;
}

async function inspectExistingStripeCircleCardSubscriptions(
  customerIds: string[],
  storedSubscriptionId?: string | null
) {
  const stripe = requireStripeClient();
  const subscriptionPages = await Promise.all(
    customerIds.map((customerId) =>
      stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })
    )
  );
  const relevant = subscriptionPages.flatMap((page) => page.data).filter(
    (subscription) =>
      stripeSubscriptionMatchesCircleCardPro(subscription, storedSubscriptionId) &&
      stripeSubscriptionIsNonTerminal(subscription)
  );
  const uniqueRelevant = [...new Map(relevant.map((subscription) => [subscription.id, subscription])).values()];

  if (uniqueRelevant.length > 1) {
    throw new Error(CIRCLE_CARD_RECONCILIATION_CONFLICT);
  }

  return uniqueRelevant[0] ?? null;
}

async function findRecoverableStripeCheckoutSession(input: {
  customerIds: string[];
  userId: string;
  now: Date;
}) {
  const stripe = requireStripeClient();
  const pages = await Promise.all(
    input.customerIds.map((customerId) =>
      stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 100 })
    )
  );
  const sessions = pages
    .flatMap((page) => page.data)
    .filter(
      (session) =>
        session.mode === "subscription" &&
        session.status === "open" &&
        session.url &&
        session.expires_at &&
        session.expires_at * 1000 > input.now.getTime() &&
        session.client_reference_id === input.userId &&
        session.metadata?.userId === input.userId &&
        session.metadata?.circleCardPlan === "PRO" &&
        session.metadata?.billingPeriod === "monthly" &&
        session.metadata?.source === "circle_card_pro_checkout"
    )
    .sort((left, right) => (right.created ?? 0) - (left.created ?? 0) || right.id.localeCompare(left.id));

  const [selected, ...duplicates] = sessions;
  const duplicateExpiryResults = await Promise.all(
    duplicates.map(async (session) => {
      try {
        await stripe.checkout.sessions.expire(session.id);
        logServerInfo("circle-card-duplicate-checkout-session-expired", {
          checkoutSessionId: session.id,
          userId: input.userId
        });
        return true;
      } catch (error) {
        logServerWarning("circle-card-duplicate-checkout-session-expiry-failed", {
          checkoutSessionId: session.id,
          reason: error instanceof Error ? error.name : "unknown"
        });
        return false;
      }
    })
  );

  if (duplicateExpiryResults.some((expired) => !expired)) {
    await db.circleCardSubscription.updateMany({
      where: { userId: input.userId },
      data: {
        reconciliationRequiredAt: input.now,
        reconciliationReason: "Multiple viable Circle Card Checkout sessions require review."
      }
    });
    throw new Error(CIRCLE_CARD_RECONCILIATION_CONFLICT);
  }

  return selected ?? null;
}

async function persistRecoveredStripeCheckoutSession(input: {
  session: Stripe.Checkout.Session;
  userId: string;
  customerId: string;
  priceId: string;
}) {
  await db.circleCardSubscription.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      plan: CircleCardSubscriptionPlan.PRO,
      status: SubscriptionStatus.INCOMPLETE,
      billingInterval: BillingInterval.MONTH,
      stripeCustomerId: input.customerId,
      stripePriceId: input.priceId,
      latestCheckoutSessionId: input.session.id,
      checkoutSessionExpiresAt: toDateFromStripeTimestamp(input.session.expires_at)
    },
    update: {
      stripeCustomerId: input.customerId,
      stripePriceId: input.priceId,
      billingInterval: BillingInterval.MONTH,
      latestCheckoutSessionId: input.session.id,
      checkoutSessionExpiresAt: toDateFromStripeTimestamp(input.session.expires_at),
      checkoutAttemptId: null,
      checkoutStartedAt: null
    }
  });
}

type CircleCardCheckoutClaim = {
  attemptId: string;
  checkoutStartedAt: Date;
  recoveredAttempt: boolean;
};

async function claimCircleCardCheckout(input: {
  userId: string;
  customerId: string;
  priceId: string;
  now: Date;
}): Promise<CircleCardCheckoutClaim | null> {
  const row = await db.circleCardSubscription.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      plan: CircleCardSubscriptionPlan.PRO,
      status: SubscriptionStatus.INCOMPLETE,
      billingInterval: BillingInterval.MONTH,
      stripeCustomerId: input.customerId,
      stripePriceId: input.priceId
    },
    update: {},
    select: {
      checkoutAttemptId: true,
      checkoutStartedAt: true,
      latestCheckoutSessionId: true,
      checkoutSessionExpiresAt: true
    }
  });

  const staleClaimBefore = new Date(input.now.getTime() - CIRCLE_CARD_CHECKOUT_CLAIM_MS);
  if (row.checkoutAttemptId && row.checkoutStartedAt) {
    const attemptRecoveryEndsAt = new Date(
      row.checkoutStartedAt.getTime() + CIRCLE_CARD_CHECKOUT_ATTEMPT_RECOVERY_MS
    );
    if (attemptRecoveryEndsAt <= input.now) {
      const cleared = await db.circleCardSubscription.updateMany({
        where: {
          userId: input.userId,
          checkoutAttemptId: row.checkoutAttemptId,
          latestCheckoutSessionId: null
        },
        data: { checkoutAttemptId: null, checkoutStartedAt: null }
      });
      return cleared.count
        ? claimCircleCardCheckout(input)
        : null;
    }

    if (
      row.latestCheckoutSessionId &&
      row.checkoutSessionExpiresAt &&
      row.checkoutSessionExpiresAt > input.now
    ) {
      return null;
    }

    if (row.checkoutStartedAt >= staleClaimBefore) {
      return null;
    }

    // A previous process may have reached Stripe but crashed before persisting
    // the response. Reuse the same attempt and Stripe idempotency key so that
    // retrying cannot create another viable Checkout session.
    return {
      attemptId: row.checkoutAttemptId,
      checkoutStartedAt: row.checkoutStartedAt,
      recoveredAttempt: true
    };
  }

  const attemptId = randomUUID();
  const claimed = await db.circleCardSubscription.updateMany({
    where: {
      userId: input.userId,
      checkoutAttemptId: null,
      checkoutStartedAt: null,
      OR: [{ latestCheckoutSessionId: null }, { checkoutSessionExpiresAt: { lte: input.now } }]
    },
    data: {
      checkoutAttemptId: attemptId,
      checkoutStartedAt: input.now,
      latestCheckoutSessionId: null,
      checkoutSessionExpiresAt: null,
      stripeCustomerId: input.customerId,
      stripePriceId: input.priceId,
      billingInterval: BillingInterval.MONTH
    }
  });

  return claimed.count === 1
    ? { attemptId, checkoutStartedAt: input.now, recoveredAttempt: false }
    : null;
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

  const authoritativeAccess = await loadCircleCardAccessForUser(input.userId);
  if (authoritativeAccess.hasProAccess) {
    throw new Error(
      authoritativeAccess.source === "standalone_subscription" ||
        authoritativeAccess.source === "teams"
        ? "circle-card-pro-already-active"
        : "circle-card-pro-already-included"
    );
  }

  const stripe = requireStripeClient();
  const now = new Date();
  const priceId = getCircleCardProStripePriceId("monthly");
  const billingInterval = BillingInterval.MONTH;
  const existingLocalSubscription = await db.circleCardSubscription.findUnique({
    where: { userId: input.userId },
    select: {
      plan: true,
      status: true,
      accessEndsAt: true,
      paymentFailedAt: true,
      recoveryGraceEndsAt: true,
      cancelAtPeriodEnd: true,
      cancellationEffectiveAt: true,
      stripeSubscriptionId: true,
      latestCheckoutSessionId: true,
      checkoutSessionExpiresAt: true,
      lastInvoicePaidAt: true
    }
  });
  if (isCircleCardSubscriptionEntitled(existingLocalSubscription, now)) {
    throw new Error("circle-card-pro-already-active");
  }

  const reusable = await reusableCheckoutSession(input.userId, now);
  if (reusable?.url) {
    return {
      id: reusable.id,
      url: reusable.url,
      priceId,
      billingInterval,
      reused: true
    };
  }

  const customerContext = await resolveCircleCardStripeCustomerContext(input);
  const customerId = customerContext.customerId;
  let existingStripeSubscription: Stripe.Subscription | null;
  try {
    existingStripeSubscription = await inspectExistingStripeCircleCardSubscriptions(
      customerContext.customerIdsToInspect,
      existingLocalSubscription?.stripeSubscriptionId
    );
  } catch (error) {
    if (error instanceof Error && error.message === CIRCLE_CARD_RECONCILIATION_CONFLICT) {
      await db.circleCardSubscription.updateMany({
        where: { userId: input.userId },
        data: {
          reconciliationRequiredAt: now,
          reconciliationReason: "Multiple non-terminal Circle Card subscriptions require review."
        }
      });
    }
    throw error;
  }
  if (existingStripeSubscription) {
    await upsertCircleCardSubscriptionFromStripeSubscription(
      existingStripeSubscription,
      input.userId,
      {
        statusEvent: {
          createdAt: now,
          eventId: `checkout-inspection:${existingStripeSubscription.id}:${now.getTime()}`
        }
      }
    );
    await reconcileCircleCardSubscriptionForUser(input.userId);
    throw new Error("circle-card-pro-existing-subscription");
  }


  const recoveredStripeSession = await findRecoverableStripeCheckoutSession({
    customerIds: customerContext.customerIdsToInspect,
    userId: input.userId,
    now
  });
  if (recoveredStripeSession?.url) {
    const recoveredCustomerId =
      toStripeObjectId(recoveredStripeSession.customer as StripeObjectRef) ?? customerId;
    await persistRecoveredStripeCheckoutSession({
      session: recoveredStripeSession,
      userId: input.userId,
      customerId: recoveredCustomerId,
      priceId
    });
    return {
      id: recoveredStripeSession.id,
      url: recoveredStripeSession.url,
      priceId,
      billingInterval,
      reused: true
    };
  }

  const claim = await claimCircleCardCheckout({
    userId: input.userId,
    customerId,
    priceId,
    now
  });
  if (!claim) {
    const session = await reusableCheckoutSession(input.userId, now);
    if (session?.url) {
      return {
        id: session.id,
        url: session.url,
        priceId,
        billingInterval,
        reused: true
      };
    }
    throw new Error("circle-card-checkout-in-progress");
  }
  const { attemptId, checkoutStartedAt } = claim;

  const attribution = await loadServerDerivedReferralAttribution(input.userId);
  const proIntent = normalizeCircleCardProIntent(input.intent);
  const metadata: Stripe.MetadataParam = {
    userId: input.userId,
    circleCardPlan: "PRO",
    billingPeriod: "monthly",
    source: "circle_card_pro_checkout",
    referralCode: attribution.referralCode ?? "",
    referralClickId: attribution.referralClickId ?? "",
    referralId: attribution.referralId ?? "",
    referralSource: attribution.referralSource ?? "",
    upgradeSource: proIntent.source,
    requestedCapability: proIntent.capability
  };

  const successPath = appendCircleCardProResultParams(proIntent.returnPath, {
    billing: "success",
    capability: proIntent.capability
  });
  const cancelPath = `${buildCircleCardProHref(proIntent).split("#")[0]}&billing=cancelled`;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        payment_method_types: ["card"],
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: absoluteUrl(successPath),
        cancel_url: absoluteUrl(cancelPath),
        client_reference_id: input.userId,
        expires_at:
          Math.floor(checkoutStartedAt.getTime() / 1000) +
          CIRCLE_CARD_CHECKOUT_SESSION_SECONDS,
        metadata,
        subscription_data: { metadata }
      },
      { idempotencyKey: `circle-card-checkout:${input.userId}:${attemptId}` }
    );
  } catch (error) {
    // Preserve the attempt ID: a network error may have happened after Stripe
    // created the session. A later retry reuses the same idempotency key.
    throw error;
  }

  if (!session.url) {
    try {
      await stripe.checkout.sessions.expire(session.id);
    } catch (error) {
      logServerWarning("circle-card-checkout-unusable-session-expiry-failed", {
        checkoutSessionId: session.id,
        reason: error instanceof Error ? error.name : "unknown"
      });
    }
    await db.circleCardSubscription.updateMany({
      where: { userId: input.userId, checkoutAttemptId: attemptId },
      data: { checkoutAttemptId: null, checkoutStartedAt: null }
    });
    throw new Error("Stripe checkout session did not return a redirect URL.");
  }

  const persisted = await db.circleCardSubscription.updateMany({
    where: { userId: input.userId, checkoutAttemptId: attemptId },
    data: {
      plan: CircleCardSubscriptionPlan.PRO,
      billingInterval,
      stripeCustomerId: customerId,
      stripePriceId: priceId,
      latestCheckoutSessionId: session.id,
      checkoutSessionExpiresAt: toDateFromStripeTimestamp(session.expires_at),
      checkoutAttemptId: null,
      checkoutStartedAt: null,
      reconciliationRequiredAt: null,
      reconciliationReason: null
    }
  });

  if (!persisted.count) {
    const tracked = await db.circleCardSubscription.findUnique({
      where: { userId: input.userId },
      select: { latestCheckoutSessionId: true }
    });
    if (tracked?.latestCheckoutSessionId !== session.id) {
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch (error) {
        logServerWarning("circle-card-checkout-untracked-session-expiry-failed", {
          checkoutSessionId: session.id,
          reason: error instanceof Error ? error.name : "unknown"
        });
      }
      throw new Error("circle-card-checkout-persistence-conflict");
    }
  }

  return {
    id: session.id,
    url: session.url,
    priceId,
    billingInterval,
    reused: claim.recoveredAttempt || !persisted.count
  };
}

export async function createCircleCardBillingPortalSession(input: CircleCardPortalInput) {
  const relationship = await db.circleCardSubscription.findUnique({
    where: { userId: input.userId },
    select: { stripeCustomerId: true }
  });
  if (!relationship?.stripeCustomerId) {
    throw new Error("circle-card-billing-relationship-not-found");
  }

  await reconcileCircleCardSubscriptionForUser(input.userId);
  const stripe = requireStripeClient();
  const portalConfigurationId = process.env.CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID?.trim();
  const session = await stripe.billingPortal.sessions.create({
    customer: relationship.stripeCustomerId,
    return_url: absoluteUrl(input.returnPath ?? "/dashboard/circle-card?billing=portal-return"),
    ...(portalConfigurationId ? { configuration: portalConfigurationId } : {})
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
  const OR: Prisma.CircleCardSubscriptionWhereInput[] = [
    { latestCheckoutSessionId: session.id }
  ];

  if (subscriptionId) OR.push({ stripeSubscriptionId: subscriptionId });

  const existing = await db.circleCardSubscription.findFirst({
    where: { OR },
    select: { userId: true }
  });

  return existing?.userId ?? null;
}

function resolveSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = resolvePrimaryPrice(subscription) as
    | (Stripe.SubscriptionItem & {
        current_period_start?: number;
        current_period_end?: number;
      })
    | null;

  return {
    start: toDateFromStripeTimestamp(
      item?.current_period_start ?? subscription.current_period_start
    ),
    end: toDateFromStripeTimestamp(item?.current_period_end ?? subscription.current_period_end)
  };
}

function storedSubscriptionStatusIsNonTerminal(status: SubscriptionStatus) {
  return status !== SubscriptionStatus.CANCELED && status !== SubscriptionStatus.INCOMPLETE_EXPIRED;
}

function subscriptionStatusChronologyWhere(input: {
  createdAt: Date;
  eventId: string;
}): Prisma.CircleCardSubscriptionWhereInput {
  return {
    OR: [
      { lastStripeEventCreatedAt: null },
      { lastStripeEventCreatedAt: { lt: input.createdAt } },
      {
        lastStripeEventCreatedAt: input.createdAt,
        OR: [{ lastStripeEventId: null }, { lastStripeEventId: { lt: input.eventId } }]
      }
    ]
  };
}

async function upsertCircleCardSubscriptionFromStripeSubscription(
  subscription: Stripe.Subscription,
  knownUserId?: string | null,
  options: {
    checkoutSessionId?: string | null;
    statusEvent?: { createdAt: Date; eventId: string };
    logExpiredAccess?: boolean;
  } = {}
) {
  const priceItem = resolvePrimaryPrice(subscription);
  const priceId = priceItem?.price.id ?? subscription.metadata?.stripePriceId ?? null;
  const storedBySubscription = await db.circleCardSubscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: {
      id: true,
      userId: true,
      plan: true,
      status: true,
      billingInterval: true,
      stripePriceId: true,
      stripeSubscriptionId: true,
      lastStripeEventCreatedAt: true,
      lastStripeEventId: true
    }
  });
  const configuredPlan = resolveCircleCardPlanFromPriceId(priceId);
  const usesPersistedPrice = Boolean(
    storedBySubscription && priceId && storedBySubscription.stripePriceId === priceId
  );
  const plan = configuredPlan ?? (usesPersistedPrice ? storedBySubscription?.plan : null);
  const billingInterval = configuredPlan
    ? resolveCircleCardBillingIntervalFromPriceId(priceId)
    : storedBySubscription?.billingInterval ?? BillingInterval.MONTH;
  const userId =
    knownUserId ?? resolveUserIdFromSubscription(subscription) ?? storedBySubscription?.userId;
  const customerId = toStripeObjectId(subscription.customer as StripeObjectRef);

  if (
    !userId ||
    !customerId ||
    !priceId ||
    !plan ||
    (storedBySubscription && storedBySubscription.userId !== userId)
  ) {
    logServerWarning("circle-card-reconciliation-conflict", {
      reason: "untrusted-subscription-routing",
      stripeSubscriptionId: subscription.id
    });
    return null;
  }

  const existing =
    storedBySubscription?.userId === userId
      ? storedBySubscription
      : await db.circleCardSubscription.findUnique({
          where: { userId },
          select: {
            id: true,
            userId: true,
            plan: true,
            status: true,
            billingInterval: true,
            stripePriceId: true,
            stripeSubscriptionId: true,
            lastStripeEventCreatedAt: true,
            lastStripeEventId: true
          }
        });
  if (
    existing?.stripeSubscriptionId &&
    existing.stripeSubscriptionId !== subscription.id &&
    storedSubscriptionStatusIsNonTerminal(existing.status)
  ) {
    await db.circleCardSubscription.update({
      where: { id: existing.id },
      data: {
        reconciliationRequiredAt: new Date(),
        reconciliationReason: "Multiple non-terminal Circle Card subscriptions require review."
      }
    });
    logServerWarning("circle-card-reconciliation-conflict", {
      reason: "competing-subscription",
      userId
    });
    return null;
  }

  const normalizedStatus = stripeStatusToSubscriptionStatus(subscription.status);
  const period = resolveSubscriptionPeriod(subscription);
  const cancellationEffectiveAt = toDateFromStripeTimestamp(subscription.cancel_at) ??
    (subscription.cancel_at_period_end ? period.end : null);
  const created = await db.circleCardSubscription.upsert({
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
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelledAt: toDateFromStripeTimestamp(subscription.canceled_at),
      cancellationEffectiveAt,
      trialEndsAt: toDateFromStripeTimestamp(subscription.trial_end),
      lastStripeEventCreatedAt: options.statusEvent?.createdAt,
      lastStripeEventId: options.statusEvent?.eventId
    },
    update: {},
    select: { id: true, stripeSubscriptionId: true, status: true }
  });

  if (
    created.stripeSubscriptionId &&
    created.stripeSubscriptionId !== subscription.id &&
    storedSubscriptionStatusIsNonTerminal(created.status)
  ) {
    await db.circleCardSubscription.update({
      where: { id: created.id },
      data: {
        reconciliationRequiredAt: new Date(),
        reconciliationReason: "Multiple non-terminal Circle Card subscriptions require review."
      }
    });
    logServerWarning("circle-card-reconciliation-conflict", {
      reason: "concurrent-competing-subscription",
      userId
    });
    return null;
  }

  if (options.statusEvent) {
    const updated = await db.circleCardSubscription.updateMany({
      where: {
        id: created.id,
        AND: [
          subscriptionStatusChronologyWhere(options.statusEvent),
          {
            OR: [
              { stripeSubscriptionId: null },
              { stripeSubscriptionId: subscription.id },
              {
                status: {
                  in: [SubscriptionStatus.CANCELED, SubscriptionStatus.INCOMPLETE_EXPIRED]
                }
              }
            ]
          }
        ]
      },
      data: {
        plan,
        status: normalizedStatus,
        billingInterval,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        stripeProductId: resolveStripeProductId(priceItem?.price.product),
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        cancelledAt: toDateFromStripeTimestamp(subscription.canceled_at),
        cancellationEffectiveAt,
        trialEndsAt: toDateFromStripeTimestamp(subscription.trial_end),
        lastStripeEventCreatedAt: options.statusEvent.createdAt,
        lastStripeEventId: options.statusEvent.eventId,
      }
    });

    if (!updated.count && existing) {
      const current = await db.circleCardSubscription.findUnique({
        where: { id: created.id },
        select: { stripeSubscriptionId: true, status: true }
      });
      if (
        current?.stripeSubscriptionId &&
        current.stripeSubscriptionId !== subscription.id &&
        storedSubscriptionStatusIsNonTerminal(current.status)
      ) {
        await db.circleCardSubscription.update({
          where: { id: created.id },
          data: {
            reconciliationRequiredAt: new Date(),
            reconciliationReason: "Multiple non-terminal Circle Card subscriptions require review."
          }
        });
        logServerWarning("circle-card-reconciliation-conflict", {
          reason: "concurrent-competing-subscription",
          userId
        });
        return null;
      }

      logServerInfo("circle-card-stripe-event-stale", {
        eventId: options.statusEvent.eventId,
        eventType: "subscription-status",
        userId
      });
    } else if (subscription.cancel_at_period_end || normalizedStatus === SubscriptionStatus.CANCELED) {
      logServerInfo("circle-card-cancellation-scheduled", {
        eventId: options.statusEvent.eventId,
        userId
      });
    }
  }

  if (options.checkoutSessionId) {
    await db.circleCardSubscription.updateMany({
      where: {
        id: created.id,
        OR: [
          { latestCheckoutSessionId: options.checkoutSessionId },
          { latestCheckoutSessionId: null }
        ]
      },
      data: {
        latestCheckoutSessionId: null,
        checkoutSessionExpiresAt: null,
        checkoutAttemptId: null
      }
    });
  }

  const finalRow = await db.circleCardSubscription.findUnique({ where: { id: created.id } });
  if (
    options.logExpiredAccess &&
    options.statusEvent &&
    finalRow?.accessEndsAt &&
    !isCircleCardSubscriptionEntitled(finalRow, options.statusEvent.createdAt)
  ) {
    logServerInfo("circle-card-access-expired", {
      eventId: options.statusEvent.eventId,
      userId,
      accessEndsAt: finalRow.accessEndsAt.toISOString()
    });
  }

  return finalRow;
}

function stripeEventDate(event: Stripe.Event) {
  return new Date(event.created * 1000);
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  event: Stripe.Event
) {
  const subscriptionId = toStripeObjectId(session.subscription as StripeObjectRef);
  const userId = await resolveUserIdFromCheckoutSession(session);

  if (!subscriptionId || !userId) return;

  const stripe = requireStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertCircleCardSubscriptionFromStripeSubscription(subscription, userId, {
    checkoutSessionId: session.id,
    statusEvent: { createdAt: stripeEventDate(event), eventId: event.id }
  });
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  const userId = await resolveUserIdFromCheckoutSession(session);
  if (!userId) return;

  await db.circleCardSubscription.updateMany({
    where: { userId, latestCheckoutSessionId: session.id },
    data: {
      latestCheckoutSessionId: null,
      checkoutSessionExpiresAt: null,
      checkoutAttemptId: null,
      checkoutStartedAt: null
    }
  });
}

async function handleSubscriptionChanged(
  subscription: Stripe.Subscription,
  event: Stripe.Event
) {
  await upsertCircleCardSubscriptionFromStripeSubscription(subscription, null, {
    statusEvent: { createdAt: stripeEventDate(event), eventId: event.id },
    logExpiredAccess: true
  });
}

function resolveInvoiceEntitlementPeriod(invoice: Stripe.Invoice, persistedPriceId?: string | null) {
  const configuredPriceId = getCircleCardConfiguredPriceIds().proMonthly;
  const acceptedPriceIds = new Set(
    [configuredPriceId, persistedPriceId].filter((priceId): priceId is string => Boolean(priceId))
  );
  const candidates = invoice.lines.data.filter(
    (line) =>
      !line.proration &&
      line.type === "subscription" &&
      Boolean(line.price?.id && acceptedPriceIds.has(line.price.id))
  );

  const selected = candidates.sort((left, right) => right.period.end - left.period.end)[0];
  if (!selected?.period?.end) return null;

  return {
    start: toDateFromStripeTimestamp(selected.period.start),
    end: toDateFromStripeTimestamp(selected.period.end)
  };
}

function paymentChronologyWhere(input: {
  createdAt: Date;
  eventId: string;
}): Prisma.CircleCardSubscriptionWhereInput {
  return {
    OR: [
      { lastPaymentEventCreatedAt: null },
      { lastPaymentEventCreatedAt: { lt: input.createdAt } },
      {
        lastPaymentEventCreatedAt: input.createdAt,
        OR: [{ lastPaymentEventId: null }, { lastPaymentEventId: { lt: input.eventId } }]
      }
    ]
  };
}

async function handlePaidInvoice(invoice: Stripe.Invoice, event: Stripe.Event) {
  const subscriptionId = toStripeObjectId(invoice.subscription as StripeObjectRef);
  if (!subscriptionId) return;

  const stripe = requireStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const eventCreatedAt = stripeEventDate(event);
  const row = await upsertCircleCardSubscriptionFromStripeSubscription(subscription, null, {
    statusEvent: { createdAt: eventCreatedAt, eventId: event.id }
  });
  if (!row) return;
  const period = resolveInvoiceEntitlementPeriod(invoice, row.stripePriceId);
  if (!period?.end) return;

  const paidAt = toDateFromStripeTimestamp(invoice.status_transitions?.paid_at) ?? eventCreatedAt;
  const accessAdvanced = await db.circleCardSubscription.updateMany({
      where: {
        id: row.id,
        OR: [{ accessEndsAt: null }, { accessEndsAt: { lt: period.end } }]
      },
      data: {
        accessEndsAt: period.end,
        lastPaidPeriodStart: period.start,
        lastPaidPeriodEnd: period.end,
        lastPaidInvoiceId: invoice.id,
        lastInvoicePaidAt: paidAt
      }
    });
  if (accessAdvanced.count) {
    await markAttributedReferralConvertedToPaidPro(row.userId, paidAt);
    logServerInfo("circle-card-entitlement-advanced", {
      eventId: event.id,
      userId: row.userId,
      accessEndsAt: period.end.toISOString()
    });
  }

  const paymentStateUpdated = await db.circleCardSubscription.updateMany({
    where: { id: row.id, ...paymentChronologyWhere({ createdAt: eventCreatedAt, eventId: event.id }) },
    data: {
      paymentFailedAt: null,
      recoveryGraceEndsAt: null,
      paymentFailureInvoiceId: null,
      paymentFailurePeriodStart: null,
      paymentFailurePeriodEnd: null,
      recoveredAt: row.paymentFailedAt ? paidAt : row.recoveredAt,
      lastPaymentEventCreatedAt: eventCreatedAt,
      lastPaymentEventId: event.id,
    }
  });

  if (paymentStateUpdated.count && row.paymentFailedAt) {
    logServerInfo("circle-card-payment-recovered", { eventId: event.id, userId: row.userId });
  }
}

async function handleFailedInvoice(invoice: Stripe.Invoice, event: Stripe.Event) {
  const subscriptionId = toStripeObjectId(invoice.subscription as StripeObjectRef);
  if (!subscriptionId) return;

  const stripe = requireStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const eventCreatedAt = stripeEventDate(event);
  const row = await upsertCircleCardSubscriptionFromStripeSubscription(subscription, null, {
    statusEvent: { createdAt: eventCreatedAt, eventId: event.id }
  });
  if (!row) return;

  const graceEndsAt = circleCardRecoveryGraceEndsAt(eventCreatedAt);
  const failurePeriod = resolveInvoiceEntitlementPeriod(invoice, row.stripePriceId);
  const initialized = await db.circleCardSubscription.updateMany({
    where: {
      id: row.id,
      paymentFailedAt: null,
      ...paymentChronologyWhere({ createdAt: eventCreatedAt, eventId: event.id })
    },
    data: {
      paymentFailedAt: eventCreatedAt,
      recoveryGraceEndsAt: graceEndsAt,
      paymentFailureInvoiceId: invoice.id,
      paymentFailurePeriodStart: failurePeriod?.start,
      paymentFailurePeriodEnd: failurePeriod?.end,
      lastPaymentEventCreatedAt: eventCreatedAt,
      lastPaymentEventId: event.id
    }
  });

  const restarted = initialized.count || !failurePeriod?.end
    ? { count: 0 }
    : await db.circleCardSubscription.updateMany({
        where: {
          id: row.id,
          paymentFailedAt: { not: null },
          paymentFailureInvoiceId: { not: invoice.id },
          AND: [
            {
              OR: [
                { paymentFailurePeriodEnd: null },
                { paymentFailurePeriodEnd: { lt: failurePeriod.end } }
              ]
            },
            paymentChronologyWhere({ createdAt: eventCreatedAt, eventId: event.id })
          ]
        },
        data: {
          paymentFailedAt: eventCreatedAt,
          recoveryGraceEndsAt: graceEndsAt,
          paymentFailureInvoiceId: invoice.id,
          paymentFailurePeriodStart: failurePeriod.start,
          paymentFailurePeriodEnd: failurePeriod.end,
          lastPaymentEventCreatedAt: eventCreatedAt,
          lastPaymentEventId: event.id
        }
      });

  const backdated = initialized.count || restarted.count
    ? { count: 0 }
    : await db.circleCardSubscription.updateMany({
        where: {
          id: row.id,
          paymentFailureInvoiceId: invoice.id,
          paymentFailedAt: { gt: eventCreatedAt },
          OR: [{ recoveredAt: null }, { recoveredAt: { lte: eventCreatedAt } }]
        },
        data: {
          paymentFailedAt: eventCreatedAt,
          recoveryGraceEndsAt: graceEndsAt
        }
      });

  const chronologyUpdated = initialized.count || restarted.count
    ? { count: initialized.count + restarted.count }
    : await db.circleCardSubscription.updateMany({
        where: {
          id: row.id,
          paymentFailedAt: { not: null },
          ...paymentChronologyWhere({ createdAt: eventCreatedAt, eventId: event.id })
        },
        data: {
          lastPaymentEventCreatedAt: eventCreatedAt,
          lastPaymentEventId: event.id
        }
      });
  const currentFailure = await db.circleCardSubscription.findUnique({
    where: { id: row.id },
    select: { paymentFailedAt: true, recoveryGraceEndsAt: true }
  });

  if (initialized.count || restarted.count || backdated.count || chronologyUpdated.count) {
    logServerWarning("circle-card-payment-failed", {
      eventId: event.id,
      userId: row.userId,
      recoveryGraceEndsAt: currentFailure?.recoveryGraceEndsAt?.toISOString()
    });
  } else {
    logServerInfo("circle-card-stripe-event-stale", {
      eventId: event.id,
      eventType: event.type,
      userId: row.userId
    });
  }
}

async function handleInvoice(
  invoice: Stripe.Invoice,
  outcome: "paid" | "failed",
  event: Stripe.Event
) {
  if (outcome === "paid") {
    await handlePaidInvoice(invoice, event);
    return;
  }
  await handleFailedInvoice(invoice, event);
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
  const subscriptionId = toStripeObjectId(session.subscription as StripeObjectRef);
  const OR: Prisma.CircleCardSubscriptionWhereInput[] = [
    { latestCheckoutSessionId: session.id }
  ];
  if (subscriptionId) OR.push({ stripeSubscriptionId: subscriptionId });

  if (await db.circleCardSubscription.findFirst({ where: { OR }, select: { id: true } })) {
    return true;
  }

  return isCircleCardMetadata(session.metadata);
}

async function isCircleCardStripeSubscription(subscription: Stripe.Subscription) {
  const primaryPriceId = resolvePrimaryPrice(subscription)?.price.id ?? null;
  if (hasCircleCardPrice([primaryPriceId])) return true;

  return Boolean(
    await db.circleCardSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true }
    })
  );
}

async function isCircleCardInvoice(invoice: Stripe.Invoice) {
  const invoicePriceIds = invoice.lines.data.map((line) => line.price?.id ?? null);
  if (hasCircleCardPrice(invoicePriceIds)) return true;

  const subscriptionId = toStripeObjectId(invoice.subscription as StripeObjectRef);
  if (!subscriptionId) return false;

  return Boolean(
    await db.circleCardSubscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true }
    })
  );
}

export async function processCircleCardStripeWebhookEvent(event: Stripe.Event) {
  let handlesEvent = false;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.expired":
      handlesEvent = await isCircleCardCheckoutSession(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      handlesEvent = await isCircleCardStripeSubscription(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.payment_action_required":
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
    logServerInfo("circle-card-stripe-event-already-completed", {
      eventId: event.id,
      eventType: event.type
    });
    return true;
  }

  logServerInfo("circle-card-stripe-event-accepted", {
    eventId: event.id,
    eventType: event.type
  });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, event);
        break;
      case "checkout.session.expired":
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChanged(event.data.object as Stripe.Subscription, event);
        break;
      case "invoice.paid":
        await handleInvoice(event.data.object as Stripe.Invoice, "paid", event);
        break;
      case "invoice.payment_failed":
      case "invoice.payment_action_required":
        await handleInvoice(event.data.object as Stripe.Invoice, "failed", event);
        break;
    }

    await markWebhookProcessed(event.id);
  } catch (error) {
    await markWebhookFailed(event.id, error);
    throw error;
  }

  return true;
}

export type CircleCardReconciliationResult = {
  outcome: "reconciled" | "no_subscription" | "conflict";
  subscriptionId: string | null;
  accessEndsAt: Date | null;
};

export async function reconcileCircleCardSubscriptionForUser(
  userId: string,
  now = new Date()
): Promise<CircleCardReconciliationResult> {
  const stored = await db.circleCardSubscription.findUnique({
    where: { userId },
    select: {
      id: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      accessEndsAt: true
    }
  });
  if (!stored?.stripeCustomerId) {
    return { outcome: "no_subscription", subscriptionId: null, accessEndsAt: null };
  }

  const stripe = requireStripeClient();
  const listed = await stripe.subscriptions.list({
    customer: stored.stripeCustomerId,
    status: "all",
    limit: 100
  });
  const relevant = listed.data.filter(
    (subscription) =>
      stripeSubscriptionMatchesCircleCardPro(subscription, stored.stripeSubscriptionId) &&
      stripeSubscriptionIsNonTerminal(subscription)
  );

  if (relevant.length > 1) {
    await db.circleCardSubscription.update({
      where: { id: stored.id },
      data: {
        reconciliationRequiredAt: now,
        reconciliationReason: "Multiple non-terminal Circle Card subscriptions require review."
      }
    });
    logServerWarning("circle-card-reconciliation-conflict", {
      reason: "multiple-stripe-subscriptions",
      userId
    });
    return {
      outcome: "conflict",
      subscriptionId: stored.stripeSubscriptionId,
      accessEndsAt: stored.accessEndsAt
    };
  }

  let subscription = relevant[0] ?? null;
  if (!subscription && stored.stripeSubscriptionId) {
    subscription = await stripe.subscriptions.retrieve(stored.stripeSubscriptionId);
  }
  if (!subscription) {
    return {
      outcome: "no_subscription",
      subscriptionId: null,
      accessEndsAt: stored.accessEndsAt
    };
  }

  const reconciled = await upsertCircleCardSubscriptionFromStripeSubscription(
    subscription,
    userId,
    {
      statusEvent: {
        createdAt: now,
        eventId: `reconcile:${subscription.id}:${now.getTime()}`
      },
      logExpiredAccess: true
    }
  );
  if (!reconciled) {
    return {
      outcome: "conflict",
      subscriptionId: stored.stripeSubscriptionId,
      accessEndsAt: stored.accessEndsAt
    };
  }

  const latestInvoiceRef = subscription.latest_invoice;
  const latestInvoice =
    typeof latestInvoiceRef === "string"
      ? await stripe.invoices.retrieve(latestInvoiceRef)
      : latestInvoiceRef && "object" in latestInvoiceRef && latestInvoiceRef.object === "invoice"
        ? latestInvoiceRef
        : null;
  if (latestInvoice?.status === "paid") {
    const evidenceCreatedAt =
      latestInvoice.status_transitions?.paid_at ?? latestInvoice.created ?? Math.floor(now.getTime() / 1000);
    await handlePaidInvoice(
      latestInvoice,
      {
        id: `reconcile:${latestInvoice.id}`,
        type: "invoice.paid",
        created: evidenceCreatedAt
      } as Stripe.Event
    );
  } else if (
    latestInvoice &&
    latestInvoice.attempt_count > 0 &&
    (subscription.status === "past_due" || subscription.status === "unpaid")
  ) {
    const failureEvidenceAt =
      latestInvoice.status_transitions?.finalized_at ??
      latestInvoice.created ??
      Math.floor(now.getTime() / 1000);
    await handleFailedInvoice(
      latestInvoice,
      {
        id: `reconcile:failure:${latestInvoice.id}`,
        type: "invoice.payment_failed",
        created: failureEvidenceAt
      } as Stripe.Event
    );
  }


  await db.circleCardSubscription.updateMany({
    where: { id: reconciled.id },
    data: { reconciliationRequiredAt: null, reconciliationReason: null }
  });

  const finalRow = await db.circleCardSubscription.findUnique({
    where: { userId },
    select: { accessEndsAt: true, stripeSubscriptionId: true }
  });
  return {
    outcome: "reconciled",
    subscriptionId: finalRow?.stripeSubscriptionId ?? subscription.id,
    accessEndsAt: finalRow?.accessEndsAt ?? stored.accessEndsAt
  };
}

const CIRCLE_CARD_ACCESS_USER_SELECT = {
  id: true,
  role: true,
  membershipTier: true,
  suspended: true,
  subscription: { select: { status: true } },
  circleCardSubscription: {
    select: {
      plan: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      accessEndsAt: true,
      lastInvoicePaidAt: true,
      paymentFailedAt: true,
      recoveryGraceEndsAt: true,
      cancelAtPeriodEnd: true,
      cancellationEffectiveAt: true,
      latestCheckoutSessionId: true,
      checkoutSessionExpiresAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true
    }
  },
  circleCardAmbassadorProfile: {
    select: { freeProGranted: true, active: true }
  },
  circleCardAccessGrant: {
    select: {
      plan: true,
      source: true,
      active: true,
      startsAt: true,
      endsAt: true
    }
  }
} as const satisfies Prisma.UserSelect;

type CircleCardAccessUserRecord = Prisma.UserGetPayload<{
  select: typeof CIRCLE_CARD_ACCESS_USER_SELECT;
}>;

function buildCircleCardAccessForUserRecord(
  user: CircleCardAccessUserRecord,
  now: Date
): CircleCardAccessSnapshot {
  const circleCardSubscription = user.circleCardSubscription;
  const hasPaidCircleCardSubscription = isCircleCardSubscriptionEntitled(
    circleCardSubscription,
    now
  );
  const circleCardSubscriptionPlan = hasPaidCircleCardSubscription
    ? (circleCardSubscription?.plan as PaidCircleCardPlanKey)
    : null;
  const grant = user.circleCardAccessGrant;
  const hasGrandfatheredAccess = Boolean(
    grant?.active &&
      grant.source === "GRANDFATHERED" &&
      (!grant.startsAt || grant.startsAt <= now) &&
      (!grant.endsAt || grant.endsAt >= now)
  );
  const entitlement = resolveCircleCardEntitlement({
    role: user.role,
    membershipTier: user.membershipTier,
    suspended: user.suspended,
    hasActiveSubscription: hasEntitledSubscription(user.subscription?.status ?? null),
    hasActiveCircleCardSubscription: hasPaidCircleCardSubscription,
    circleCardSubscriptionPlan,
    circleCardAmbassadorFreePro:
      Boolean(user.circleCardAmbassadorProfile?.freeProGranted) &&
      user.circleCardAmbassadorProfile?.active !== false,
    circleCardEarlyAccessPlan: hasGrandfatheredAccess
      ? (grant?.plan as PaidCircleCardPlanKey)
      : null
  });

  const confirmedAccessEndsAt = entitlement.hasPaidCircleCardSubscription
    ? circleCardSubscription?.accessEndsAt ?? null
    : entitlement.source === "EARLY_ACCESS"
      ? grant?.endsAt ?? null
      : null;
  const paidLifecycleStatus = deriveCircleCardPaidLifecycleStatus(circleCardSubscription, now);
  const lifecycleStatus =
    entitlement.source === "ADMIN_OVERRIDE"
      ? "admin"
      : entitlement.source === "AMBASSADOR_FREE_PRO"
        ? "ambassador"
        : entitlement.source === "BCN_INCLUDED_PRO"
          ? "membership_included"
          : entitlement.source === "EARLY_ACCESS"
            ? "grandfathered"
            : paidLifecycleStatus;
  const effectiveAccessEndsAt = entitlement.hasPaidCircleCardSubscription
    ? circleCardEffectiveAccessEndsAt(circleCardSubscription)
    : confirmedAccessEndsAt;

  return buildCircleCardAccessSnapshot({
    entitlement,
    lifecycleStatus,
    accessEndsAt: confirmedAccessEndsAt,
    effectiveAccessEndsAt,
    paymentFailedAt: circleCardSubscription?.paymentFailedAt ?? null,
    recoveryGraceEndsAt: circleCardSubscription?.recoveryGraceEndsAt ?? null,
    cancellationEffectiveAt: circleCardSubscription?.cancellationEffectiveAt ?? null,
    checkoutSessionExpiresAt: circleCardSubscription?.checkoutSessionExpiresAt ?? null,
    cancelAtPeriodEnd: circleCardSubscription?.cancelAtPeriodEnd ?? false,
    hasBillingRelationship: Boolean(
      circleCardSubscription?.stripeCustomerId || circleCardSubscription?.stripeSubscriptionId
    ),
    subscriptionStatus: circleCardSubscription?.status ?? null,
    isInRecoveryGrace: lifecycleStatus === "past_due_grace"
  });
}

async function loadCircleCardAccessForUserUncached(
  userId: string,
  now: Date
): Promise<CircleCardAccessSnapshot> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: CIRCLE_CARD_ACCESS_USER_SELECT
  });

  if (!user) {
    throw new Error("circle-card-access-user-not-found");
  }

  return buildCircleCardAccessForUserRecord(user, now);
}

const loadCircleCardAccessForUserCached = cache((userId: string) =>
  loadCircleCardAccessForUserUncached(userId, new Date())
);

export function loadCircleCardAccessForUser(userId: string, now?: Date) {
  return now
    ? loadCircleCardAccessForUserUncached(userId, now)
    : loadCircleCardAccessForUserCached(userId);
}

export async function loadCircleCardAccessForUsers(
  userIds: readonly string[],
  now = new Date()
) {
  const distinctUserIds = [...new Set(userIds)];
  if (!distinctUserIds.length) return new Map<string, CircleCardAccessSnapshot>();

  const users = await db.user.findMany({
    where: { id: { in: distinctUserIds } },
    select: CIRCLE_CARD_ACCESS_USER_SELECT
  });

  return new Map(
    users.map((user) => [user.id, buildCircleCardAccessForUserRecord(user, now)] as const)
  );
}

/** @deprecated Use loadCircleCardAccessForUser for every authorisation decision. */
export async function loadCircleCardEntitlementForUser(userId: string) {
  return (await loadCircleCardAccessForUser(userId)).entitlement;
}

export async function getCircleCardBillingAdminMetrics() {
  const now = new Date();
  const paidAccessWhere: Prisma.CircleCardSubscriptionWhereInput = {
    plan: CircleCardSubscriptionPlan.PRO,
    accessEndsAt: { not: null },
    OR: [
      { status: SubscriptionStatus.ACTIVE, accessEndsAt: { gt: now } },
      {
        status: SubscriptionStatus.ACTIVE,
        paymentFailedAt: { not: null },
        recoveryGraceEndsAt: { gt: now }
      },
      { status: SubscriptionStatus.CANCELED, accessEndsAt: { gt: now } },
      { status: SubscriptionStatus.PAST_DUE, accessEndsAt: { gt: now } },
      { status: SubscriptionStatus.PAST_DUE, recoveryGraceEndsAt: { gt: now } }
    ]
  };
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
      where: paidAccessWhere
    }),
    db.circleCardSubscription.count({
      where: {
        ...paidAccessWhere,
        billingInterval: BillingInterval.MONTH
      }
    }),
    db.circleCardSubscription.count({
      where: {
        ...paidAccessWhere,
        billingInterval: BillingInterval.YEAR
      }
    }),
    db.circleCardSubscription.count({ where: { status: SubscriptionStatus.TRIALING } }),
    db.circleCardSubscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
    db.circleCardSubscription.count({
      where: { ...paidAccessWhere, cancelAtPeriodEnd: true }
    }),
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
        accessEndsAt: true,
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
