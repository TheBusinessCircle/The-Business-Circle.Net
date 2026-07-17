import { describe, expect, it } from "vitest";
import {
  safeAuthenticationRedirectPath,
  safeRedirectPath
} from "@/lib/auth/utils";

describe("safeRedirectPath", () => {
  it("keeps a safe internal post-registration path", () => {
    expect(safeRedirectPath("/dashboard/circle-card/onboarding?step=profile#top")).toBe(
      "/dashboard/circle-card/onboarding?step=profile#top"
    );
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/\\evil.example/steal",
    "/%2f%2fevil.example/steal",
    "/%255c%255cevil.example/steal",
    "/%E0%A4%A",
    "javascript:alert(1)",
    "/dashboard\nSet-Cookie: unsafe=1"
  ])("rejects unsafe external or ambiguous redirect %s", (candidate) => {
    expect(safeRedirectPath(candidate, "/safe")).toBe("/safe");
  });

  it("rejects fragments only for authentication destinations", () => {
    expect(safeRedirectPath("/app#settings", "/safe")).toBe("/app#settings");
    expect(safeAuthenticationRedirectPath("/app#settings", "/safe")).toBe("/safe");
    expect(safeAuthenticationRedirectPath("/app?section=settings", "/safe")).toBe(
      "/app?section=settings"
    );
  });
});
