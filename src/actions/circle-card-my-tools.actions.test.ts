import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  loadAccess: vi.fn(),
  listCards: vi.fn(),
  cardFind: vi.fn(),
  cardUpdate: vi.fn(),
  transaction: vi.fn(),
  revalidate: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  requireCircleCardUser: mocks.requireUser
}));
vi.mock("@/server/circle-card", () => ({
  loadCircleCardAccessForUser: mocks.loadAccess
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    circleCard: {
      findMany: mocks.listCards,
      findFirst: mocks.cardFind,
      update: mocks.cardUpdate
    },
    $transaction: mocks.transaction
  }
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidate
}));

import { setCircleCardMyToolPinnedAction } from "@/actions/circle-card-my-tools.actions";

const cardId = "cm" + "a".repeat(22);
const card = {
  id: cardId,
  isDefaultCard: true,
  isPrimary: true,
  displayOrder: 0,
  createdAt: new Date("2026-11-01T10:00:00Z")
};
const existingContent = {
  creator: { FEATURED_CONTENT: { items: [{ title: "Safe example" }] } },
  business: { SERVICES: { items: [{ title: "Consulting" }] } }
};

function form(values: Record<string, string> = {}) {
  const data = new FormData();
  data.set("cardId", values.cardId ?? cardId);
  data.set("toolId", values.toolId ?? "services");
  data.set("operation", values.operation ?? "pin");
  return data;
}

describe("Circle Card Pro-only My Tools server boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user: { id: "owner1" } });
    mocks.loadAccess.mockResolvedValue({
      hasProAccess: true,
      limits: { circleCards: 2 }
    });
    mocks.listCards.mockResolvedValue([card]);
    mocks.cardFind.mockResolvedValue({ id: cardId, contentBlocks: existingContent });
    mocks.cardUpdate.mockResolvedValue({ id: cardId });
    mocks.transaction.mockImplementation(async (callback) => callback({
      circleCard: {
        findFirst: mocks.cardFind,
        update: mocks.cardUpdate
      }
    }));
  });

  it.each([
    ["Free", { hasProAccess: false, plan: "FREE", limits: { circleCards: 1 } }],
    ["expired Pro", { hasProAccess: false, plan: "PRO", lifecycleStatus: "expired", limits: { circleCards: 1 } }],
    ["cancelled Pro", { hasProAccess: false, plan: "FREE", lifecycleStatus: "cancelled", limits: { circleCards: 1 } }]
  ])("rejects crafted %s requests before querying or mutating cards", async (_label, access) => {
    mocks.loadAccess.mockResolvedValue(access);
    await expect(setCircleCardMyToolPinnedAction(form())).rejects.toThrow(
      "My Tools is available with active Circle Card Pro."
    );
    expect(mocks.listCards).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.cardUpdate).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("allows a Pro subscriber to pin a shortcut without modifying the public creator and business blocks", async () => {
    await setCircleCardMyToolPinnedAction(form());
    expect(mocks.loadAccess).toHaveBeenCalledWith("owner1");
    expect(mocks.listCards).toHaveBeenCalledOnce();
    expect(mocks.cardUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: cardId },
      data: expect.objectContaining({
        contentBlocks: {
          ...existingContent,
          myTools: { version: 1, pinned: ["services"] }
        }
      })
    }));
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard/circle-card/tools");
  });

  it("enforces active plan card limits even for an active Pro member", async () => {
    mocks.listCards.mockResolvedValue([{ ...card, id: "cm" + "b".repeat(22) }]);
    await expect(setCircleCardMyToolPinnedAction(form())).rejects.toThrow(
      "This card is not available on your current plan."
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an unowned card and never writes it", async () => {
    mocks.cardFind.mockResolvedValue(null);
    await expect(setCircleCardMyToolPinnedAction(form())).rejects.toThrow("Card not found.");
    expect(mocks.cardUpdate).not.toHaveBeenCalled();
  });

  it("never accepts arbitrary tool IDs or invalid operations", async () => {
    await expect(setCircleCardMyToolPinnedAction(form({ toolId: "file-uploads-unsafe" }))).rejects.toThrow(
      "Invalid My Tools request."
    );
    await expect(setCircleCardMyToolPinnedAction(form({ operation: "publish" }))).rejects.toThrow(
      "Invalid My Tools request."
    );
    expect(mocks.listCards).not.toHaveBeenCalled();
  });

  it("checks Pro entitlement in the page before loading card content or providing interactive tools", () => {
    const page = readFileSync("src/app/(member)/dashboard/circle-card/tools/page.tsx", "utf8");
    const preview = readFileSync("src/components/circle-card/circle-card-my-tools-locked-preview.tsx", "utf8");
    const entitlementIndex = page.indexOf("if (!canUseMyTools(access))");
    const firstCardQuery = page.indexOf("prisma.circleCard.findMany(");

    expect(entitlementIndex).toBeGreaterThanOrEqual(0);
    expect(firstCardQuery).toBeGreaterThan(entitlementIndex);
    expect(page).toContain("return <CircleCardMyToolsLockedPreview />");
    expect(preview).toContain('aria-label="My Tools Pro preview, locked"');
    expect(preview).toContain('opacity-30 blur-[2px]');
    expect(preview).toContain('href="/circle-card/pro"');
    expect(preview).not.toContain("setCircleCardMyToolPinnedAction");
  });
});
