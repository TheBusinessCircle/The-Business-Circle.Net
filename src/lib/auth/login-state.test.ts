import { describe, expect, it, vi, afterEach } from "vitest";
import { LOGIN_VERIFIED_NOTICE, parseLoginSearchParams } from "@/lib/auth/login-state";

describe("parseLoginSearchParams", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the verified notice for the supported redirect flag", () => {
    expect(parseLoginSearchParams({ verified: "1" })).toEqual({
      from: undefined,
      errorCode: undefined,
      errorDetailCode: undefined,
      initialNotice: LOGIN_VERIFIED_NOTICE
    });
  });

  it("drops empty or unsafe from values without throwing", () => {
    expect(parseLoginSearchParams({ from: "" }).from).toBeUndefined();
    expect(parseLoginSearchParams({ from: "https://evil.example/login" }).from).toBeUndefined();
    expect(parseLoginSearchParams({ from: "//dashboard" }).from).toBeUndefined();
  });

  it("uses the first value from repeated query params", () => {
    expect(
      parseLoginSearchParams({
        verified: ["1", "0"],
        error: ["invalid-verification", "CredentialsSignin"],
        code: ["database_unavailable", "ignored"],
        from: ["/dashboard?welcome=1", "/community"]
      })
    ).toEqual({
      from: "/dashboard?welcome=1",
      errorCode: "invalid-verification",
      errorDetailCode: "database_unavailable",
      initialNotice: LOGIN_VERIFIED_NOTICE
    });
  });

  it("logs and ignores malformed verified and from params", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const parsed = parseLoginSearchParams({
      verified: "true",
      from: "membership"
    });

    expect(parsed).toEqual({
      from: undefined,
      errorCode: undefined,
      errorDetailCode: undefined,
      initialNotice: undefined
    });
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
