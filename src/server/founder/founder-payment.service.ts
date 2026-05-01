import type Stripe from "stripe";
import {
  FounderServiceBillingType,
  FounderServiceDiscountType,
  FounderServicePaymentStatus
} from "@prisma/client";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";
import { requireStripeClient } from "@/server/stripe/client";
import {
  createFounderServiceDiscountCodeRecord,
  getFounderServiceDiscountCodeById,
  incrementFounderServiceDiscountCodeUsage,
  updateFounderServiceStripeCatalogEntry
} from "@/server/founder/founder.service";
import { GROWTH_ARCHITECT_SERVICE_SLUGS } from "@/lib/founder";
import {
  listBillingCatalogProducts,
  syncBillingCatalogWithStripe
} from "@/server/products-pricing";

type FounderCheckoutSessionResult = {
  id: string;
  url: string;
};

type CreateFounderServiceDiscountCodeInput = {
  code: string;
  name?: string;
  type: FounderServiceDiscountType;
  percentOff?: number | null;
  amountOff?: number | null;
  currency?: string;
  expiresAt?: Date | null;
  usageLimit?: number | null;
  tag: "LOCAL_OUTREACH" | "MEMBER_DISCOUNT" | "MANUAL";
};

function nonEmptyEnvValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toStripePriceId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed?.startsWith("price_") ? trimmed : null;
}

function resolveFounderServiceStripePriceId(input: {
  slug: string;
  storedPriceId: string | null;
}) {
  const envPriceId = (() => {
    switch (input.slug) {
      case "growth-architect-clarity-audit":
        return toStripePriceId(process.env.STRIPE_FOUNDER_CLARITY_AUDIT_PRICE_ID);
      case "growth-architect-growth-strategy":
        return toStripePriceId(process.env.STRIPE_FOUNDER_STRATEGY_SESSION_PRICE_ID);
      case "growth-architect-full-growth-architect":
        return (
          toStripePriceId(process.env.STRIPE_FOUNDER_GROWTH_ARCHITECT_MONTHLY_PRICE_ID) ??
          toStripePriceId(process.env.STRIPE_FOUNDER_GROWTH_ARCHITECT_PRICE_ID)
        );
      default:
        return null;
    }
  })();

  return envPriceId ?? toStripePriceId(input.storedPriceId);
}

