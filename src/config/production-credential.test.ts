import { describe, expect, it } from "vitest";
import { isProductionCredential } from "@/config/production-credential";

describe("production credential shape validation", () => {
  it("accepts opaque values with the expected production prefix", () => {
    expect(isProductionCredential(`re_${"a".repeat(32)}`, "re_"))
      .toBe(true);
    expect(isProductionCredential(`sk_live_${"b".repeat(32)}`, "sk_live_"))
      .toBe(true);
  });

  it.each([
    ["re_...", "re_"],
    ["re_test_dual_runtime_smoke", "re_"],
    ["re_example_not_a_secret_value", "re_"],
    [`sk_test_${"c".repeat(32)}`, "sk_live_"],
    ["whsec_placeholder_not_a_secret", "whsec_"],
    ["whsec_abc\ndefghijklmnopqrstuvwxyz", "whsec_"]
  ])("rejects placeholder or malformed value %s", (value, prefix) => {
    expect(isProductionCredential(value, prefix)).toBe(false);
  });
});
