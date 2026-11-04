import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "owner" } }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { circleCard: { findMany: mocks.findMany } } }));
vi.mock("@/server/circle-card/plan-policy.service", () => ({ filterPublicCircleCardTargetsWithinOwnerPlans: async (cards: unknown[]) => cards }));
vi.mock("@/actions/hucknall-hub.actions", () => ({ saveHucknallMembershipAction: async () => {} }));
import JoinPage from "./page";
describe("joining with an existing free card", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it.each(["PERSONAL", "CREATOR", "BUSINESS"])("offers an existing %s card with a business declaration", async cardType => {
    mocks.findMany.mockResolvedValue([{ id: "card", userId: "owner", fullName: "Design Delight Gifts", cardType, businessName: null, businessPostcode: null, businessCategory: null, showInDiscover: false }]);
    const html = renderToStaticMarkup(await JoinPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Design Delight Gifts");
    expect(html).toContain('name="businessConfirmed"');
    expect(html).toContain('name="discover"');
    expect(html).not.toContain("Build your business card");
    expect(mocks.findMany.mock.calls[0][0].where).not.toHaveProperty("cardType");
  });
  it("guides owners of unpublished cards to their workspace", async () => {
    mocks.findMany.mockResolvedValue([]);
    const html = renderToStaticMarkup(await JoinPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('href="/app"');
    expect(html).toContain("Any card type works on the free plan");
    expect(html).not.toContain("cardType=BUSINESS");
  });
});
