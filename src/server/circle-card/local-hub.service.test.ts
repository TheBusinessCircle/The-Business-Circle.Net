import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), getPublicCard: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { circleCard: { findMany: mocks.findMany } } }));
vi.mock("@/server/circle-card/public-card.service", () => ({ getPublicCircleCard: mocks.getPublicCard }));
import { getHucknallHubBusinesses } from "./local-hub.service";
import { HUCKNALL_HUB_PATH } from "@/lib/circle-card/local-hubs";

const candidate = (slug: string, overrides = {}) => ({ id: slug, slug, cardType: "BUSINESS", businessPostcode: "NG15 7AA",
  businessCategory: "shopping", isPublished: true, showInDiscover: true, archivedAt: null, ...overrides });
const publicCard = (slug: string, score = 0) => ({ id: slug, slug, businessName: slug, fullName: "Owner", tagline: "Local shop",
  isDemo: false, localHubPath: HUCKNALL_HUB_PATH, trust: { verifiedTestimonialCount: 0, signals: [{ id: "verified-connections", scoreContribution: score }] } });

describe("public Hucknall hub directory", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.findMany.mockResolvedValue([]); mocks.getPublicCard.mockImplementation(async slug => publicCard(slug)); });
  it("enforces opt-in, publication, location, type, archive and suspended-account predicates", async () => {
    await getHucknallHubBusinesses();
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      isPublished: true, showInDiscover: true, archivedAt: null, cardType: "BUSINESS",
      businessPostcode: { startsWith: "NG15 " }, user: { suspended: false }
    } }));
  });
  it("uses canonical visibility checks and omits plan-hidden or otherwise unavailable cards", async () => {
    mocks.findMany.mockResolvedValue([candidate("visible"), candidate("locked")]);
    mocks.getPublicCard.mockImplementation(async slug => slug === "locked" ? null : publicCard(slug));
    expect((await getHucknallHubBusinesses()).map(card => card.slug)).toEqual(["visible"]);
  });
  it("never returns full postcodes, owner data or private routing fields", async () => {
    mocks.findMany.mockResolvedValue([candidate("shop")]);
    const result = await getHucknallHubBusinesses();
    expect(result).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("NG15 7AA");
    expect(Object.keys(result[0]).sort()).toEqual(["category", "description", "id", "name", "slug", "trustScore", "verifiedTestimonials"]);
  });
  it("rechecks consent and location from the fresh canonical card read", async () => {
    mocks.findMany.mockResolvedValue([candidate("changed")]);
    mocks.getPublicCard.mockResolvedValue({ ...publicCard("changed"), localHubPath: null });
    expect(await getHucknallHubBusinesses()).toEqual([]);
  });
  it("ranks the complete set across concurrency batches", async () => {
    mocks.findMany.mockResolvedValue(Array.from({ length: 13 }, (_, i) => candidate(`shop-${i}`)));
    mocks.getPublicCard.mockImplementation(async slug => publicCard(slug, Number(slug.split("-")[1])));
    const result = await getHucknallHubBusinesses();
    expect(result).toHaveLength(13);
    expect(result[0].slug).toBe("shop-12");
    expect(mocks.getPublicCard).toHaveBeenCalledTimes(13);
  });
  it("fails visibly on a database error instead of claiming that the town has no businesses", async () => {
    mocks.findMany.mockRejectedValue(new Error("database unavailable"));
    await expect(getHucknallHubBusinesses()).rejects.toThrow("database unavailable");
  });
});
