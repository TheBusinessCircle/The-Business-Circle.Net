import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  })
);
const revalidatePathMock = vi.hoisted(() => vi.fn());
const createCircleCardActivityMock = vi.hoisted(() => vi.fn());
const trackCircleCardEventMock = vi.hoisted(() => vi.fn());
const createCircleCardNotificationMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn()
  },
  circleCard: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock("@/auth", () => ({
  auth: authMock
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("@/lib/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/utils")>()),
  absoluteUrl: (path: string) => `https://example.test${path.startsWith("/") ? path : `/${path}`}`
}));

vi.mock("@/server/circle-card", () => ({
  createCircleCardActivity: createCircleCardActivityMock,
  createCircleCardNotification: createCircleCardNotificationMock,
  findBusinessCardCircleCardMatches: vi.fn(),
  findDuplicateBusinessCardWalletContact: vi.fn(),
  trackCircleCardEvent: trackCircleCardEventMock
}));

vi.mock("@/server/circle-card/link-access.service", () => ({
  hashCircleCardAccessCode: vi.fn()
}));

vi.mock("@/server/circle-card/smart-profile-import.service", () => ({
  scanCircleCardSmartImportUrls: vi.fn()
}));

import {
  upsertCircleCardAction,
  upsertCircleCardMenuOfferItemInlineAction,
  upsertCircleCardPriceListItemInlineAction
} from "@/actions/circle-card.actions";
import { initialCircleCardSaveActionState } from "@/lib/circle-card/save-action-state";

function validCircleCardForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    slug: "asha-founder",
    cardType: "BUSINESS",
    fullName: "Asha Founder",
    businessName: "Asha Studio",
    accountType: "FOUNDER",
    profileLayout: "BUSINESS",
    role: "Founder",
    tagline: "Practical growth support",
    about: "Helping operators build calmer businesses.",
    websiteUrl: "https://example.com",
    email: "asha@example.com",
    isPublished: "on",
    ...overrides
  };

  Object.entries(values).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

function mockSignedInUser() {
  authMock.mockResolvedValue({
    user: {
      id: "user_123"
    }
  });
  prismaMock.user.findUnique.mockResolvedValue({
    id: "user_123",
    role: "ADMIN",
    membershipTier: "INNER_CIRCLE",
    suspended: false,
    subscription: null
  });
}

