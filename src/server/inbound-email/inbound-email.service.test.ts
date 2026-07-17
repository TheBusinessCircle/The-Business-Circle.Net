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

const sendTransactionalEmailOrThrowMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: dbMock
}));

vi.mock("@/lib/email/resend", () => ({
  getResendClient: vi.fn(() => resendClientMock),
  resolveTransactionalFromAddress: vi.fn(() => ({
    value: "The Business Circle Network <noreply@thebusinesscircle.net>",
    reason: null
  })),
  sendTransactionalEmailOrThrow: sendTransactionalEmailOrThrowMock
}));

import {
  forwardInboundEmail,
  processResendInboundWebhookEvent,
  replyToInboundEmailForAdmin,
  storeContactSubmissionInInboundInbox,
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
    process.env.PUBLIC_CONTACT_EMAIL = "contact@thebusinesscircle.net";
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
    sendTransactionalEmailOrThrowMock.mockResolvedValue({ id: "reply_1" });
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
        forwardError: "Inbound email forwarding failed."
      }
    });
  });

  it("does not log or persist provider errors containing email addresses or secrets", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const token = "0123456789abcdef".repeat(4);
    const providerError = `Forward for private.sender@example.test failed: ${token}`;
    dbMock.inboundEmail.findUnique.mockResolvedValue(null);
    dbMock.inboundEmail.create.mockResolvedValue(storedEmail);
    dbMock.inboundEmail.update.mockResolvedValue({});
    resendClientMock.emails.receiving.forward.mockRejectedValue(new Error(providerError));

    const result = await processResendInboundWebhookEvent(receivedEvent);

    expect(result).toEqual({ ignored: false, created: true, forwarded: false });
    expect(dbMock.inboundEmail.update).toHaveBeenCalledWith({
      where: { id: "inbound_1" },
      data: {
        forwardedTo: "viberiseycdi@gmail.com",
        forwardError: "Inbound email forwarding failed."
      }
    });
    const rendered = JSON.stringify(errorSpy.mock.calls);
    expect(rendered).not.toContain("private.sender@example.test");
    expect(rendered).not.toContain(token);
    expect(rendered).not.toContain(providerError);
    expect(rendered).toContain("resend-inbound-forward-failed");
  });

  it("mirrors contact form submissions into the admin inbox", async () => {
    dbMock.inboundEmail.create.mockResolvedValue({
      ...storedEmail,
      resendEmailId: "contact-submission:contact_1"
    });

    await storeContactSubmissionInInboundInbox({
      submissionId: "contact_1",
      name: "Casey Founder",
      email: "casey@example.com",
      company: "Casey Co",
      subject: "Partnership",
      message: "Could we discuss partnership options?",
      sourcePath: "/contact",
      source: "website",
      createdAt: new Date("2026-05-19T10:00:00.000Z"),
      memberContextLines: ["Membership tier: CORE"]
    });

    expect(dbMock.inboundEmail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resendEmailId: "contact-submission:contact_1",
        messageId: "contact-submission:contact_1",
        from: "Casey Founder <casey@example.com>",
        to: ["contact@thebusinesscircle.net"],
        subject: "Partnership",
        textBody: expect.stringContaining("Could we discuss partnership options?"),
        receivedAt: new Date("2026-05-19T10:00:00.000Z")
      })
    });
  });

  it("sends direct admin replies and records the latest reply state", async () => {
    dbMock.inboundEmail.findUnique.mockResolvedValue({
      id: "inbound_1",
      resendEmailId: "contact-submission:contact_1",
      from: "Alex <alex@example.com>",
      subject: "Question about BCN"
    });
    dbMock.inboundEmail.update.mockResolvedValue({});

    const result = await replyToInboundEmailForAdmin("inbound_1", {
      subject: "Re: Question about BCN",
      message: "Thanks Alex, here is the next step.",
      adminName: "BCN Admin",
      adminEmail: "admin@example.com"
    });

    expect(result.sent).toBe(true);
    expect(sendTransactionalEmailOrThrowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alex@example.com",
        brand: "bcn",
        subject: "Re: Question about BCN",
        text: expect.stringContaining("Thanks Alex, here is the next step."),
        html: expect.stringContaining("A reply from The Business Circle Network"),
        tags: [
          { name: "type", value: "admin-inbound-reply" },
          { name: "source", value: "contact-form" }
        ]
      })
    );
    expect(sendTransactionalEmailOrThrowMock.mock.calls[0]?.[0]).not.toHaveProperty(
      "replyTo"
    );
    expect(dbMock.inboundEmail.update).toHaveBeenCalledWith({
      where: { id: "inbound_1" },
      data: expect.objectContaining({
        status: InboundEmailStatus.READ,
        lastReplyTo: "alex@example.com",
        lastReplySubject: "Re: Question about BCN",
        lastReplyBody: "Thanks Alex, here is the next step.",
        lastReplyError: null
      })
    });
  });
});
