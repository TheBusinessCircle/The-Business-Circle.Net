import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findRequest: vi.fn(),
  findProvider: vi.fn(),
  update: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({
        bcnHelpRequest: {
          findUnique: mocks.findRequest,
          updateMany: mocks.update,
        },
        bcnProvider: { findUnique: mocks.findProvider },
        bcnHelpAudit: { create: mocks.audit },
      }),
  },
}));
import { moderateHelp, grantSharingConsent } from "./help";
const id = "cmr00000000000000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.update.mockResolvedValue({ count: 1 });
  mocks.audit.mockResolvedValue({});
  mocks.findProvider.mockResolvedValue({
    id: "cmr00000000000000000000002",
    approved: true,
    agreementReference: "signed-agreement",
  });
});
describe("moderated introductions", () => {
  it("does not introduce a request without named-provider permission", async () => {
    mocks.findRequest.mockResolvedValue({ id, status: "REVIEWED" });
    await expect(
      moderateHelp({ action: "introduce", id }, "admin"),
    ).rejects.toThrow("permission");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("requires review and an approved provider before proposing", async () => {
    mocks.findRequest.mockResolvedValue({ id, status: "RECEIVED" });
    await expect(
      moderateHelp(
        { action: "propose", id, providerId: id, agreedFeePence: 0 },
        "admin",
      ),
    ).rejects.toThrow("Review");
    mocks.findRequest.mockResolvedValue({ id, status: "REVIEWED" });
    mocks.findProvider.mockResolvedValue({ approved: false });
    await expect(
      moderateHelp(
        { action: "propose", id, providerId: id, agreedFeePence: 0 },
        "admin",
      ),
    ).rejects.toThrow("approved");
  });
  it("requires an agreement before attaching a fee", async () => {
    mocks.findRequest.mockResolvedValue({ id, status: "REVIEWED" });
    mocks.findProvider.mockResolvedValue({
      id,
      approved: true,
      agreementReference: null,
    });
    await expect(
      moderateHelp(
        { action: "propose", id, providerId: id, agreedFeePence: 100 },
        "admin",
      ),
    ).rejects.toThrow("agreement");
  });
  it("stores a hash and expiration, returning the secret only once for private delivery", async () => {
    mocks.findRequest.mockResolvedValue({ id, status: "REVIEWED" });
    const r = await moderateHelp(
      { action: "propose", id, providerId: id, agreedFeePence: 0 },
      "admin",
    );
    expect(r.consentPath).toMatch(/^\/help-consent\?token=[a-f0-9]{64}$/);
    const d = mocks.update.mock.calls[0][0].data;
    expect(d.consentTokenHash).toHaveLength(64);
    expect(r.consentPath).not.toContain(d.consentTokenHash);
    expect(d.status).toBe("AWAITING_CONSENT");
    expect(mocks.audit).toHaveBeenCalled();
  });
  it("rejects expired or already used consent tokens", async () => {
    mocks.findRequest.mockResolvedValue({
      id,
      status: "AWAITING_CONSENT",
      consentExpiresAt: new Date(0),
      provider: { approved: true },
    });
    await expect(grantSharingConsent("a".repeat(64), "agree")).rejects.toThrow(
      "expired",
    );
    mocks.findRequest.mockResolvedValue(null);
    await expect(
      grantSharingConsent("a".repeat(64), "agree"),
    ).rejects.toThrow();
  });
  it("records a decline without sharing and invalidates the token", async () => {
    mocks.findRequest.mockResolvedValue({
      id,
      status: "AWAITING_CONSENT",
      consentExpiresAt: new Date(Date.now() + 10000),
      provider: { approved: true },
    });
    await grantSharingConsent("a".repeat(64), "decline");
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({
      status: "REVIEWED",
      providerId: null,
      sharingConsentAt: null,
      consentTokenHash: null,
    });
  });
  it("rechecks provider approval before an introduction", async () => {
    mocks.findRequest.mockResolvedValue({
      id,
      status: "CONSENTED",
      sharingConsentAt: new Date(),
      providerId: id,
    });
    mocks.findProvider.mockResolvedValue({ approved: false });
    await expect(
      moderateHelp({ action: "introduce", id }, "admin"),
    ).rejects.toThrow("withdrawn");
  });
  it("fails when a concurrent moderation update won", async () => {
    mocks.findRequest.mockResolvedValue({ id, status: "RECEIVED" });
    mocks.update.mockResolvedValue({ count: 0 });
    await expect(
      moderateHelp({ action: "review", id }, "admin"),
    ).rejects.toThrow("changed");
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
