import { InboundEmailStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  inboundEmail: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn()
  }
}));

const resendClientMock = vi.hoisted(() => ({
  webhooks: {
    verify: vi.fn()
  },
  emails: {
    receiving: {
      get: vi.fn(),
      forward: vi.fn()
    }
  }
}));

vi.mock("@/lib/db", () => ({
  db: dbMock
}));

vi.mock("@/lib/email/resend", () => ({
  getResendClient: vi.fn(() => resendClientMock),
  resolveTransactionalFromAddress: vi.fn(() => ({
    value: "The Business Circle Network <noreply@thebusinesscircle.net>",
    reason: null
  }))
}));

import {
  forwardInboundEmail,
  processResendInboundWebhookEvent,
  storeInboundEmailFromResend,
  verifyResendWebhookEvent
} from "@/server/inbound-email/inbound-email.service";

const receivedEvent = {
  type: "email.received",
  created_at: "2026-05-18T09:30:00.000Z",
  data: {
    email_id: "email_123",
    created_at: "2026-05-18T09:29:59.000Z",
    from: "Alex <alex@example.com>",
    to: ["contact@thebusinesscircle.net"],
    cc: [],
    bcc: [],
    subject: "Question about BCN",
    message_id: "<message-123>",
    attachments: []
  }
};

const storedEmail = {
  id: "inbound_1",
  resendEmailId: "email_123",
  status: InboundEmailStatus.UNREAD,
  forwardedAt: null
};

describe("inbound email service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_WEBHOOK_SECRET = "whsec_test";
    process.env.INBOUND_EMAIL_FORWARD_TO = "viberiseycdi@gmail.com";
    resendClientMock.webhooks.verify.mockReturnValue(receivedEvent);
    resendClientMock.emails.receiving.get.mockResolvedValue({
      data: {
        id: "email_123",
        to: ["contact@thebusinesscircle.net"],
        from: "Alex <alex@example.com>",
        created_at: "2026-05-18T09:29:59.000Z",
        subject: "Question about BCN",
        bcc: [],
        cc: [],
        html: "<p>Hello BCN</p>",
        text: "Hello BCN",
        message_id: "<message-123>",
        attachments: []
      },
      error: null
    });
    resendClientMock.emails.receiving.forward.mockResolvedValue({
      data: { id: "forwarded_1" },
      error: null
    });
  });

  it("verifies Resend webhook signatures with the raw payload and svix headers", () => {
    const event = verifyResendWebhookEvent("{\"type\":\"email.received\"}", {
      id: "msg_1",
      timestamp: "1716024600",
      signature: "v1,signature"
    });

    expect(event).toEqual(receivedEvent);
    expect(resendClientMock.webhooks.verify).toHaveBeenCalledWith({
      payload: "{\"type\":\"email.received\"}",
      headers: {
        id: "msg_1",
        timestamp: "1716024600",
        signature: "v1,signature"
      },
      webhookSecret: "whsec_test"
    });
  });

  it("stores an email.received event with body content from the Receiving API", async () => {
    dbMock.inboundEmail.findUnique.mockResolvedValue(null);
    dbMock.inboundEmail.create.mockResolvedValue(storedEmail);

    const result = await storeInboundEmailFromResend(receivedEvent);

    expect(result.created).toBe(true);
    expect(resendClientMock.emails.receiving.get).toHaveBeenCalledWith("email_123");
    expect(dbMock.inboundEmail.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resendEmailId: "email_123",
          from: "Alex <alex@example.com>",
          subject: "Question about BCN",
          textBody: "Hello BCN",
          htmlBody: "<p>Hello BCN</p>"
        })
      })
    );
  });

  it("handles duplicate resendEmailId deliveries without creating a second record", async () => {
    dbMock.inboundEmail.findUnique.mockResolvedValue(storedEmail);

    const result = await storeInboundEmailFromResend(receivedEvent);

    expect(result.created).toBe(false);
    expect(dbMock.inboundEmail.create).not.toHaveBeenCalled();
    expect(resendClientMock.emails.receiving.get).not.toHaveBeenCalled();
  });

  it("ignores unrelated webhook event types", async () => {
    const result = await processResendInboundWebhookEvent({ type: "email.sent", data: { email_id: "email_123" } });

    expect(result).toEqual({ ignored: true, created: false, forwarded: false });
    expect(dbMock.inboundEmail.create).not.toHaveBeenCalled();
  });

  it("forwards stored emails and updates forwardedAt on success", async () => {
    dbMock.inboundEmail.update.mockResolvedValue({});

    const result = await forwardInboundEmail("email_123", "inbound_1");

    expect(result.forwarded).toBe(true);
    expect(resendClientMock.emails.receiving.forward).toHaveBeenCalledWith({
      emailId: "email_123",
      to: "viberiseycdi@gmail.com",
      from: "The Business Circle Network <noreply@thebusinesscircle.net>"
    });
    expect(dbMock.inboundEmail.update).toHaveBeenCalledWith({
      where: { id: "inbound_1" },
      data: expect.objectContaining({
        forwardedTo: "viberiseycdi@gmail.com",
        forwardError: null
      })
    });
  });

  it("stores forward errors without failing email storage", async () => {
    dbMock.inboundEmail.findUnique.mockResolvedValue(null);
    dbMock.inboundEmail.create.mockResolvedValue(storedEmail);
    dbMock.inboundEmail.update.mockResolvedValue({});
    resendClientMock.emails.receiving.forward.mockResolvedValue({
      data: null,
      error: { message: "Forward failed" }
    });

    const result = await processResendInboundWebhookEvent(receivedEvent);

    expect(result).toEqual({ ignored: false, created: true, forwarded: false });
    expect(dbMock.inboundEmail.update).toHaveBeenCalledWith({
      where: { id: "inbound_1" },
      data: {
        forwardedTo: "viberiseycdi@gmail.com",
        forwardError: "Forward failed"
      }
    });
  });
});
