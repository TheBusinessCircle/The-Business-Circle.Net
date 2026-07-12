import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  publishFirstCircleCardAction,
  saveFirstCircleCardStepAction
} from "@/actions/circle-card-onboarding.actions";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  updateCard: vi.fn(),
  createCard: vi.fn(),
  updateUser: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  requireCircleCardUser: vi.fn(async () => ({ user: { id: "user_1" } }))
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    circleCard: {
      findFirst: mocks.findFirst,
      findUnique: mocks.findUnique,
      update: mocks.updateCard
    },
    user: { update: mocks.updateUser },
    $transaction: mocks.transaction
  }
}));

const readyDraft = {
  cardId: "card_1",
  cardType: "PERSONAL" as const,
  fullName: "Ada Lovelace",
  profileImageUrl: "/uploads/circle-card/ada.jpg",
  businessLogoUrl: "",
  profileImagePositionX: 50,
  profileImagePositionY: 50,
  profileImageScale: 1,
  businessLogoPositionX: 50,
  businessLogoPositionY: 50,
  businessLogoScale: 1,
  businessName: "Analytical Engines",
  role: "Founder",
  tagline: "I help people understand computing.",
  email: "ada@example.com",
  phone: "",
  websiteUrl: ""
};

describe("first Circle Card save and publish actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue({ id: "card_1", slug: "ada-lovelace", isPublished: false });
    mocks.updateCard.mockResolvedValue({ id: "card_1" });
    mocks.updateUser.mockResolvedValue({ id: "user_1" });
  });

  it("saves progress to the existing server-backed starter card", async () => {
    const result = await saveFirstCircleCardStepAction(readyDraft);

    expect(result).toMatchObject({ ok: true, completionPercentage: 100, publishReady: true });
    expect(mocks.updateCard).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "card_1" }, data: expect.objectContaining({ fullName: "Ada Lovelace" }) })
    );
    expect(mocks.createCard).not.toHaveBeenCalled();
  });

  it("regresses Creator Step 1 with a managed relative upload and crop settings", async () => {
    const result = await saveFirstCircleCardStepAction({
      ...readyDraft,
      cardType: "CREATOR",
      fullName: "Nova",
      profileImageUrl: "/uploads/circle-card/user_1-profile-photo-1783830000000-deadbeef.png",
      profileImagePositionX: 27,
      profileImagePositionY: 73,
      profileImageScale: 1.64
    });

    expect(result).toMatchObject({ ok: true, cardId: "card_1" });
    expect(mocks.updateCard).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "card_1" },
        data: expect.objectContaining({
          cardType: "CREATOR",
          profileLayout: "CREATOR",
          fullName: "Nova",
          profileImageUrl: "/uploads/circle-card/user_1-profile-photo-1783830000000-deadbeef.png",
          profileImagePositionX: 27,
          profileImagePositionY: 73,
          profileImageScale: 1.64
        })
      })
    );
  });

  it.each([
    ["PERSONAL", "CLASSIC"],
    ["BUSINESS", "BUSINESS"],
    ["CREATOR", "CREATOR"]
  ] as const)("persists %s with its safe layout", async (cardType, profileLayout) => {
    const result = await saveFirstCircleCardStepAction({ ...readyDraft, cardType });

    expect(result.ok).toBe(true);
    expect(mocks.updateCard).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cardType, profileLayout }) })
    );
  });

  it("rejects arbitrary relative and unapproved remote image paths before persistence", async () => {
    const arbitraryRelative = await saveFirstCircleCardStepAction({
      ...readyDraft,
      profileImageUrl: "/api/private/avatar.png"
    });
    const unapprovedRemote = await saveFirstCircleCardStepAction({
      ...readyDraft,
      profileImageUrl: "https://unapproved.example.com/avatar.png"
    });

    expect(arbitraryRelative.ok).toBe(false);
    expect(unapprovedRemote.ok).toBe(false);
    expect(mocks.updateCard).not.toHaveBeenCalled();
  });

  it("contains unexpected database failures as an inline action error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.findFirst.mockRejectedValueOnce(new Error("database unavailable"));

    const result = await saveFirstCircleCardStepAction(readyDraft);

    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? "" : result.message).toContain("details are still here");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("publishes only after the saved essentials pass readiness", async () => {
    const incomplete = await publishFirstCircleCardAction({ ...readyDraft, email: "" });
    expect(incomplete).toEqual({ ok: false, message: "Add the missing essentials before publishing your Circle Card." });
    expect(mocks.updateCard).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { isPublished: true } })
    );

    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue({ id: "card_1", slug: "ada-lovelace", isPublished: false });
    mocks.updateCard.mockResolvedValue({ id: "card_1" });
    mocks.updateUser.mockResolvedValue({ id: "user_1" });
    const published = await publishFirstCircleCardAction(readyDraft);
    expect(published).toMatchObject({ ok: true, published: true });
    expect(mocks.updateCard).toHaveBeenCalledWith({
      where: { id: "card_1" },
      data: { isPublished: true }
    });
  });

  it("reuses a starter card discovered inside the transaction instead of creating a duplicate", async () => {
    mocks.findFirst.mockResolvedValueOnce(null);
    mocks.findUnique.mockResolvedValue(null);
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        circleCard: {
          findFirst: vi.fn(async () => ({ id: "card_race", slug: "existing", isPublished: false })),
          create: mocks.createCard
        }
      })
    );

    const result = await saveFirstCircleCardStepAction({ ...readyDraft, cardId: "" });
    expect(result).toMatchObject({ ok: true, cardId: "card_race" });
    expect(mocks.createCard).not.toHaveBeenCalled();
  });
});
