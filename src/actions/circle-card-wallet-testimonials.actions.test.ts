import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const consumeRateLimitMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  circleCard: { findFirst: vi.fn() },
  circleWalletContact: { findFirst: vi.fn() },
  circleCardWalletTestimonial: {
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/security/rate-limit", () => ({ consumeRateLimit: consumeRateLimitMock }));
vi.mock("@/server/circle-card", () => ({
  createCircleCardActivity: vi.fn(),
  createCircleCardNotification: vi.fn(),
  findBusinessCardCircleCardMatches: vi.fn(),
  findDuplicateBusinessCardWalletContact: vi.fn(),
  loadCircleCardAccessForUser: vi.fn().mockResolvedValue({
    hasProAccess: false,
    limits: { circleCards: 1, activeLinks: 5 },
    capabilities: {
      circleStudio: false,
      businessBuilder: false,
      creatorMediaKit: false,
      creatorAudienceSnapshot: false,
      expandedCreatorLimits: false
    }
  }),
  trackCircleCardEvent: vi.fn()
}));
vi.mock("@/server/circle-card/link-access.service", () => ({ hashCircleCardAccessCode: vi.fn() }));
vi.mock("@/server/circle-card/smart-profile-import.service", () => ({ scanCircleCardSmartImportUrls: vi.fn() }));

import {
  approveCircleCardWalletTestimonialAction,
  submitCircleCardWalletTestimonialAction
} from "@/actions/circle-card.actions";

const reviewerUserId = "cmreviewer000000000000001";
const targetOwnerId = "cmtargetowner000000000001";
const targetCardId = "cmtargetcard0000000000001";
const reviewerCardId = "cmreviewcard0000000000001";

function mockActionUser() {
  authMock.mockResolvedValue({ user: { id: reviewerUserId } });
  prismaMock.user.findUnique.mockResolvedValueOnce({
    id: reviewerUserId,
    role: "MEMBER",
    membershipTier: "FOUNDATION",
    suspended: false,
    subscription: null
  });
}

function testimonialForm() {
  const formData = new FormData();
  formData.set("targetCardId", targetCardId);
  formData.set("testimonialText", "A trusted and thoughtful collaborator.");
  formData.set("rating", "5");
  formData.set("relationship", "COLLABORATED");
  return formData;
}

describe("wallet testimonial actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActionUser();
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
  });

  it("creates a pending testimonial only through a saved wallet contact", async () => {
    prismaMock.circleWalletContact.findFirst.mockResolvedValue({
      id: "cmwalletcontact00000000001",
      card: { id: targetCardId, userId: targetOwnerId, slug: "target-business" }
    });
    prismaMock.circleCardWalletTestimonial.findFirst.mockResolvedValue(null);
    prismaMock.circleCard.findFirst.mockResolvedValue({
      id: reviewerCardId,
      slug: "reviewer",
      userId: reviewerUserId,
      fullName: "Reviewer Name",
      businessName: "Reviewer Studio"
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({ name: "Reviewer Name", email: "reviewer@example.com" });
    prismaMock.circleCardWalletTestimonial.create.mockResolvedValue({ id: "created" });

    const result = await submitCircleCardWalletTestimonialAction(testimonialForm());

    expect(result).toEqual({ ok: true, message: "Sent for approval." });
    expect(prismaMock.circleCardWalletTestimonial.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reviewerUserId,
        reviewerCardId,
        targetCardId,
        targetOwnerId,
        status: "PENDING",
        rating: 5,
        relationship: "COLLABORATED"
      })
    });
  });

  it("blocks a duplicate pending testimonial", async () => {
    prismaMock.circleWalletContact.findFirst.mockResolvedValue({
      id: "cmwalletcontact00000000001",
      card: { id: targetCardId, userId: targetOwnerId, slug: "target-business" }
    });
    prismaMock.circleCardWalletTestimonial.findFirst.mockResolvedValue({ id: "existing" });

    const result = await submitCircleCardWalletTestimonialAction(testimonialForm());

    expect(result).toMatchObject({ ok: false, error: "wallet-testimonial-pending-exists" });
    expect(prismaMock.circleCardWalletTestimonial.create).not.toHaveBeenCalled();
  });

  it("blocks testimonials when the target is not a saved eligible wallet contact", async () => {
    prismaMock.circleWalletContact.findFirst.mockResolvedValue(null);

    const result = await submitCircleCardWalletTestimonialAction(testimonialForm());

    expect(result).toMatchObject({
      ok: false,
      error: "wallet-testimonial-target-ineligible"
    });
    expect(prismaMock.circleCardWalletTestimonial.create).not.toHaveBeenCalled();
  });

  it("allows only the target owner to approve a pending testimonial", async () => {
    prismaMock.circleCardWalletTestimonial.findFirst.mockResolvedValue({
      id: "cmtestimonial000000000001",
      status: "PENDING",
      targetCard: { slug: "target-business", cardType: "BUSINESS" }
    });
    prismaMock.circleCardWalletTestimonial.updateMany.mockResolvedValue({ count: 1 });

    const result = await approveCircleCardWalletTestimonialAction({
      testimonialId: "cmtestimonial000000000001",
      targetCardId
    });

    expect(result).toMatchObject({ ok: true, status: "APPROVED" });
    expect(prismaMock.circleCardWalletTestimonial.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ targetOwnerId: reviewerUserId })
      })
    );
    expect(prismaMock.circleCardWalletTestimonial.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "APPROVED" }) })
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/card/target-business");
  });
});
