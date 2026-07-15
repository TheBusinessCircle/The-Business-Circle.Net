import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { safeAuthLogger } from "@/lib/auth/logger";

describe("Auth.js safe logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not forward callback, cookie, path or malformed-body values", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const debugSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const token = "0123456789abcdef".repeat(4);
    const callbackCanary = `https://thebusinesscircle.net/api/auth/callback/credentials?callbackUrl=${encodeURIComponent(`/invite/PRIVATE-CALLBACK-CODE`)}&token=${token}`;
    const cookieCanary = `authjs.session-token=${token}`;
    const malformedPathCanary = "/api/auth/%PRIVATE-PATH-CANARY";
    const malformedBodyCanary = "BODY8CANARY";
    const supplied = new Error(
      `${callbackCanary} ${cookieCanary} ${malformedPathCanary} ${malformedBodyCanary} private.person@example.test`,
      {
        cause: new Error(`cause ${callbackCanary} ${malformedBodyCanary}`)
      }
    );
    supplied.name = "PRIVATE-ERROR-CANARY";
    supplied.stack = `PRIVATE-STACK-CANARY ${callbackCanary}`;

    safeAuthLogger.error(supplied);
    safeAuthLogger.warn(malformedBodyCanary as never);
    safeAuthLogger.debug(callbackCanary, {
      cookie: cookieCanary,
      body: malformedBodyCanary
    });

    const rendered = JSON.stringify([
      errorSpy.mock.calls,
      warnSpy.mock.calls,
      debugSpy.mock.calls
    ]);
    for (const secret of [
      token,
      callbackCanary,
      cookieCanary,
      "PRIVATE-CALLBACK-CODE",
      malformedPathCanary,
      malformedBodyCanary,
      "private.person@example.test",
      "PRIVATE-ERROR-CANARY",
      "PRIVATE-STACK-CANARY"
    ]) {
      expect(rendered).not.toContain(secret);
    }
    expect(rendered).toContain("auth-request-failed");
    expect(rendered).toContain("auth-runtime-warning");
  });

  it("overrides the Auth.js logger in the production config", () => {
    const configSource = readFileSync(resolve(process.cwd(), "src/lib/auth/config.ts"), "utf8");

    expect(configSource).toContain('import { safeAuthLogger } from "@/lib/auth/logger"');
    expect(configSource).toMatch(/logger:\s*safeAuthLogger/);
    expect(Object.keys(safeAuthLogger).sort()).toEqual(["debug", "error", "warn"]);
  });
});
