import { describe, expect, it } from "vitest";
import {
  isCircleCardWithinPlan,
  selectCircleCardLinksWithinPlan,
  selectCircleCardsWithinPlan
} from "@/lib/circle-card/plan-policy";

describe("Circle Card deterministic plan policy", () => {
  it("prefers the default card and resolves every tie stably", () => {
    const createdAt = new Date("2026-07-12T12:00:00.000Z");
    const cards = [
      { id: "card-c", isDefaultCard: false, isPrimary: false, displayOrder: 0, createdAt },
      { id: "card-b", isDefaultCard: true, isPrimary: false, displayOrder: 9, createdAt },
      { id: "card-a", isDefaultCard: false, isPrimary: false, displayOrder: 0, createdAt }
    ];

    expect(selectCircleCardsWithinPlan(cards, 2).map((card) => card.id)).toEqual([
      "card-b",
      "card-a"
    ]);
  });

  it("uses the same deterministic selection for authoritative target checks", () => {
    const cards = [
      {
        id: "extra-card",
        isDefaultCard: false,
        isPrimary: false,
        displayOrder: 0,
        createdAt: new Date("2026-07-12T11:00:00.000Z")
      },
      {
        id: "default-card",
        isDefaultCard: true,
        isPrimary: false,
        displayOrder: 10,
        createdAt: new Date("2026-07-12T12:00:00.000Z")
      }
    ];

    expect(isCircleCardWithinPlan("default-card", cards, 1)).toBe(true);
    expect(isCircleCardWithinPlan("extra-card", cards, 1)).toBe(false);
  });

  it("filters ineligible links before applying the public limit", () => {
    const createdAt = new Date("2026-07-12T12:00:00.000Z");
    const links = [
      {
        id: "private",
        isActive: true,
        visibility: "PRIVATE_CODE",
        url: null,
        fileUrl: "/api/circle-card/link-file/private.pdf",
        sortOrder: 0,
        createdAt
      },
      {
        id: "unsafe",
        isActive: true,
        visibility: "PUBLIC",
        url: "javascript:alert(1)",
        fileUrl: null,
        sortOrder: 1,
        createdAt
      },
      ...Array.from({ length: 6 }, (_, index) => ({
        id: `public-${index + 1}`,
        isActive: true,
        visibility: "PUBLIC",
        url: `https://example.com/${index + 1}`,
        fileUrl: null,
        sortOrder: index + 2,
        createdAt
      }))
    ];

    expect(selectCircleCardLinksWithinPlan(links, 5).map((link) => link.id)).toEqual([
      "public-1",
      "public-2",
      "public-3",
      "public-4",
      "public-5"
    ]);
  });

  it("keeps active-link ties deterministic by creation time then ID", () => {
    const links = [
      {
        id: "link-b",
        isActive: true,
        visibility: "PUBLIC",
        url: "https://example.com/b",
        fileUrl: null,
        sortOrder: 0,
        createdAt: "2026-07-12T12:00:00.000Z"
      },
      {
        id: "link-a",
        isActive: true,
        visibility: "PUBLIC",
        url: "https://example.com/a",
        fileUrl: null,
        sortOrder: 0,
        createdAt: "2026-07-12T12:00:00.000Z"
      }
    ];

    expect(selectCircleCardLinksWithinPlan(links, 2).map((link) => link.id)).toEqual([
      "link-a",
      "link-b"
    ]);
  });
});
