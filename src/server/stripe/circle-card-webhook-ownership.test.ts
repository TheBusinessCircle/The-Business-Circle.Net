import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const mocks = vi.hoisted(() => ({
  circleFindFirst: vi.fn(),
  circleFindUnique: vi.fn(),
  bcnFindFirst: vi.fn(),
  bcnFindUnique: vi.fn(),
  pendingFindFirst: vi.fn(),
  pendingFindUnique: vi.fn(),
  founderFindFirst: vi.fn(),
  founderFindUnique: vi.fn()
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    circleCardSubscription: {
      findFirst: mocks.circleFindFirst,
      findUnique: mocks.circleFindUnique
    },
    subscription: {
      findFirst: mocks.bcnFindFirst,
      findUnique: mocks.bcnFindUnique
    },
    pendingRegistration: {
      findFirst: mocks.pendingFindFirst,
      findUnique: mocks.pendingFindUnique
    },
    founderServiceRequest: {
      findFirst: mocks.founderFindFirst,
      findUnique: mocks.founderFindUnique
    }
  }
}));

import { classifyCircleCardStripeEventOwnership } from "@/server/stripe/circle-card-webhook-ownership";

function event(type: string, object: unknown) {
  return {
    id: `evt_${type.replaceAll(".", "_")}`,
    type,
    data: { object }
  } as Stripe.Event;
}

function subscription(priceId = "price_circle") {
  return {
    id: "sub_1",
    object: "subscription",
    items: { data: [{ price: { id: priceId } }] },
    metadata: {}
  } as unknown as Stripe.Subscription;
}

function invoice(priceId = "price_circle") {
  return {
    id: "in_1",
    object: "invoice",
    subscription: "sub_1",
    lines: { data: [{ price: { id: priceId } }] }
  } as unknown as Stripe.Invoice;
}

describe("Circle Card Stripe event ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID", "price_circle");
    for (const mock of Object.values(mocks)) mock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("proves Circle checkout ownership from persisted application state", async () => {
    mocks.circleFindFirst.mockResolvedValue({ id: "ccs_1" });
    await expect(
      classifyCircleCardStripeEventOwnership(
        event("checkout.session.completed", {
          id: "cs_1",
          object: "checkout.session",
          subscription: "sub_1",
          metadata: { circleCardPlan: "PRO" }
        })
      )
    ).resolves.toBe("circle-card");
  });

  it.each([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted"
  ])("recognises %s from the server-configured Circle price", async (type) => {
    await expect(
      classifyCircleCardStripeEventOwnership(event(type, subscription()))
    ).resolves.toBe("circle-card");
  });

  it.each(["invoice.paid", "invoice.payment_failed", "invoice.payment_action_required"])(
    "recognises %s from the server-configured Circle price",
    async (type) => {
      await expect(
        classifyCircleCardStripeEventOwnership(event(type, invoice()))
      ).resolves.toBe("circle-card");
    }
  );

  it("does not trust forged Circle metadata without persisted or price evidence", async () => {
    await expect(
      classifyCircleCardStripeEventOwnership(
        event("checkout.session.completed", {
          id: "cs_forged",
          object: "checkout.session",
          metadata: { userId: "user-1", circleCardPlan: "PRO", product: "circle-card-pro" }
        })
      )
    ).resolves.toBe("ambiguous");
  });

  it("classifies a persisted BCN event without trusting its metadata", async () => {
    mocks.bcnFindUnique.mockResolvedValue({ id: "bcn_sub_1" });
    await expect(
      classifyCircleCardStripeEventOwnership(
        event("customer.subscription.updated", subscription("price_bcn"))
      )
    ).resolves.toBe("bcn");
  });

  it("lets stored BCN ownership override forged Circle metadata", async () => {
    mocks.bcnFindFirst.mockResolvedValue({ id: "bcn_checkout_1" });
    await expect(
      classifyCircleCardStripeEventOwnership(
        event("checkout.session.completed", {
          id: "cs_bcn",
          object: "checkout.session",
          metadata: { userId: "user-1", circleCardPlan: "PRO", product: "circle-card-pro" }
        })
      )
    ).resolves.toBe("bcn");
  });

  it("classifies a persisted founder-service event", async () => {
    mocks.founderFindFirst.mockResolvedValue({ id: "founder_1" });
    await expect(
      classifyCircleCardStripeEventOwnership(
        event("checkout.session.completed", {
          id: "cs_founder",
          object: "checkout.session",
          metadata: { checkoutKind: "founder_service" }
        })
      )
    ).resolves.toBe("founder-service");
  });

  it("fails conflicting stored product ownership closed as ambiguous", async () => {
    mocks.circleFindUnique.mockResolvedValue({ id: "ccs_1" });
    mocks.bcnFindUnique.mockResolvedValue({ id: "bcn_1" });
    await expect(
      classifyCircleCardStripeEventOwnership(
        event("invoice.paid", invoice("price_unconfigured"))
      )
    ).resolves.toBe("ambiguous");
  });

  it("leaves missing ownership evidence ambiguous", async () => {
    await expect(
      classifyCircleCardStripeEventOwnership(
        event("invoice.paid", invoice("price_unconfigured"))
      )
    ).resolves.toBe("ambiguous");
  });

  it("does not query product state for an unsupported event", async () => {
    await expect(
      classifyCircleCardStripeEventOwnership(
        event("charge.refunded", { id: "ch_1", object: "charge" })
      )
    ).resolves.toBe("unsupported");
    for (const mock of Object.values(mocks)) expect(mock).not.toHaveBeenCalled();
  });
});
