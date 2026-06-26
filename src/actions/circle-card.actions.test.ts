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

import { upsertCircleCardAction } from "@/actions/circle-card.actions";
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