function resolveFounderServiceStripeProductId(input: {
  slug: string;
  storedProductId: string | null;
}) {
  const storedProductId = nonEmptyEnvValue(input.storedProductId ?? undefined);

  switch (input.slug) {
    case "growth-architect-clarity-audit":
    case "growth-architect-growth-strategy":
    case "growth-architect-full-growth-architect":
      return storedProductId;
    case "growth-architect-growth-strategy":
    default:
      return storedProductId;
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

function isFounderCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.checkoutKind === "founder_service";
}

export async function createFounderServiceCheckoutSession(
  requestId: string,
  options: {
    adminDiscountCodeId?: string | null;
    markCheckoutLinkSent?: boolean;
    returnExperience?: "public" | "member";
  } = {}
): Promise<FounderCheckoutSessionResult> {
  const request = await db.founderServiceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      fullName: true,
      email: true,
      userId: true,
      amount: true,
      baseAmount: true,
      membershipDiscountPercent: true,
      membershipTierApplied: true,
      discountLabel: true,
      adminDiscountCodeId: true,
      service: {
        select: {
          id: true,
          slug: true,
          title: true,
          shortDescription: true,
          currency: true,
          billingType: true,
          price: true,
          stripePriceId: true,
          stripeProductId: true
        }
      }
    }
  });

  if (!request) {
    throw new Error("request-not-found");
  }

  const stripe = requireStripeClient();
  const isMonthlyRetainer =
    request.service.billingType === FounderServiceBillingType.MONTHLY_RETAINER;
  const currency = request.service.currency.toLowerCase();
  const adminDiscountCode =
    options.adminDiscountCodeId
      ? await getFounderServiceDiscountCodeById(options.adminDiscountCodeId)
      : null;
  const effectiveStripePriceId = resolveFounderServiceStripePriceId({
    slug: request.service.slug,
    storedPriceId: request.service.stripePriceId
  });
  const effectiveStripeProductId = resolveFounderServiceStripeProductId({
    slug: request.service.slug,
    storedProductId: request.service.stripeProductId
  });
  const useMemberReturn = options.returnExperience === "member";
  const successUrl = absoluteUrl(
    useMemberReturn
      ? `/member/growth-architect/thanks?request=${request.id}&status=success`
      : `/founder/thanks?request=${request.id}&status=success`
  );
  const cancelUrl = absoluteUrl(
    useMemberReturn
      ? `/member/growth-architect/services/${request.service.slug}?status=cancelled&request=${request.id}`
      : `/founder/services/${request.service.slug}?status=cancelled&request=${request.id}`
  );
  const canUseStoredStripePrice =
    Boolean(effectiveStripePriceId) &&
    request.amount === request.service.price &&
    !adminDiscountCode?.stripePromotionCodeId;

  const session = await stripe.checkout.sessions.create({
    mode: isMonthlyRetainer ? "subscription" : "payment",
    customer_email: request.email,
    payment_method_types: ["card"],
    allow_promotion_codes: false,
    billing_address_collection: "auto",
    phone_number_collection: {
      enabled: true
    },
    line_items: canUseStoredStripePrice
      ? [
          {
            price: effectiveStripePriceId ?? undefined,
            quantity: 1
          }
        ]
      : [
          {
            price_data: isMonthlyRetainer
              ? {
                  currency,
                  unit_amount: request.amount,
                  recurring: {
                    interval: "month"
                  },
                  product_data: {
                    name: request.service.title,
                    description: request.service.shortDescription
                  }
                }
              : {
                  currency,
                  unit_amount: request.amount,
                  product_data: {
                    name: request.service.title,
                    description: request.service.shortDescription
                  }
                },
            quantity: 1
          }
        ],
    discounts: adminDiscountCode?.stripePromotionCodeId
      ? [
          {
            promotion_code: adminDiscountCode.stripePromotionCodeId
          }
        ]
      : undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      checkoutKind: "founder_service",
      founderServiceRequestId: request.id,
      founderServiceId: request.service.id,
      founderServiceSlug: request.service.slug,
      founderUserId: request.userId ?? "",
      founderServiceBaseAmount: String(request.baseAmount),
      founderServiceFinalAmount: String(request.amount),
      founderServiceDiscountPercent: String(request.membershipDiscountPercent),
      founderServiceDiscountLabel: request.discountLabel ?? "",
      founderServiceMembershipTier: request.membershipTierApplied ?? "",
      founderServiceAdminDiscountCodeId:
        adminDiscountCode?.id ?? request.adminDiscountCodeId ?? "",
      founderServiceStripeProductId: effectiveStripeProductId ?? ""
    },
    subscription_data: isMonthlyRetainer
      ? {
          metadata: {
            checkoutKind: "founder_service",
            founderServiceRequestId: request.id,
            founderServiceId: request.service.id,
            founderServiceSlug: request.service.slug,
            founderUserId: request.userId ?? "",
            founderServiceBaseAmount: String(request.baseAmount),
            founderServiceFinalAmount: String(request.amount),
            founderServiceDiscountPercent: String(request.membershipDiscountPercent),
            founderServiceDiscountLabel: request.discountLabel ?? "",
            founderServiceMembershipTier: request.membershipTierApplied ?? "",
            founderServiceAdminDiscountCodeId:
              adminDiscountCode?.id ?? request.adminDiscountCodeId ?? "",
            founderServiceStripeProductId: effectiveStripeProductId ?? ""
          }
        }
      : undefined
  });

  if (!session.url) {
    throw new Error("checkout-url-missing");
  }

  await db.founderServiceRequest.update({
    where: { id: request.id },
    data: {
      stripeCheckoutSessionId: session.id,
      checkoutUrl: session.url,
      paymentStatus: FounderServicePaymentStatus.PENDING,
      adminDiscountCode: adminDiscountCode
        ? {
            connect: {
              id: adminDiscountCode.id
            }
          }
        : undefined,
      checkoutLinkSentAt: options.markCheckoutLinkSent ? new Date() : undefined
    }
  });

  return {
    id: session.id,
    url: session.url
  };
}