describe("upsertCircleCardAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignedInUser();
    createCircleCardActivityMock.mockResolvedValue({ stored: true });
    trackCircleCardEventMock.mockResolvedValue({ stored: true });
    createCircleCardNotificationMock.mockResolvedValue({ stored: true });
  });

  it("returns success for a successful update", async () => {
    prismaMock.circleCard.findFirst
      .mockResolvedValueOnce({
        id: "clx0000000000000000000001",
        slug: "old-asha-founder",
        showInDiscover: false,
        discoverOptedInAt: null,
        archivedAt: null
      })
      .mockResolvedValueOnce(null);
    prismaMock.circleCard.update.mockResolvedValue({});

    const result = await upsertCircleCardAction(
      initialCircleCardSaveActionState,
      validCircleCardForm({ cardId: "clx0000000000000000000001" })
    );

    expect(result).toMatchObject({
      success: true,
      message: "Your Circle Card has been saved.",
      cardId: "clx0000000000000000000001",
      slug: "asha-founder",
      publicUrl: "https://example.test/card/asha-founder"
    });
    expect(result.message).not.toBe("The Circle Card could not be saved.");
    expect(prismaMock.circleCard.update).toHaveBeenCalled();
  });

  it.each(["PERSONAL", "CREATOR", "BUSINESS"] as const)(
    "writes the selected %s card type without changing it",
    async (cardType) => {
      prismaMock.circleCard.findFirst
        .mockResolvedValueOnce({
          id: "clx0000000000000000000010",
          slug: "old-asha-founder",
          isPublished: true,
          isDefaultCard: true,
          isPrimary: true,
          showInDiscover: false,
          discoverOptedInAt: null,
          archivedAt: null
        })
        .mockResolvedValueOnce(null);
      prismaMock.circleCard.update.mockResolvedValue({});

      const result = await upsertCircleCardAction(
        initialCircleCardSaveActionState,
        validCircleCardForm({
          cardId: "clx0000000000000000000010",
          cardType
        })
      );

      expect(result.success).toBe(true);
      expect(prismaMock.circleCard.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "clx0000000000000000000010" },
          data: expect.objectContaining({ cardType })
        })
      );
      expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/circle-card");
      expect(revalidatePathMock).toHaveBeenCalledWith("/card/old-asha-founder");
      expect(revalidatePathMock).toHaveBeenCalledWith("/card/asha-founder");
    }
  );

  it("rejects a missing card type instead of silently writing Personal", async () => {
    const formData = validCircleCardForm({ cardId: "clx0000000000000000000011" });
    formData.delete("cardType");

    const result = await upsertCircleCardAction(
      initialCircleCardSaveActionState,
      formData
    );

    expect(result).toMatchObject({
      success: false,
      message: "The Circle Card could not be saved."
    });
    expect(result.fieldErrors?.cardType?.length).toBeGreaterThan(0);
    expect(prismaMock.circleCard.create).not.toHaveBeenCalled();
    expect(prismaMock.circleCard.update).not.toHaveBeenCalled();
  });

  it("preserves uploaded profile and logo URLs on the selected card update", async () => {
    prismaMock.circleCard.findFirst
      .mockResolvedValueOnce({
        id: "clx0000000000000000000004",
        slug: "old-asha-founder",
        isPublished: true,
        isDefaultCard: true,
        isPrimary: true,
        showInDiscover: false,
        discoverOptedInAt: null,
        archivedAt: null
      })
      .mockResolvedValueOnce(null);
    prismaMock.circleCard.update.mockResolvedValue({});

    const result = await upsertCircleCardAction(
      initialCircleCardSaveActionState,
      validCircleCardForm({
        cardId: "clx0000000000000000000004",
        profileImageUrl: "/uploads/circle-card/profile.png",
        businessLogoUrl: "https://res.cloudinary.com/demo/image/upload/logo.webp"
      })
    );

    expect(result).toMatchObject({
      success: true,
      cardId: "clx0000000000000000000004"
    });
    expect(prismaMock.circleCard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "clx0000000000000000000004" },
        data: expect.objectContaining({
          profileImageUrl: "/uploads/circle-card/profile.png",
          businessLogoUrl: "https://res.cloudinary.com/demo/image/upload/logo.webp"
        })
      })
    );
  });

  it("returns success for a successful create", async () => {
    prismaMock.circleCard.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prismaMock.circleCard.findFirst.mockResolvedValueOnce(null);
    prismaMock.circleCard.create.mockResolvedValue({
      id: "clx0000000000000000000002",
      slug: "asha-founder"
    });

    const result = await upsertCircleCardAction(
      initialCircleCardSaveActionState,
      validCircleCardForm()
    );

    expect(result).toMatchObject({
      success: true,
      message: "Your Circle Card has been saved.",
      cardId: "clx0000000000000000000002",
      slug: "asha-founder",
      publicUrl: "https://example.test/card/asha-founder"
    });
    expect(prismaMock.circleCard.create).toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/circle-card");
  });

  it("does not return the failure message after a saved update", async () => {
    prismaMock.circleCard.findFirst
      .mockResolvedValueOnce({
        id: "clx0000000000000000000003",
        slug: "asha-founder",
        showInDiscover: false,
        discoverOptedInAt: null,
        archivedAt: null
      })
      .mockResolvedValueOnce(null);
    prismaMock.circleCard.update.mockResolvedValue({});

    const result = await upsertCircleCardAction(
      initialCircleCardSaveActionState,
      validCircleCardForm({ cardId: "clx0000000000000000000003" })
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Your Circle Card has been saved.");
    expect(result.formError).toBeUndefined();
  });

  it("returns validation errors without writing", async () => {
    const result = await upsertCircleCardAction(
      initialCircleCardSaveActionState,
      validCircleCardForm({ fullName: "A" })
    );

    expect(result).toMatchObject({
      success: false,
      message: "The Circle Card could not be saved.",
      formError: "Check the card fields and try again."
    });
    expect(result.fieldErrors?.fullName?.length).toBeGreaterThan(0);
    expect(prismaMock.circleCard.create).not.toHaveBeenCalled();
    expect(prismaMock.circleCard.update).not.toHaveBeenCalled();
  });

  it("returns a slug field error for a duplicate slug", async () => {
    prismaMock.circleCard.count.mockResolvedValueOnce(0);
    prismaMock.circleCard.findFirst.mockResolvedValueOnce({
      id: "clx0000000000000000009999"
    });

    const result = await upsertCircleCardAction(
      initialCircleCardSaveActionState,
      validCircleCardForm({ slug: "taken-slug" })
    );

    expect(result).toMatchObject({
      success: false,
      message: "The Circle Card could not be saved.",
      formError: "That public card link is already taken."
    });
    expect(result.fieldErrors?.slug).toEqual(["That public card link is already taken."]);
    expect(prismaMock.circleCard.create).not.toHaveBeenCalled();
  });
});

