import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), getPublicCard: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { circleCard: { findFirst: mocks.findFirst } } }));
vi.mock("@/server/circle-card/public-card.service", () => ({ getPublicCircleCard: mocks.getPublicCard }));
import { LocalHubMembership } from "./local-hub-membership";
import { HUCKNALL_HUB_CARD_ID } from "@/lib/circle-card/hucknall-content";
const member = { cardType: "BUSINESS", businessPostcode: "NG15 7AA", isPublished: true, showInDiscover: true, archivedAt: null };
const render = async (cardId = "business", isDemo = false) => renderToStaticMarkup(await LocalHubMembership({ cardId, isDemo }));

describe("business card link back to its local hub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue(member);
    mocks.getPublicCard.mockResolvedValue({ id: HUCKNALL_HUB_CARD_ID, isDemo: false });
  });
  it("renders a normal crawlable link with descriptive text, without exposing the full postcode", async () => {
    const html = await render();
    expect(html).toContain('href="/card/hucknall-circle-hub"');
    expect(html).toContain("Part of Hucknall Circle Hub");
    expect(html).not.toContain("NG15 7AA");
    expect(html).not.toContain('rel="nofollow"');
  });
  it("rechecks current publication, opt-in, account and location without relying on stale page props", async () => {
    await render();
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: {
      id: "business", isPublished: true, showInDiscover: true,
      archivedAt: null, businessPostcode: { startsWith: "NG15 " }, user: { suspended: false }
    } }));
    mocks.findFirst.mockResolvedValue(null);
    expect(await render()).toBe("");
  });
  it.each([
    { showInDiscover: false }, { businessPostcode: "NG16 1AA" },
    { archivedAt: new Date() }, { isPublished: false }
  ])("hides membership when eligibility changes: %j", async overrides => {
    mocks.findFirst.mockResolvedValue({ ...member, ...overrides });
    expect(await render()).toBe("");
  });
  it.each(["PERSONAL", "CREATOR", "BUSINESS"])("shows the hub backlink on a local %s card", async cardType => {
    mocks.findFirst.mockResolvedValue({ ...member, cardType });
    expect(await render()).toContain("Part of Hucknall Circle Hub");
  });
  it("does not link to an unpublished, example or replaced hub", async () => {
    for (const hub of [null, { id: HUCKNALL_HUB_CARD_ID, isDemo: true }, { id: "other", isDemo: false }]) {
      mocks.getPublicCard.mockResolvedValue(hub);
      expect(await render()).toBe("");
    }
  });
  it("omits example cards and a self-link on the hub", async () => {
    expect(await render("example", true)).toBe("");
    expect(await render(HUCKNALL_HUB_CARD_ID)).toBe("");
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
});
