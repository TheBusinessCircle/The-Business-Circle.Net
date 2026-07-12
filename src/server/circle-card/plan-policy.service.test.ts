import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  loadAccessBatch: vi.fn()
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    circleCard: {
      findMany: mocks.findMany
    }
  }
}));
vi.mock("@/server/circle-card/billing.service", () => ({
  loadCircleCardAccessForUsers: mocks.loadAccessBatch
}));

import {
  filterPublicCircleCardTargetsWithinOwnerPlans,
  isPublicCircleCardTargetWithinOwnerPlan
} from "@/server/circle-card/plan-policy.service";

const createdAt = new Date("2026-07-12T12:00:00.000Z");

describe("public Circle Card target plan policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([
      {
        id: "owner-a-extra",
        userId: "owner-a",
        isDefaultCard: false,
        isPrimary: false,
        displayOrder: 0,
        createdAt,
        isPublished: true,
        user: { suspended: false }
      },
      {
        id: "owner-a-default",
        userId: "owner-a",
        isDefaultCard: true,
        isPrimary: false,
        displayOrder: 9,
        createdAt,
        isPublished: true,
        user: { suspended: false }
      },
      {
        id: "owner-b-first",
        userId: "owner-b",
        isDefaultCard: true,
        isPrimary: true,
        displayOrder: 0,
        createdAt,
        isPublished: true,
        user: { suspended: false }
      },
      {
        id: "owner-b-second",
        userId: "owner-b",
        isDefaultCard: false,
        isPrimary: false,
        displayOrder: 1,
        createdAt,
        isPublished: true,
        user: { suspended: false }
      }
    ]);
    mocks.loadAccessBatch.mockImplementation(async (ownerIds: string[]) =>
      new Map(
        ownerIds.map((ownerId) => [
          ownerId,
          { limits: { circleCards: ownerId === "owner-a" ? 1 : 2 } }
        ])
      )
    );
  });

  it("loads owner cards and all owner entitlements in two constant-count batch queries", async () => {
    const targets = [
      { id: "owner-a-extra", userId: "owner-a", label: "locked" },
      { id: "owner-a-default", userId: "owner-a", label: "free" },
      { id: "owner-b-second", userId: "owner-b", label: "pro" }
    ];

    await expect(filterPublicCircleCardTargetsWithinOwnerPlans(targets)).resolves.toEqual([
      targets[1],
      targets[2]
    ]);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.loadAccessBatch).toHaveBeenCalledTimes(1);
    expect(mocks.loadAccessBatch).toHaveBeenCalledWith(["owner-a", "owner-b"]);
  });

  it("fails a direct authoritative target check for a plan-locked extra card", async () => {
    await expect(
      isPublicCircleCardTargetWithinOwnerPlan({ id: "owner-a-extra", userId: "owner-a" })
    ).resolves.toBe(false);
  });

  it("fails closed when the authoritative target is unpublished or its owner is suspended", async () => {
    const baseCards = await mocks.findMany();
    mocks.findMany.mockResolvedValueOnce(
      baseCards.map((card: { id: string }) =>
        card.id === "owner-a-default"
          ? { ...card, isPublished: false }
          : card.id === "owner-b-second"
            ? { ...card, user: { suspended: true } }
            : card
      )
    );

    await expect(
      filterPublicCircleCardTargetsWithinOwnerPlans([
        { id: "owner-a-default", userId: "owner-a" },
        { id: "owner-b-second", userId: "owner-b" }
      ])
    ).resolves.toEqual([]);
  });
});
