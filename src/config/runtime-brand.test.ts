import { describe, expect, it } from "vitest";
import {
  getRuntimeBrand,
  InvalidRuntimeBrandError,
  RUNTIME_BRANDS
} from "@/config/runtime-brand";

describe("runtime brand registry", () => {
  it("defaults safely to BCN when APP_BRAND is absent", () => {
    expect(getRuntimeBrand({ APP_BRAND: undefined })).toBe(RUNTIME_BRANDS.bcn);
  });

  it("resolves an explicit BCN runtime", () => {
    expect(getRuntimeBrand({ APP_BRAND: "bcn" })).toMatchObject({
      key: "bcn",
      canonicalOrigin: "https://thebusinesscircle.net",
      canonicalHostname: "thebusinesscircle.net",
      wwwHostnamePolicy: {
        hostname: "www.thebusinesscircle.net",
        behavior: "redirect-to-canonical"
      }
    });
  });

  it("resolves an explicit Circle Card runtime", () => {
    expect(getRuntimeBrand({ APP_BRAND: "circle-card" })).toMatchObject({
      key: "circle-card",
      canonicalOrigin: "https://circlecard.co.uk",
      canonicalHostname: "circlecard.co.uk",
      wwwHostnamePolicy: {
        hostname: "www.circlecard.co.uk",
        behavior: "redirect-to-canonical"
      }
    });
  });

  it("normalizes surrounding whitespace and casing deterministically", () => {
    expect(getRuntimeBrand({ APP_BRAND: "  BCN  " }).key).toBe("bcn");
    expect(getRuntimeBrand({ APP_BRAND: "  CIRCLE-CARD  " }).key).toBe("circle-card");
  });

  it("does not treat an explicit blank APP_BRAND as absent", () => {
    expect(() => getRuntimeBrand({ APP_BRAND: "   " })).toThrow(InvalidRuntimeBrandError);
  });

  it("fails closed for an unknown APP_BRAND", () => {
    expect(() => getRuntimeBrand({ APP_BRAND: "unknown-brand" })).toThrow(
      InvalidRuntimeBrandError
    );
  });
});
