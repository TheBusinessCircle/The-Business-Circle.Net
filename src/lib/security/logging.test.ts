import { afterEach, describe, expect, it, vi } from "vitest";
import { logServerError } from "@/lib/security/logging";

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
});
