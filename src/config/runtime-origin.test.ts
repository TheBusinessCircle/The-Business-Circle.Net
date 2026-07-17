import { describe, expect, it } from "vitest";
import {
  assertValidRuntimeOriginEnvironment,
  validateRuntimeOriginEnvironment,
  type RuntimeOriginEnvironment
} from "@/config/runtime-origin";

function productionEnvironment(
  overrides: Partial<RuntimeOriginEnvironment> = {}
): RuntimeOriginEnvironment {
  return {
    APP_BRAND: "bcn",
    APP_URL: "https://thebusinesscircle.net",
    AUTH_URL: undefined,
    NEXTAUTH_URL: "https://thebusinesscircle.net",
    NODE_ENV: "production",
    ...overrides
  };
}

describe("runtime origin validation", () => {
  it("accepts the unchanged BCN production configuration", () => {
    expect(validateRuntimeOriginEnvironment(productionEnvironment()).issues).toEqual([]);
  });

  it("accepts matching APP_URL, AUTH_URL and NEXTAUTH_URL values", () => {
    expect(
      validateRuntimeOriginEnvironment(
        productionEnvironment({ AUTH_URL: "https://thebusinesscircle.net" })
      ).issues
    ).toEqual([]);
  });

  it("normalizes a root trailing slash without weakening the canonical-origin check", () => {
    expect(
      validateRuntimeOriginEnvironment(
        productionEnvironment({
          APP_URL: " https://thebusinesscircle.net/ ",
          NEXTAUTH_URL: "https://thebusinesscircle.net/"
        })
      ).issues
    ).toEqual([]);
  });

  it("accepts Circle Card with the Auth.js-native AUTH_URL", () => {
    const validation = validateRuntimeOriginEnvironment(
      productionEnvironment({
        APP_BRAND: "circle-card",
        APP_URL: "https://circlecard.co.uk",
        AUTH_URL: "https://circlecard.co.uk",
        NEXTAUTH_URL: undefined
      })
    );

    expect(validation.issues).toEqual([]);
    expect(validation.brand?.key).toBe("circle-card");
  });

  it("rejects a Circle Card origin for the BCN runtime", () => {
    const validation = validateRuntimeOriginEnvironment(
      productionEnvironment({
        APP_URL: "https://circlecard.co.uk",
        NEXTAUTH_URL: "https://circlecard.co.uk"
      })
    );

    expect(validation.issues.map(({ code }) => code)).toContain("origin-brand-mismatch");
  });

  it("rejects a BCN origin for the Circle Card runtime", () => {
    const validation = validateRuntimeOriginEnvironment(
      productionEnvironment({ APP_BRAND: "circle-card" })
    );

    expect(validation.issues.map(({ code }) => code)).toContain("origin-brand-mismatch");
  });

  it("rejects conflicting Auth.js origin variables", () => {
    const validation = validateRuntimeOriginEnvironment(
      productionEnvironment({ AUTH_URL: "https://circlecard.co.uk" })
    );

    expect(validation.issues.map(({ code }) => code)).toContain("configured-url-mismatch");
  });

  it.each([
    "http://thebusinesscircle.net",
    "https://thebusinesscircle.net:444",
    "https://user:password@thebusinesscircle.net",
    "https://thebusinesscircle.net/path",
    "https://thebusinesscircle.net?query=1",
    "not-a-url"
  ])("rejects invalid or noncanonical production origin %s", (origin) => {
    const validation = validateRuntimeOriginEnvironment(
      productionEnvironment({ APP_URL: origin, NEXTAUTH_URL: origin })
    );

    expect(validation.issues.length).toBeGreaterThan(0);
  });

  it("requires APP_URL and at least one Auth.js URL in production", () => {
    const validation = validateRuntimeOriginEnvironment(
      productionEnvironment({ APP_URL: undefined, AUTH_URL: undefined, NEXTAUTH_URL: undefined })
    );

    expect(validation.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(["missing-app-url", "missing-auth-url"])
    );
  });

  it("does not permit local origins in production", () => {
    const validation = validateRuntimeOriginEnvironment(
      productionEnvironment({
        APP_URL: "http://localhost:3000",
        NEXTAUTH_URL: "http://localhost:3000"
      })
    );

    expect(validation.issues.map(({ code }) => code)).toContain("origin-brand-mismatch");
  });

  it("fails closed for an invalid APP_BRAND", () => {
    expect(() =>
      assertValidRuntimeOriginEnvironment(
        productionEnvironment({ APP_BRAND: "not-a-runtime-brand" })
      )
    ).toThrow("Invalid APP_BRAND value");
  });
});