export async function processFounderStripeWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!isFounderCheckoutSession(session)) {
        break;
      }

      const requestId = session.metadata?.founderServiceRequestId;
      if (!requestId) {
        break;
      }
      const adminDiscountCodeId = session.metadata?.founderServiceAdminDiscountCodeId || null;

      await db.founderServiceRequest.update({
        where: { id: requestId },
        data: {
          paymentStatus: FounderServicePaymentStatus.PAID,
          stripeCheckoutSessionId: session.id,
          checkoutUrl: session.url ?? undefined,
          stripePaymentIntentId: toStripeObjectId(
            session.payment_intent as string | { id?: string } | null
          ),
          stripeSubscriptionId: toStripeObjectId(
            session.subscription as string | { id?: string } | null
          ),
          adminDiscountCode: adminDiscountCodeId
            ? {
                connect: {
                  id: adminDiscountCodeId
                }
              }
            : undefined,
          paidAt:
            session.payment_status === "paid" || Boolean(session.subscription)
              ? new Date()
              : null
        }
      });

      if (adminDiscountCodeId) {
        await incrementFounderServiceDiscountCodeUsage(adminDiscountCodeId);
      }
      break;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!isFounderCheckoutSession(session)) {
        break;
      }

      const requestId = session.metadata?.founderServiceRequestId;
      if (!requestId) {
        break;
      }

      await db.founderServiceRequest.update({
        where: { id: requestId },
        data: {
          paymentStatus: FounderServicePaymentStatus.FAILED,
          stripeCheckoutSessionId: session.id,
          checkoutUrl: session.url ?? undefined
        }
      });
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = toStripeObjectId(
        invoice.subscription as string | { id?: string } | null
      );
      if (!subscriptionId) {
        break;
      }

      await db.founderServiceRequest.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          paymentStatus:
            event.type === "invoice.paid"
              ? FounderServicePaymentStatus.PAID
              : FounderServicePaymentStatus.FAILED,
          stripeInvoiceId: invoice.id,
          paidAt: event.type === "invoice.paid" ? new Date() : null
        }
      });
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = toStripeObjectId(
        charge.payment_intent as string | { id?: string } | null
      );
      if (!paymentIntentId) {
        break;
      }

      await db.founderServiceRequest.updateMany({
        where: { stripePaymentIntentId: paymentIntentId },
        data: {
          paymentStatus: FounderServicePaymentStatus.REFUNDED
        }
      });
      break;
    }
    default:
      break;
  }
}

function toStripeTimestamp(value: Date | null | undefined): number | undefined {
  return value ? Math.floor(value.getTime() / 1000) : undefined;
}

export async function createFounderServiceDiscountCodeWithStripe(
  input: CreateFounderServiceDiscountCodeInput
) {
  const stripe = requireStripeClient();
  const coupon = await stripe.coupons.create({
    duration: "once",
    percent_off: input.type === "PERCENT" ? input.percentOff ?? undefined : undefined,
    amount_off: input.type === "FIXED" ? input.amountOff ?? undefined : undefined,
    currency: input.type === "FIXED" ? (input.currency ?? "GBP").toLowerCase() : undefined,
    name: input.name?.trim() || input.code.trim().toUpperCase(),
    metadata: {
      code: input.code.trim().toUpperCase(),
      tag: input.tag
    }
  });

  const promotionCode = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: input.code.trim().toUpperCase(),
    active: true,
    max_redemptions: input.usageLimit ?? undefined,
    expires_at: toStripeTimestamp(input.expiresAt)
  });

  return createFounderServiceDiscountCodeRecord({
    code: input.code,
    name: input.name,
    type: input.type,
    percentOff: input.percentOff ?? null,
    amountOff: input.amountOff ?? null,
    currency: input.currency ?? "GBP",
    expiresAt: input.expiresAt ?? null,
    usageLimit: input.usageLimit ?? null,
    tag: input.tag,
    stripeCouponId: coupon.id,
    stripePromotionCodeId: promotionCode.id
  });
}

export async function syncFounderServiceStripeCatalog() {
  const billingProducts = await listBillingCatalogProducts();
  const serviceProductIds = billingProducts
    .filter(
      (product) =>
        product.category === "SERVICE" &&
        product.founderService?.slug &&
        GROWTH_ARCHITECT_SERVICE_SLUGS.includes(
          product.founderService.slug as (typeof GROWTH_ARCHITECT_SERVICE_SLUGS)[number]
        )
    )
    .map((product) => product.id);

  const syncedProducts = await syncBillingCatalogWithStripe({
    productIds: serviceProductIds
  });
  const services = await db.founderService.findMany({
    where: {
      active: true,
      slug: {
        in: [...GROWTH_ARCHITECT_SERVICE_SLUGS]
      }
    },
    select: {
      id: true,
      title: true,
      stripeProductId: true,
      stripePriceId: true
    }
  });

  await Promise.all(
    services.map((service) =>
      updateFounderServiceStripeCatalogEntry({
        serviceId: service.id,
        stripeProductId: service.stripeProductId,
        stripePriceId: service.stripePriceId
      })
    )
  );

  return syncedProducts.map((product) => {
    const service = services.find((item) => item.stripeProductId === product.stripeProductId);

    return {
      id: service?.id ?? product.id,
      title: service?.title ?? product.name,
      stripeProductId: product.stripeProductId,
      stripePriceId: service?.stripePriceId ?? null
    };
  });
}
