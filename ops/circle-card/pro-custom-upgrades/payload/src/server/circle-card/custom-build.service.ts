import "server-only";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { prisma } from "@/lib/prisma";
import { requireStripeClient } from "@/server/stripe/client";
import { ensureCircleCardStripeCustomerId, loadCircleCardAccessForUser } from "./billing.service";
import {
  CUSTOM_BUILD_AMOUNT_PENCE, CUSTOM_BUILD_CURRENCY, CUSTOM_BUILD_PRODUCT,
  CUSTOM_BUILD_TERMS_VERSION, CUSTOM_BUILD_PATH, hasPaidProForCustomBuild,
  type CustomBuildOrder
} from "@/lib/circle-card/custom-build";

export const customBuildCheckoutSchema = z.object({
  cardId: z.string().trim().min(1).max(120),
  brief: z.string().trim().min(20).max(3000),
  termsAccepted: z.literal(true)
}).strict();

export class CustomBuildError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
const objectId = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : value?.id ?? null;

export async function loadCustomBuildOrderForCard(userId: string, cardId: string) {
  const rows = await prisma.$queryRaw<CustomBuildOrder[]>`
    SELECT * FROM "CircleCardCustomBuildOrder" WHERE "userId"=${userId} AND "cardId"=${cardId} LIMIT 1`;
  return rows[0] ?? null;
}

export async function loadCustomBuildOrders(userId: string) {
  return prisma.$queryRaw<CustomBuildOrder[]>`
    SELECT * FROM "CircleCardCustomBuildOrder" WHERE "userId"=${userId} ORDER BY "createdAt" DESC LIMIT 50`;
}

