import { MembershipTier } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const billingPriceFindFirstMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {
    billingPrice: {
      findFirst: billingPriceFindFirstMock
    }
  }
}));

import { isKnownManagedMembershipStripePriceId } from "@/server/products-pricing/catalog.service";

describe("managed membership Stripe price classification", () => {
  beforeEach(() => {
    billingPriceFindFirstMock.mockReset();
  });

  it("accepts a catalog price only when its product is a BCN membership", async () => {
    billingPriceFindFirstMock.mockResolvedValueOnce({
      product: { membershipTier: MembershipTier.INNER_CIRCLE }
    });

    await expect(isKnownManagedMembershipStripePriceId("price_bcn_inner")).resolves.toBe(
      true
    );
  });

  it("rejects prices belonging to non-membership products", async () => {
    billingPriceFindFirstMock.mockResolvedValueOnce({
      product: { membershipTier: null }
    });

    await expect(isKnownManagedMembershipStripePriceId("price_circle_card_pro")).resolves.toBe(
      false
    );
  });

  it("rejects missing and unknown prices instead of falling back to Foundation", async () => {
    await expect(isKnownManagedMembershipStripePriceId(null)).resolves.toBe(false);
    expect(billingPriceFindFirstMock).not.toHaveBeenCalled();

    billingPriceFindFirstMock.mockResolvedValueOnce(null);
    await expect(isKnownManagedMembershipStripePriceId("price_unknown_product")).resolves.toBe(
      false
    );
  });
});
