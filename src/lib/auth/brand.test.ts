import { describe, expect, it } from "vitest";
import {
  InvalidAuthenticationBrandError,
  buildAuthenticationUrl,
  getStoredUserAuthenticationBrand,
  requireAuthenticationBrand
} from "@/lib/auth/brand";

describe("authentication brand context", () => {
  it("resolves only the two allowlisted server brands", () => {
    expect(requireAuthenticationBrand("bcn").canonicalOrigin).toBe(
      "https://thebusinesscircle.net"
    );
    expect(requireAuthenticationBrand("circle-card").canonicalOrigin).toBe(
      "https://circlecard.co.uk"
    );
  });

  it.each([undefined, null, "", "BCN", " circle-card ", "attacker"])(
    "fails closed for missing or invalid explicit brand %s",
    (value) => {
      expect(() => requireAuthenticationBrand(value)).toThrow(
        InvalidAuthenticationBrandError
      );
    }
  );

  it("builds customer links only from the registry origin", () => {
    expect(
      buildAuthenticationUrl("circle-card", "/reset-password", {
        token: "synthetic"
      }).toString()
    ).toBe("https://circlecard.co.uk/reset-password?token=synthetic");
    expect(buildAuthenticationUrl("bcn", "/login").toString()).toBe(
      "https://thebusinesscircle.net/login"
    );
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil", "login"])(
    "rejects unsafe authentication URL path %s",
    (path) => {
      expect(() => buildAuthenticationUrl("circle-card", path)).toThrow();
    }
  );

  it("resolves stored Circle Card registration sources through a closed allowlist", () => {
    expect(getStoredUserAuthenticationBrand("circle-card").key).toBe("circle-card");
    expect(getStoredUserAuthenticationBrand("circle-card-spin").key).toBe("circle-card");
    expect(getStoredUserAuthenticationBrand("bcn-join").key).toBe("bcn");
    expect(getStoredUserAuthenticationBrand("attacker-selected-brand").key).toBe("bcn");
    expect(getStoredUserAuthenticationBrand(null).key).toBe("bcn");
  });
});
