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
  const successUrl = absoluteUrl(`/founder/thanks?request=${request.id}&status=success`);
  const cancelUrl = absoluteUrl(
    `/founder/services/${request.service.slug}?status=cancelled&request=${request.id}`
  );
  const canUseStoredStripePrice =
    Boolean(request.service.stripePriceId) &&
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
            price: request.service.stripePriceId ?? undefined,
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
      founderServiceStripeProductId: request.service.stripeProductId ?? ""
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
            founderServiceStripeProductId: request.service.stripeProductId ?? ""
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

function needsNewStripePrice(input: {
  billingType: FounderServiceBillingType;
  amount: number;
  currentPrice: Stripe.Price | null;
}) {
  if (!input.currentPrice) {
    return true;
  }

  const recurringInterval =
    input.billingType === FounderServiceBillingType.MONTHLY_RETAINER ? "month" : null;

  return (
    input.currentPrice.unit_amount !== input.amount ||
    (input.currentPrice.recurring?.interval ?? null) !== recurringInterval ||
    !input.currentPrice.active
  );
}

export async function syncFounderServiceStripeCatalog() {
  const stripe = requireStripeClient();
  const services = await db.founderService.findMany({
    where: {
      active: true,
      slug: {
        in: [...GROWTH_ARCHITECT_SERVICE_SLUGS]
      }
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      price: true,
      currency: true,
      billingType: true,
      stripeProductId: true,
      stripePriceId: true
    }
  });

  const synced = [];

  for (const service of services) {
    const product = service.stripeProductId
      ? await stripe.products
          .update(service.stripeProductId, {
            name: `Trevor Newton | ${service.title}`,
            description: service.shortDescription,
            metadata: {
              founderServiceId: service.id,
              founderServiceSlug: service.slug
            }
          })
          .catch(() =>
            stripe.products.create({
              name: `Trevor Newton | ${service.title}`,
              description: service.shortDescription,
              metadata: {
                founderServiceId: service.id,
                founderServiceSlug: service.slug
              }
            })
          )
      : await stripe.products.create({
          name: `Trevor Newton | ${service.title}`,
          description: service.shortDescription,
          metadata: {
            founderServiceId: service.id,
            founderServiceSlug: service.slug
          }
        });

    let currentPrice: Stripe.Price | null = null;
    if (service.stripePriceId) {
      try {
        currentPrice = await stripe.prices.retrieve(service.stripePriceId);
      } catch {
        currentPrice = null;
      }
    }

    const price = needsNewStripePrice({
      billingType: service.billingType,
      amount: service.price,
      currentPrice
    })
      ? await stripe.prices.create({
          currency: service.currency.toLowerCase(),
          unit_amount: service.price,
          product: product.id,
          recurring:
            service.billingType === FounderServiceBillingType.MONTHLY_RETAINER
              ? {
                  interval: "month"
                }
              : undefined,
          metadata: {
            founderServiceId: service.id,
            founderServiceSlug: service.slug
          }
        })
      : currentPrice;

    await updateFounderServiceStripeCatalogEntry({
      serviceId: service.id,
      stripeProductId: product.id,
      stripePriceId: price?.id ?? null
    });

    synced.push({
      id: service.id,
      title: service.title,
      stripeProductId: product.id,
      stripePriceId: price?.id ?? null
    });
  }

  return synced;
}
