import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/auth/utils";

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
    "javascript:alert(1)",
    "/dashboard\nSet-Cookie: unsafe=1"
  ])("rejects unsafe external or ambiguous redirect %s", (candidate) => {
    expect(safeRedirectPath(candidate, "/safe")).toBe("/safe");
  });
});
