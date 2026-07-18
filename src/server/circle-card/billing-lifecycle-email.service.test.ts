import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindUniqueMock = vi.hoisted(() => vi.fn());
const ledgerCreateMock = vi.hoisted(() => vi.fn());
const ledgerUpdateMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());
const logWarningMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: userFindUniqueMock },
    stripeWebhookEvent: {
      create: ledgerCreateMock,
      update: ledgerUpdateMock
    }
  }
}));
vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: sendEmailMock
}));
vi.mock("@/lib/security/logging", () => ({
  logServerWarning: logWarningMock
}));

import {
  sendCircleCardProActivatedEmail,
  sendCircleCardProCancellationScheduledEmail,
  sendCircleCardProPaymentFailedEmail,
  sendCircleCardProSubscriptionRestoredEmail
} from "@/server/circle-card/billing-lifecycle-email.service";

const activationDate = new Date("2026-07-18T09:00:00.000Z");
const billingDate = new Date("2026-08-18T09:00:00.000Z");

function base(evidenceId = "in_paid_1") {
  return {
    userId: "user-1",
    evidenceId,
    planName: "Circle Card Pro",
    monthlyPriceLabel: "£9.99 monthly"
  };
}

describe("Circle Card billing lifecycle email delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindUniqueMock.mockResolvedValue({
      email: "member@example.com",
      name: "Avery Member"
    });
    ledgerCreateMock.mockResolvedValue({ id: "ledger-1" });
    ledgerUpdateMock.mockResolvedValue({ id: "ledger-1" });
    sendEmailMock.mockResolvedValue({ sent: true, skipped: false, id: "email-1" });
  });

  it("uses the explicit Circle Card Resend identity and trusted canonical links", async () => {
    await sendCircleCardProActivatedEmail({
      ...base(),
      activationDate,
      billingDateLabel: "Renews on",
      billingDate
    });

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: "circle-card",
        to: "member@example.com",
        subject: "Your Circle Card Pro access is active",
        html: expect.stringContaining("https://circlecard.co.uk/app"),
        text: expect.stringContaining("https://circlecard.co.uk/app")
      })
    );
    const delivery = sendEmailMock.mock.calls[0][0];
    expect(delivery.html).not.toContain("https://thebusinesscircle.net");
    expect(delivery.text).toContain("not your official Stripe receipt");
    expect(JSON.stringify(delivery)).not.toContain("in_paid_1");
  });

  it("reserves a hashed durable ledger key before delivery", async () => {
    await sendCircleCardProPaymentFailedEmail({
      ...base("in_failed_secret"),
      failedAt: activationDate,
      retryDate: billingDate
    });

    expect(ledgerCreateMock).toHaveBeenCalledBefore(sendEmailMock);
    const ledgerId = ledgerCreateMock.mock.calls[0][0].data.id as string;
    expect(ledgerId).toMatch(/^circle-card-email:payment-failed:[a-f0-9]{64}$/);
    expect(ledgerId).not.toContain("in_failed_secret");
    expect(JSON.parse(ledgerCreateMock.mock.calls[0][0].data.lastError)).toEqual({
      code: "EMAIL_PENDING",
      brand: "circle-card",
      kind: "payment-failed",
      userId: "user-1",
      evidenceId: "in_failed_secret"
    });
  });

  it("durably records recipient lookup failure for controlled manual recovery", async () => {
    userFindUniqueMock.mockRejectedValue(new Error("synthetic database failure"));

    await expect(
      sendCircleCardProActivatedEmail({
        ...base("in_recipient_lookup_failed"),
        activationDate,
        billingDateLabel: "Renews on",
        billingDate
      })
    ).resolves.toEqual({ sent: false, duplicate: false });

    expect(ledgerCreateMock).toHaveBeenCalledBefore(userFindUniqueMock);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(JSON.parse(ledgerUpdateMock.mock.calls.at(-1)?.[0].data.lastError)).toEqual({
      code: "EMAIL_RECIPIENT_LOAD_FAILED",
      brand: "circle-card",
      kind: "pro-activated",
      userId: "user-1",
      evidenceId: "in_recipient_lookup_failed"
    });
    expect(JSON.stringify(logWarningMock.mock.calls)).not.toContain(
      "synthetic database failure"
    );
  });

  it("does not redeliver when a durable lifecycle reservation already exists", async () => {
    ledgerCreateMock.mockRejectedValue(Object.assign(new Error("duplicate"), { code: "P2002" }));

    await expect(
      sendCircleCardProCancellationScheduledEmail({
        ...base("sub_1:cancel_1"),
        cancellationScheduledAt: activationDate,
        accessEndsAt: billingDate
      })
    ).resolves.toEqual({ sent: false, duplicate: true });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("allows only one concurrent worker to reserve and send the same lifecycle email", async () => {
    ledgerCreateMock
      .mockResolvedValueOnce({ id: "ledger-1" })
      .mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: "P2002" }));
    const input = {
      ...base("in_concurrent"),
      activationDate,
      billingDateLabel: "Renews on" as const,
      billingDate
    };

    const results = await Promise.all([
      sendCircleCardProActivatedEmail(input),
      sendCircleCardProActivatedEmail(input)
    ]);

    expect(results).toContainEqual({ sent: true, duplicate: false });
    expect(results).toContainEqual({ sent: false, duplicate: true });
    expect(sendEmailMock).toHaveBeenCalledOnce();
  });

  it("namespaces invoice evidence by lifecycle purpose and away from Stripe event IDs", async () => {
    await sendCircleCardProActivatedEmail({
      ...base("in_shared"),
      activationDate,
      billingDateLabel: "Renews on",
      billingDate
    });
    await sendCircleCardProPaymentFailedEmail({
      ...base("in_shared"),
      failedAt: activationDate
    });

    const [activationId, failureId] = ledgerCreateMock.mock.calls.map(
      ([call]) => call.data.id as string
    );
    expect(activationId).toMatch(/^circle-card-email:pro-activated:/);
    expect(failureId).toMatch(/^circle-card-email:payment-failed:/);
    expect(activationId).not.toBe(failureId);
    expect(activationId).not.toMatch(/^evt_/);
    expect(failureId).not.toMatch(/^evt_/);
  });

  it("records delivery failure without throwing or reopening entitlement processing", async () => {
    sendEmailMock.mockResolvedValue({
      sent: false,
      skipped: false,
      reason: "synthetic delivery failure"
    });

    await expect(
      sendCircleCardProSubscriptionRestoredEmail({
        ...base("sub_1:restore_1"),
        restoredAt: activationDate,
        renewalDate: billingDate
      })
    ).resolves.toEqual({ sent: false, duplicate: false });

    expect(ledgerUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED"
        })
      })
    );
    const failedState = JSON.parse(
      ledgerUpdateMock.mock.calls.at(-1)?.[0].data.lastError as string
    );
    expect(failedState).toEqual({
      code: "EMAIL_DELIVERY_FAILED",
      brand: "circle-card",
      kind: "subscription-restored",
      userId: "user-1",
      evidenceId: "sub_1:restore_1"
    });
    expect(logWarningMock).toHaveBeenCalledWith(
      "circle-card-lifecycle-email-delivery-failed",
      { kind: "subscription-restored" }
    );
    expect(JSON.stringify(logWarningMock.mock.calls)).not.toContain(
      "synthetic delivery failure"
    );
  });
});