export async function createCustomBuildCheckout(
  user: { id: string; email: string; name?: string | null },
  input: z.infer<typeof customBuildCheckoutSchema>
) {
  if (getRuntimeBrand().key !== "circle-card") throw new CustomBuildError("Unavailable on this site.", 403);
  const values = customBuildCheckoutSchema.parse(input);
  const [access, card] = await Promise.all([
    loadCircleCardAccessForUser(user.id, new Date()),
    prisma.circleCard.findFirst({
      where: { id: values.cardId, userId: user.id, archivedAt: null },
      select: { id: true }
    })
  ]);
  if (!card) throw new CustomBuildError("Choose one of your own Circle Cards.", 404);
  if (!hasPaidProForCustomBuild(access)) {
    throw new CustomBuildError("An active paid Pro subscription is required before ordering a custom design.", 403);
  }
  const customerId = await ensureCircleCardStripeCustomerId({
    userId: user.id, email: user.email, name: user.name
  });
  const stripe = requireStripeClient();
  const origin = getRuntimeBrand().canonicalOrigin;
  await prisma.$executeRaw`
    INSERT INTO "CircleCardCustomBuildOrder"
      ("id","userId","cardId","customerId","brief","termsVersion","termsAcceptedAt")
    VALUES (${randomUUID()},${user.id},${card.id},${customerId},${values.brief},${CUSTOM_BUILD_TERMS_VERSION},now())
    ON CONFLICT ("userId","cardId") DO NOTHING`;

  // Serialize parallel clicks across tabs and devices, including provider calls.
  return prisma.$transaction(async tx => {
    const [order] = await tx.$queryRaw<CustomBuildOrder[]>`
      SELECT * FROM "CircleCardCustomBuildOrder"
      WHERE "userId"=${user.id} AND "cardId"=${card.id} FOR UPDATE`;
    if (!order || order.customerId !== customerId) throw new CustomBuildError("This order needs an account review.");
    const orderUrl = `${CUSTOM_BUILD_PATH}?order=${encodeURIComponent(order.id)}`;
    if (["PAID", "REFUNDED", "DISPUTED"].includes(order.paymentStatus)) {
      return { url: orderUrl, existingOrder: true };
    }
    await tx.$executeRaw`UPDATE "CircleCardCustomBuildOrder"
      SET "brief"=${values.brief}, "termsVersion"=${CUSTOM_BUILD_TERMS_VERSION},
          "termsAcceptedAt"=now(), "updatedAt"=now()
      WHERE "id"=${order.id}`;
    if (order.checkoutSessionId) {
      const previous = await stripe.checkout.sessions.retrieve(order.checkoutSessionId);
      if (objectId(previous.customer) !== customerId) throw new CustomBuildError("Checkout ownership could not be confirmed.");
      if (previous.status === "open" && previous.url) return { url: previous.url, existingOrder: true };
      if (previous.status !== "expired" && !(order.paymentStatus === "FAILED" && previous.payment_status === "unpaid")) {
        return { url: orderUrl, existingOrder: true };
      }
    }
    const attempt = order.checkoutAttempt + 1;
    const metadata = { product: CUSTOM_BUILD_PRODUCT, orderId: order.id, userId: user.id, cardId: card.id };
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      client_reference_id: order.id,
      line_items: [{ quantity: 1, price_data: {
        currency: CUSTOM_BUILD_CURRENCY,
        unit_amount: CUSTOM_BUILD_AMOUNT_PENCE,
        product_data: { name: "Circle Card custom design", description: "One custom card design and setup, with one round of changes. Active paid Circle Card Pro required." }
      } }],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${origin}${orderUrl}&payment=returned`,
      cancel_url: `${origin}${orderUrl}&payment=cancelled`,
      custom_text: { submit: { message: "£49.99 once, for one card. Pro (£9.99/month) is separate. The saved custom design pauses when paid Pro ends and returns when paid Pro resumes." } }
    }, { idempotencyKey: `circle-custom-build:${order.id}:${attempt}` });
    if (!session.url || objectId(session.customer) !== customerId) throw new CustomBuildError("Checkout is temporarily unavailable.", 502);
    await tx.$executeRaw`
      UPDATE "CircleCardCustomBuildOrder"
      SET "checkoutSessionId"=${session.id}, "checkoutAttempt"=${attempt},
          "paymentStatus"='PENDING', "updatedAt"=now()
      WHERE "id"=${order.id}`;
    return { url: session.url, existingOrder: false };
  }, { timeout: 30000 });
}

/** Provider retrieval, not the return URL, decides whether money was received. */
export async function reconcileCustomBuildOrder(order: CustomBuildOrder) {
  return prisma.$transaction(async tx => {
    const [current] = await tx.$queryRaw<CustomBuildOrder[]>`
      SELECT * FROM "CircleCardCustomBuildOrder" WHERE "id"=${order.id} FOR UPDATE`;
    if (!current) throw new CustomBuildError("Custom design order not found.");
    return reconcileLockedOrder(current, tx);
  }, { timeout: 30000 });
}

async function reconcileLockedOrder(order: CustomBuildOrder, tx: Prisma.TransactionClient) {
  if (!order.checkoutSessionId) return order;
  const stripe = requireStripeClient();
  const session = await stripe.checkout.sessions.retrieve(order.checkoutSessionId, {
    expand: ["payment_intent.latest_charge"]
  });
  if (session.mode !== "payment" || objectId(session.customer) !== order.customerId ||
      session.client_reference_id !== order.id ||
      session.metadata?.product !== CUSTOM_BUILD_PRODUCT ||
      session.metadata.orderId !== order.id || session.metadata.userId !== order.userId ||
      session.metadata.cardId !== order.cardId) {
    throw new CustomBuildError("Custom design checkout ownership mismatch.");
  }
  if (session.payment_status !== "paid") {
    if (!["PAID", "REFUNDED", "DISPUTED"].includes(order.paymentStatus)) {
      const pendingIntent = typeof session.payment_intent === "object" ? session.payment_intent : null;
      const paymentFailed = session.status === "complete" && pendingIntent &&
        ["canceled", "requires_payment_method"].includes(pendingIntent.status);
      const pendingStatus = session.status === "expired" ? "EXPIRED" : paymentFailed ? "FAILED" :
        session.status === "complete" ? "PROCESSING" : "PENDING";
      await tx.$executeRaw`
        UPDATE "CircleCardCustomBuildOrder" SET "paymentStatus"=${pendingStatus}, "updatedAt"=now()
        WHERE "id"=${order.id} AND "checkoutSessionId"=${session.id}
          AND "paymentStatus" NOT IN ('PAID','REFUNDED','DISPUTED')`;
    }
    const [saved] = await tx.$queryRaw<CustomBuildOrder[]>`SELECT * FROM "CircleCardCustomBuildOrder" WHERE "id"=${order.id}`;
    return saved;
  }
  const intent = typeof session.payment_intent === "object" && session.payment_intent
    ? session.payment_intent
    : session.payment_intent ? await stripe.paymentIntents.retrieve(session.payment_intent, { expand: ["latest_charge"] }) : null;
  if (session.currency !== order.currency || session.amount_total !== order.amountPence ||
      !intent || intent.currency !== order.currency || intent.amount_received !== order.amountPence ||
      intent.status !== "succeeded" || objectId(intent.customer) !== order.customerId ||
      intent.metadata.product !== CUSTOM_BUILD_PRODUCT || intent.metadata.orderId !== order.id ||
      intent.metadata.userId !== order.userId || intent.metadata.cardId !== order.cardId) {
    throw new CustomBuildError("Custom design payment could not be verified.");
  }
  const charge = typeof intent.latest_charge === "object" && intent.latest_charge
    ? intent.latest_charge
    : intent.latest_charge ? await stripe.charges.retrieve(intent.latest_charge) : null;
  if (!charge || objectId(charge.payment_intent) !== intent.id || objectId(charge.customer) !== order.customerId) {
    throw new CustomBuildError("Custom design charge ownership mismatch.");
  }
  const disputes = charge.disputed ? await stripe.disputes.list({ charge: charge.id, limit: 100 }) : null;
  const disputed = charge.disputed && (!disputes || disputes.has_more || disputes.data.length === 0 ||
    disputes.data.some(dispute => !["won", "warning_closed"].includes(dispute.status)));
  const paymentStatus = charge.refunded || charge.amount_refunded >= order.amountPence
    ? "REFUNDED" : disputed ? "DISPUTED" : "PAID";
  await tx.$executeRaw`
    UPDATE "CircleCardCustomBuildOrder"
    SET "paymentStatus"=${paymentStatus}, "paymentIntentId"=${intent.id},
        "paidAt"=COALESCE("paidAt",now()),
        "buildStatus"=CASE WHEN "buildStatus"='AWAITING_PAYMENT' AND ${paymentStatus}='PAID'
          THEN 'QUEUED' ELSE "buildStatus" END, "updatedAt"=now()
    WHERE "id"=${order.id} AND "checkoutSessionId"=${session.id}`;
  const [saved] = await tx.$queryRaw<CustomBuildOrder[]>`SELECT * FROM "CircleCardCustomBuildOrder" WHERE "id"=${order.id}`;
  return saved;
}

export const CUSTOM_BUILD_CHECKOUT_EVENTS = [
  "checkout.session.completed", "checkout.session.expired",
  "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"
] as const;
const CUSTOM_BUILD_MONEY_EVENTS = new Set([
  "charge.refunded", "refund.created", "refund.updated", "refund.failed",
  "charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed",
  "charge.dispute.funds_withdrawn", "charge.dispute.funds_reinstated"
]);

export async function processCustomBuildStripeEvent(event: Stripe.Event) {
  if (getRuntimeBrand().key !== "circle-card") return false;
  let order: CustomBuildOrder | undefined;
  if ((CUSTOM_BUILD_CHECKOUT_EVENTS as readonly string[]).includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    const rows = await prisma.$queryRaw<CustomBuildOrder[]>`
      SELECT * FROM "CircleCardCustomBuildOrder" WHERE "checkoutSessionId"=${session.id} LIMIT 1`;
    order = rows[0];
  } else if (CUSTOM_BUILD_MONEY_EVENTS.has(event.type)) {
    const money = event.data.object as Stripe.Charge | Stripe.Refund | Stripe.Dispute;
    let intentId = objectId(money.payment_intent);
    if (!intentId && "charge" in money && objectId(money.charge)) {
      const charge = await requireStripeClient().charges.retrieve(objectId(money.charge)!);
      intentId = objectId(charge.payment_intent);
    }
    if (intentId) {
      const rows = await prisma.$queryRaw<CustomBuildOrder[]>`
        SELECT * FROM "CircleCardCustomBuildOrder" WHERE "paymentIntentId"=${intentId} LIMIT 1`;
      order = rows[0];
    }
  } else return false;
  if (!order) return false;
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const expectedMode = /^(?:sk|rk)_live_/.test(key) ? true : /^(?:sk|rk)_test_/.test(key) ? false : null;
  if (expectedMode === null || event.livemode !== expectedMode) throw new CustomBuildError("Stripe event mode mismatch.");
  await reconcileCustomBuildOrder(order);
  return true;
}
