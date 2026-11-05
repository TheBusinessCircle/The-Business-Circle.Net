import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateUser: vi.fn()
}));
vi.mock("@/lib/session", () => ({
  requireCircleCardUser: vi.fn(async () => ({ user: { id: "owner" } }))
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/circle-card/upload.service", () => ({ removeOwnedCircleCardImageUpload: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    circleCard: { findFirst: mocks.findFirst, findUnique: mocks.findUnique, update: mocks.update },
    user: { update: mocks.updateUser }
  }
}));
import { publishFirstCircleCardAction, saveFirstCircleCardStepAction } from "@/actions/circle-card-onboarding.actions";

const business = {
  cardId: "business", cardType: "BUSINESS" as const, fullName: "Local Business",
  businessName: "Local Business", profileImageUrl: "/uploads/circle-card/example.jpg",
  tagline: "Helping local customers.", email: "hello@example.com", businessPostcode: "NG15 7AA"
};
describe("Business Discover save and publication", () => {
  beforeEach(() => {
    mocks.findFirst.mockResolvedValue({ id: "business", slug: "local-business", isPublished: false });
    mocks.findUnique.mockResolvedValue({
      ...business, businessLogoUrl: null, role: null, about: null, phone: null,
      websiteUrl: null, socialLinks: {}, isPublished: false, _count: { customLinks: 0 }
    });
    mocks.update.mockResolvedValue({ id: "business" });
    mocks.updateUser.mockResolvedValue({ id: "owner" });
  });
  it.each([true, false])("persists Discover=%s without publishing the draft", async (showInDiscover) => {
    expect(await saveFirstCircleCardStepAction({ ...business, showInDiscover })).toMatchObject({ ok: true, published: false });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ showInDiscover, discoverOptedInAt: null })
    }));
    expect(mocks.update.mock.calls.some(([arg]) => arg.data.isPublished === true)).toBe(false);
  });
  it("publishes a business with the selected Discover default", async () => {
    expect(await publishFirstCircleCardAction({ ...business, showInDiscover: true })).toMatchObject({ ok: true, published: true });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "business" }, data: {
      isPublished: true, showInDiscover: true, discoverOptedInAt: expect.any(Date)
    } });
  });
  it("honours an explicit off selection when publishing", async () => {
    await publishFirstCircleCardAction({ ...business, showInDiscover: false });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "business" }, data: {
      isPublished: true, showInDiscover: false, discoverOptedInAt: null
    } });
  });
  it("keeps missing input hidden rather than treating it as consent", async () => {
    await publishFirstCircleCardAction(business);
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "business" }, data: {
      isPublished: true, showInDiscover: false, discoverOptedInAt: null
    } });
  });
  it("refuses to change an already published card through onboarding", async () => {
    mocks.findFirst.mockResolvedValueOnce({ id: "business", slug: "local-business", isPublished: true });
    expect(await publishFirstCircleCardAction({ ...business, showInDiscover: true })).toMatchObject({ ok: false });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
