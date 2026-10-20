import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  request: vi.fn(),
  offer: vi.fn(),
  block: vi.fn(),
  updateRequest: vi.fn(),
  updateOffer: vi.fn(),
  audit: vi.fn(),
  createMessage: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({
        user: { findUnique: mocks.actor },
        bcnIdeaRequest: {
          findUnique: mocks.request,
          update: mocks.updateRequest,
        },
        bcnIdeaOffer: { findUnique: mocks.offer, update: mocks.updateOffer },
        directMessageBlock: { findFirst: mocks.block },
        bcnIdeaAudit: { create: mocks.audit },
        directMessage: { create: mocks.createMessage },
      }),
  },
}));
import { executeIdeaCommand } from "./ideas";
const id = "cmr00000000000000000000001";
const actor = {
  id,
  role: "MEMBER",
  suspended: false,
  emailVerified: new Date(),
  acceptedRulesAt: new Date(),
};
const request = {
  id,
  ownerId: id,
  status: "APPROVED",
  supportTypes: ["FREE"],
  expiresAt: new Date(Date.now() + 86400000),
  title: "A practical business request",
};
const offer = {
  id,
  helperId: "cmr00000000000000000000002",
  requestId: id,
  status: "APPROVED",
  threadId: null,
  request,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.actor.mockResolvedValue(actor);
  mocks.request.mockResolvedValue(request);
  mocks.offer.mockResolvedValue(offer);
  mocks.block.mockResolvedValue(null);
  mocks.audit.mockResolvedValue({});
});
describe("practical help authorization and consent", () => {
  it.each([
    null,
    { ...actor, suspended: true },
    { ...actor, emailVerified: null },
  ])("requires an active verified account", async (user) => {
    mocks.actor.mockResolvedValue(user);
    await expect(
      executeIdeaCommand({ action: "accept", offerId: id }, id),
    ).rejects.toThrow("verified");
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });
  it("requires acceptance of the BCN rules before opening chat", async () => {
    mocks.actor.mockResolvedValue({ ...actor, acceptedRulesAt: null });
    await expect(
      executeIdeaCommand({ action: "accept", offerId: id }, id),
    ).rejects.toThrow("rules");
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });
  it("does not let an owner approve their own public request", async () => {
    await expect(
      executeIdeaCommand(
        {
          action: "moderate",
          entity: "request",
          id,
          decision: "approve",
          note: "A relevant request.",
        },
        id,
      ),
    ).rejects.toThrow("Administrator");
    expect(mocks.updateRequest).not.toHaveBeenCalled();
  });
  it("does not let another owner choose a private offer", async () => {
    mocks.offer.mockResolvedValue({
      ...offer,
      request: { ...request, ownerId: "other" },
    });
    await expect(
      executeIdeaCommand({ action: "accept", offerId: id }, id),
    ).rejects.toThrow("unavailable");
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });
  it("cannot open a chat from an unreviewed offer", async () => {
    mocks.offer.mockResolvedValue({ ...offer, status: "PENDING" });
    await expect(
      executeIdeaCommand({ action: "accept", offerId: id }, id),
    ).rejects.toThrow("reviewed");
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });
  it("cannot choose an expired request", async () => {
    mocks.offer.mockResolvedValue({
      ...offer,
      request: { ...request, expiresAt: new Date(0) },
    });
    await expect(
      executeIdeaCommand({ action: "accept", offerId: id }, id),
    ).rejects.toThrow("open request");
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });
  it("rechecks helper availability before opening a conversation", async () => {
    mocks.actor
      .mockResolvedValueOnce(actor)
      .mockResolvedValueOnce({ ...actor, suspended: true });
    await expect(
      executeIdeaCommand({ action: "accept", offerId: id }, id),
    ).rejects.toThrow("unavailable");
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });
  it("respects a block even after an offer has been reviewed", async () => {
    mocks.block.mockResolvedValue({ id: "block" });
    await expect(
      executeIdeaCommand({ action: "accept", offerId: id }, id),
    ).rejects.toThrow("cannot be opened");
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });
  it("does not duplicate a conversation when the owner repeats acceptance", async () => {
    mocks.offer.mockResolvedValue({
      ...offer,
      status: "ACCEPTED",
      threadId: "existing-thread",
    });
    await expect(
      executeIdeaCommand({ action: "accept", offerId: id }, id),
    ).resolves.toMatchObject({ threadId: "existing-thread" });
    expect(mocks.createMessage).not.toHaveBeenCalled();
    expect(mocks.updateOffer).not.toHaveBeenCalled();
  });
  it("records owner-reported progress as a private outcome", async () => {
    mocks.request.mockResolvedValue({ ...request, status: "MATCHED" });
    await executeIdeaCommand(
      {
        action: "complete",
        id,
        outcome:
          "We tested the first prototype and agreed a useful improvement.",
      },
      id,
    );
    expect(mocks.updateRequest).toHaveBeenCalledWith({
      where: { id },
      data: { status: "COMPLETED" },
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "request.owner-reported-progress",
          actorId: id,
        }),
      }),
    );
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });
  it("does not overwrite a completed outcome when the owner closes discovery", async () => {
    mocks.request.mockResolvedValue({ ...request, status: "COMPLETED" });
    await executeIdeaCommand({ action: "close", id }, id);
    expect(mocks.updateRequest).not.toHaveBeenCalled();
  });
});
