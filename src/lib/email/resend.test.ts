import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn()
}));

vi.mock("resend", () => ({
  Resend: class {
    emails: { send: (payload: unknown) => unknown };

    constructor(apiKey: string) {
      this.emails = {
        send: (payload) => mocks.send(apiKey, payload)
      };
    }
  }
}));

import {
  TransactionalEmailError,
  sendTransactionalEmail,
  sendTransactionalEmailOrThrow
} from "@/lib/email/resend";

describe("brand-aware Resend transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_safe_bcn_test_key");
    vi.stubEnv("CIRCLE_CARD_RESEND_API_KEY", "re_safe_circle_card_test_key");
    vi.stubEnv(
      "RESEND_FROM_EMAIL",
      "The Business Circle Network <noreply@thebusinesscircle.net>"
    );
    vi.stubEnv("RESEND_REPLY_TO_EMAIL", "hello@thebusinesscircle.net");
    vi.stubEnv("PUBLIC_CONTACT_EMAIL", "contact@thebusinesscircle.net");
    vi.stubEnv(
      "CIRCLE_CARD_RESEND_FROM_EMAIL",
      "Circle Card <noreply@circlecard.co.uk>"
    );
    vi.stubEnv("CIRCLE_CARD_RESEND_REPLY_TO_EMAIL", "support@circlecard.co.uk");
    vi.stubEnv("CIRCLE_CARD_PUBLIC_CONTACT_EMAIL", "support@circlecard.co.uk");
    mocks.send.mockResolvedValue({ data: { id: "message-1" }, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("selects the existing BCN API key and identity independently of runtime brand", async () => {
    vi.stubEnv("APP_BRAND", "circle-card");

    await sendTransactionalEmailOrThrow({
      brand: "bcn",
      to: "member@example.com",
      subject: "BCN test",
      text: "BCN body"
    });

    expect(mocks.send).toHaveBeenCalledWith(
      "re_safe_bcn_test_key",
      expect.objectContaining({
        from: "The Business Circle Network <noreply@thebusinesscircle.net>",
        replyTo: "hello@thebusinesscircle.net"
      })
    );
  });

  it("selects Circle Card identity even inside a BCN runtime", async () => {
    vi.stubEnv("APP_BRAND", "bcn");

    await sendTransactionalEmailOrThrow({
      brand: "circle-card",
      to: "member@example.com",
      subject: "Circle Card scheduled message",
      text: "Circle Card body"
    });

    expect(mocks.send).toHaveBeenCalledWith(
      "re_safe_circle_card_test_key",
      expect.objectContaining({
        from: "Circle Card <noreply@circlecard.co.uk>",
        replyTo: "support@circlecard.co.uk"
      })
    );
  });

  it("fails before delivery when Circle Card production sender is missing", async () => {
    delete process.env.CIRCLE_CARD_RESEND_FROM_EMAIL;

    await expect(
      sendTransactionalEmailOrThrow({
        brand: "circle-card",
        to: "member@example.com",
        subject: "Blocked",
        text: "Must not send"
      })
    ).rejects.toMatchObject({
      code: "EMAIL_BRAND_CONFIGURATION_MISSING"
    } satisfies Partial<TransactionalEmailError>);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("never falls back to the BCN API key when the Circle Card API key is missing", async () => {
    delete process.env.CIRCLE_CARD_RESEND_API_KEY;

    await expect(
      sendTransactionalEmailOrThrow({
        brand: "circle-card",
        to: "member@example.com",
        subject: "Blocked",
        text: "Must not send"
      })
    ).rejects.toMatchObject({
      code: "EMAIL_BRAND_API_KEY_MISSING",
      message: "CIRCLE_CARD_RESEND_API_KEY is not configured."
    });
    expect(mocks.send).not.toHaveBeenCalled();

    const result = await sendTransactionalEmail({
      brand: "circle-card",
      to: "member@example.com",
      subject: "Blocked result",
      text: "Must not send"
    });
    expect(result).toMatchObject({
      sent: false,
      skipped: false,
      reason: "CIRCLE_CARD_RESEND_API_KEY is not configured."
    });
  });

  it("rejects production API-key reuse before creating a delivery attempt", async () => {
    vi.stubEnv("CIRCLE_CARD_RESEND_API_KEY", "re_safe_bcn_test_key");

    for (const brand of ["bcn", "circle-card"] as const) {
      await expect(
        sendTransactionalEmailOrThrow({
          brand,
          to: "member@example.com",
          subject: "Blocked reuse",
          text: "Must not send"
        })
      ).rejects.toMatchObject({ code: "EMAIL_BRAND_API_KEY_REUSED" });
    }
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("refreshes only the selected cached client when an environment key changes", async () => {
    await sendTransactionalEmailOrThrow({
      brand: "circle-card",
      to: "member@example.com",
      subject: "First Circle Card send",
      text: "Body"
    });

    vi.stubEnv("CIRCLE_CARD_RESEND_API_KEY", "re_safe_rotated_circle_card_key");
    await sendTransactionalEmailOrThrow({
      brand: "circle-card",
      to: "member@example.com",
      subject: "Second Circle Card send",
      text: "Body"
    });
    await sendTransactionalEmailOrThrow({
      brand: "bcn",
      to: "member@example.com",
      subject: "BCN remains isolated",
      text: "Body"
    });

    expect(mocks.send.mock.calls.map(([apiKey]) => apiKey)).toEqual([
      "re_safe_circle_card_test_key",
      "re_safe_rotated_circle_card_key",
      "re_safe_bcn_test_key"
    ]);
  });

  it("rejects header injection in a user-derived subject", async () => {
    await expect(
      sendTransactionalEmailOrThrow({
        brand: "bcn",
        to: "member@example.com",
        subject: "New lead\r\nBcc: attacker@example.com",
        text: "Body"
      })
    ).rejects.toMatchObject({ code: "EMAIL_SUBJECT_INVALID" });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects a browser-supplied unknown brand before delivery", async () => {
    await expect(
      sendTransactionalEmailOrThrow({
        brand: "attacker-selected" as "bcn",
        to: "member@example.com",
        subject: "Blocked",
        text: "Must not send"
      })
    ).rejects.toMatchObject({ code: "EMAIL_BRAND_INVALID" });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("ignores forged browser sender and reply-to fields", async () => {
    await sendTransactionalEmailOrThrow({
      brand: "circle-card",
      to: "member@example.com",
      subject: "Safe identity",
      text: "Body",
      from: "Attacker <attacker@example.com>",
      replyTo: "attacker@example.com"
    } as Parameters<typeof sendTransactionalEmailOrThrow>[0] & {
      from: string;
      replyTo: string;
    });

    expect(mocks.send).toHaveBeenCalledWith(
      "re_safe_circle_card_test_key",
      expect.objectContaining({
        from: "Circle Card <noreply@circlecard.co.uk>",
        replyTo: "support@circlecard.co.uk"
      })
    );
  });
});
