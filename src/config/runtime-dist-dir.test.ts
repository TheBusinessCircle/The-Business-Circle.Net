import { describe, expect, it } from "vitest";
import { resolveNextDistDir, RUNTIME_DIST_DIRS } from "@/config/runtime-dist-dir";

describe("runtime distribution directory", () => {
  it("keeps normal compilation on .next when no runtime directory is selected", () => {
    expect(resolveNextDistDir({ APP_BRAND: "bcn" })).toBe(".next");
  });

  it.each([
    ["bcn", ".runtime/bcn"],
    ["circle-card", ".runtime/circle-card"]
  ] as const)("selects the isolated %s runtime copy", (brand, distDir) => {
    expect(resolveNextDistDir({ APP_BRAND: brand, NEXT_RUNTIME_DIST_DIR: distDir }))
      .toBe(distDir);
    expect(RUNTIME_DIST_DIRS[brand]).toBe(distDir);
  });

  it("fails closed for a cross-brand or arbitrary runtime directory", () => {
    expect(() => resolveNextDistDir({
      APP_BRAND: "circle-card",
      NEXT_RUNTIME_DIST_DIR: ".runtime/bcn"
    })).toThrow("NEXT_RUNTIME_DIST_DIR must be .runtime/circle-card");
    expect(() => resolveNextDistDir({
      APP_BRAND: "bcn",
      NEXT_RUNTIME_DIST_DIR: "../../shared"
    })).toThrow("NEXT_RUNTIME_DIST_DIR must be .runtime/bcn");
  });

  it("does not permit a runtime directory without an explicit valid brand", () => {
    expect(() => resolveNextDistDir({ NEXT_RUNTIME_DIST_DIR: ".runtime/bcn" }))
      .toThrow("explicit valid APP_BRAND");
  });
});
