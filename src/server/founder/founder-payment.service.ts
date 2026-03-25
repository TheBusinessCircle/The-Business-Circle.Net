import type Stripe from "stripe";
import { FounderServiceBillingType, FounderServicePaymentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";
import { requireStripeClient } from "@/server/stripe/client";

type FounderCheckoutSessionResult = {
  id: string;
  url: string;
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
  requestId: string
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
      service: {
        select: {
          id: true,
          slug: true,
          title: true,
          shortDescription: true,
          currency: true,
          billingType: true
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
  const successUrl = absoluteUrl(`/founder/thanks?request=${request.id}&status=success`);
  const cancelUrl = absoluteUrl(
    `/founder/services/${request.service.slug}?status=cancelled&request=${request.id}`
  );

  const session = await stripe.checkout.sessions.create({
    mode: isMonthlyRetainer ? "subscription" : "payment",
    customer_email: request.email,
    payment_method_types: ["card"],
    allow_promotion_codes: false,
    billing_address_collection: "auto",
    phone_number_collection: {
      enabled: true
    },
    line_items: [
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
      founderServiceMembershipTier: request.membershipTierApplied ?? ""
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
            founderServiceMembershipTier: request.membershipTierApplied ?? ""
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
      paymentStatus: FounderServicePaymentStatus.PENDING
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

      await db.founderServiceRequest.update({
        where: { id: requestId },
        data: {
          paymentStatus: FounderServicePaymentStatus.PAID,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: toStripeObjectId(
            session.payment_intent as string | { id?: string } | null
          ),
          stripeSubscriptionId: toStripeObjectId(
            session.subscription as string | { id?: string } | null
          ),
          paidAt:
            session.payment_status === "paid" || Boolean(session.subscription)
              ? new Date()
              : null
        }
      });
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
          stripeCheckoutSessionId: session.id
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
