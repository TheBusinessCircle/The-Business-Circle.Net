import { afterEach, describe, expect, it } from "vitest";
import { resolveTransactionalRecipients, TransactionalEmailError } from "./resend";

const originalRedirectTo = process.env.RESEND_REDIRECT_TO;

afterEach(() => {
  if (originalRedirectTo === undefined) {
    delete process.env.RESEND_REDIRECT_TO;
  } else {
    process.env.RESEND_REDIRECT_TO = originalRedirectTo;
  }
});

describe("resolveTransactionalRecipients", () => {
  it("keeps the original recipient when no Resend redirect is configured", () => {
    delete process.env.RESEND_REDIRECT_TO;

    expect(resolveTransactionalRecipients("member@example.com")).toEqual({
      to: "member@example.com",
      redirected: false,
      originalTo: ["member@example.com"],
      redirectTo: []
    });
  });

  it("redirects outbound Resend email to the configured inbox", () => {
    process.env.RESEND_REDIRECT_TO = "viberiseycdi@gmail.com";

    expect(resolveTransactionalRecipients(["member@example.com", "founder@example.com"])).toEqual({
      to: "viberiseycdi@gmail.com",
      redirected: true,
      originalTo: ["member@example.com", "founder@example.com"],
      redirectTo: ["viberiseycdi@gmail.com"]
    });
  });

  it("supports multiple comma-separated redirect recipients", () => {
    process.env.RESEND_REDIRECT_TO = "first@example.com, second@example.com";

    expect(resolveTransactionalRecipients("member@example.com")).toMatchObject({
      to: ["first@example.com", "second@example.com"],
      redirected: true,
      redirectTo: ["first@example.com", "second@example.com"]
    });
  });

  it("rejects an empty configured redirect list", () => {
    process.env.RESEND_REDIRECT_TO = ",";

    expect(() => resolveTransactionalRecipients("member@example.com")).toThrow(
      TransactionalEmailError
    );
  });
});
