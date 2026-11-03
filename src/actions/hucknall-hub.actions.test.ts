import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), findFirst: vi.fn(), update: vi.fn(), allowed: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { circleCard: { findFirst: mocks.findFirst, update: mocks.update } } }));
vi.mock("@/server/circle-card/plan-policy.service", () => ({ isPublicCircleCardTargetWithinOwnerPlan: mocks.allowed }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
import { saveHucknallMembershipAction } from "./hucknall-hub.actions";
const id = "clx0000000000000000000001";
function form(discover = true) { const data = new FormData(); data.set("cardId", id); data.set("postcode", "ng157aa"); data.set("category", "shopping"); if (discover) data.set("discover", "on"); return data; }
describe("free local-directory enrolment", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "owner" } }); mocks.allowed.mockResolvedValue(true); mocks.findFirst.mockResolvedValue({ id, userId: "owner", slug: "local-shop", showInDiscover: false, discoverOptedInAt: null }); mocks.update.mockResolvedValue({ id }); });
  it("requires a signed-in account", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(saveHucknallMembershipAction(form())).rejects.toThrow("REDIRECT:/login?");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("checks ownership, publication, type, archive and suspension before saving", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(saveHucknallMembershipAction(form())).rejects.toThrow("error=card");
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: {
      id, userId: "owner", cardType: "BUSINESS", isPublished: true, archivedAt: null, user: { suspended: false }
    } }));
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("keeps card allowance checks and does not require Pro to opt in", async () => {
    await expect(saveHucknallMembershipAction(form())).rejects.toThrow("saved=1");
    expect(mocks.allowed).toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith({ where: { id }, data: {
      businessPostcode: "NG15 7AA", businessCategory: "shopping", showInDiscover: true, discoverOptedInAt: expect.any(Date)
    } });
  });
  it("clears Discover consent when deselected", async () => {
    await expect(saveHucknallMembershipAction(form(false))).rejects.toThrow("saved=1");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ showInDiscover: false, discoverOptedInAt: null }) }));
  });
  it("rejects out-of-area postcodes without changing membership", async () => {
    const data = form(); data.set("postcode", "NG16 1AA");
    await expect(saveHucknallMembershipAction(data)).rejects.toThrow("error=postcode");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects a card hidden by its owner's current allowance", async () => {
    mocks.allowed.mockResolvedValue(false);
    await expect(saveHucknallMembershipAction(form())).rejects.toThrow("error=card");
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