describe("Price List inline actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignedInUser();
  });

  function validPriceListForm() {
    const formData = new FormData();
    formData.set("cardId", "clx0000000000000000000020");
    formData.set("title", "Website Audit");
    formData.set("description", "A focused website review.");
    formData.set("price", "£249");
    formData.set("priceNote", "One-off fixed price");
    formData.set("category", "Audits");
    formData.set("ctaLabel", "Get Started");
    formData.set("ctaUrl", "https://example.com/pricing");
    formData.set("isFeatured", "on");
    formData.set("isActive", "on");
    return formData;
  }

  it("saves a price item for an entitled Business Card", async () => {
    prismaMock.circleCard.findFirst.mockResolvedValue({
      id: "clx0000000000000000000020",
      slug: "asha-business",
      cardType: "BUSINESS",
      contentBlocks: { business: { PRODUCTS: { items: [] } } }
    });
    prismaMock.circleCard.update.mockResolvedValue({});

    const result = await upsertCircleCardPriceListItemInlineAction(validPriceListForm());

    expect(result).toMatchObject({ ok: true, notice: "Price saved" });
    expect(prismaMock.circleCard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "clx0000000000000000000020" },
        data: expect.objectContaining({
          contentBlocks: expect.objectContaining({
            business: expect.objectContaining({
              PRICE_LIST: expect.objectContaining({ items: [expect.objectContaining({ title: "Website Audit", price: "£249" })] })
            })
          })
        })
      })
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/card/asha-business");
  });

  it("locks Price List editing for Circle Card Free", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_123",
      role: "MEMBER",
      membershipTier: "FOUNDATION",
      suspended: false,
      subscription: null
    });

    const result = await upsertCircleCardPriceListItemInlineAction(validPriceListForm());

    expect(result).toEqual({
      ok: false,
      error: "price-list-locked",
      message: "Price List is included with Circle Card Pro."
    });
    expect(prismaMock.circleCard.update).not.toHaveBeenCalled();
  });
});

describe("Menu & Offers inline actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignedInUser();
  });

  function validMenuOfferForm() {
    const formData = new FormData();
    formData.set("cardId", "clx0000000000000000000020");
    formData.set("title", "Lunch Special");
    formData.set("description", "A weekday lunch offer.");
    formData.set("imageUrl", "/uploads/circle-card/lunch.webp");
    formData.set("category", "Lunch");
    formData.set("price", "£12");
    formData.set("previousPrice", "£16");
    formData.set("badge", "Special Offer");
    formData.set("ctaLabel", "Order Now");
    formData.set("ctaUrl", "https://example.com/order");
    formData.set("expiryDate", "2026-07-31");
    formData.set("isFeatured", "on");
    formData.set("isActive", "on");
    return formData;
  }

  it("saves an item for an entitled Business Card", async () => {
    prismaMock.circleCard.findFirst.mockResolvedValue({
      id: "clx0000000000000000000020",
      slug: "asha-business",
      cardType: "BUSINESS",
      contentBlocks: { business: { PRODUCTS: { items: [] } } }
    });
    prismaMock.circleCard.update.mockResolvedValue({});

    const result = await upsertCircleCardMenuOfferItemInlineAction(validMenuOfferForm());

    expect(result).toMatchObject({ ok: true, notice: "Menu or offer item saved" });
    expect(prismaMock.circleCard.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        contentBlocks: expect.objectContaining({
          business: expect.objectContaining({
            MENU_OFFERS: expect.objectContaining({ items: [expect.objectContaining({ title: "Lunch Special" })] })
          })
        })
      })
    }));
  });

  it("locks editing for Circle Card Free", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_123",
      role: "MEMBER",
      membershipTier: "FOUNDATION",
      suspended: false,
      subscription: null
    });

    const result = await upsertCircleCardMenuOfferItemInlineAction(validMenuOfferForm());

    expect(result).toEqual({
      ok: false,
      error: "menu-offers-locked",
      message: "Menu & Offers are included with Circle Card Pro."
    });
    expect(prismaMock.circleCard.update).not.toHaveBeenCalled();
  });
});
