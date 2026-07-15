import { afterEach, describe, expect, it, vi } from "vitest";
import { logServerError, logServerInfo, logServerWarning } from "@/lib/security/logging";

describe("safe server logging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts billing secrets and private payment details", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const stripeKey = ["sk", "live", "secret123"].join("_");
    const webhookSecret = ["whsec", "secret123"].join("_");
    const error = new Error(
      `member@example.com ${stripeKey} ${webhookSecret} pm_123456789 4242 4242 4242 4242`
    );

    logServerError("stripe-operation-failed", error);

    const rendered = JSON.stringify(errorSpy.mock.calls);
    expect(rendered).not.toContain("member@example.com");
    expect(rendered).not.toContain(stripeKey);
    expect(rendered).not.toContain(webhookSecret);
    expect(rendered).not.toContain("pm_123456789");
    expect(rendered).not.toContain("4242 4242 4242 4242");
    expect(rendered).toContain("[redacted email]");
    expect(rendered).toContain("[redacted Stripe key]");
  });

  it.each([
    ["info", logServerInfo, "info"],
    ["warning", logServerWarning, "warn"],
    ["error", (event: string, details: Record<string, string>) => logServerError(event, new Error(details.reason), details), "error"]
  ] as const)("redacts authentication secrets and addresses from %s details", (_label, logger, consoleMethod) => {
    const spy = vi.spyOn(console, consoleMethod).mockImplementation(() => undefined);
    const rawToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const verificationUrl = `https://thebusinesscircle.net/api/auth/verify-email?uid=user-1&token=${rawToken}`;
    const inviteUrl = "https://thebusinesscircle.net/invite/PRIVATE-INVITE-CODE";
    const relativeInviteUrl = "/invite/RELATIVE-PRIVATE-INVITE";
    const joinInviteUrl = "/join?invite=QUERY-PRIVATE-INVITE";
    const referralInviteUrl = "/membership?referralCode=REFERRAL-PRIVATE-INVITE";

    if (consoleMethod === "error") {
      (logger as (event: string, details: Record<string, string>) => void)("auth-log-test", {
        email: "private.person@example.com",
        token: rawToken,
        verificationUrl,
        inviteLink: inviteUrl,
        referralCode: "DETAIL-PRIVATE-INVITE",
        reason: `${verificationUrl} ${relativeInviteUrl} ${joinInviteUrl} ${referralInviteUrl} private.person@example.com`
      });
    } else {
      (logger as typeof logServerInfo)("auth-log-test", {
        email: "private.person@example.com",
        token: rawToken,
        verificationUrl,
        inviteLink: inviteUrl,
        referralCode: "DETAIL-PRIVATE-INVITE",
        reason: `${verificationUrl} ${relativeInviteUrl} ${joinInviteUrl} ${referralInviteUrl} private.person@example.com`
      });
    }

    const rendered = JSON.stringify(spy.mock.calls);
    expect(rendered).not.toContain(rawToken);
    expect(rendered).not.toContain(verificationUrl);
    expect(rendered).not.toContain(inviteUrl);
    expect(rendered).not.toContain("RELATIVE-PRIVATE-INVITE");
    expect(rendered).not.toContain("QUERY-PRIVATE-INVITE");
    expect(rendered).not.toContain("REFERRAL-PRIVATE-INVITE");
    expect(rendered).not.toContain("DETAIL-PRIVATE-INVITE");
    expect(rendered).not.toContain("private.person@example.com");
    expect(rendered).toContain("[redacted");
  });
});
