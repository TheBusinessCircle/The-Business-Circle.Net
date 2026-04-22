import { describe, expect, it, vi, afterEach } from "vitest";
import { DEFAULT_AUTH_ERROR_MESSAGE, resolveAuthErrorMessage } from "@/lib/auth/client";

describe("resolveAuthErrorMessage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns known detail-code messages before generic error codes", () => {
    expect(resolveAuthErrorMessage("CredentialsSignin", "invalid-verification")).toBe(
      "This verification link is invalid or has expired."
    );
  });

  it("returns a safe fallback for unknown codes", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(resolveAuthErrorMessage("anything-random")).toBe(DEFAULT_AUTH_ERROR_MESSAGE);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not walk the prototype chain for lookup keys", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(resolveAuthErrorMessage("__proto__")).toBe(DEFAULT_AUTH_ERROR_MESSAGE);
    expect(resolveAuthErrorMessage("constructor")).toBe(DEFAULT_AUTH_ERROR_MESSAGE);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("returns null when no auth error code is present", () => {
    expect(resolveAuthErrorMessage(undefined)).toBeNull();
  });
});
