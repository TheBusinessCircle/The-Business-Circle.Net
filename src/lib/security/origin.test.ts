import { describe, expect, it } from "vitest";
import { isTrustedOrigin } from "@/lib/security/origin";

describe("isTrustedOrigin", () => {
  it("accepts a trusted origin header", () => {
    const request = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000"
      }
    });

    expect(isTrustedOrigin(request)).toBe(true);
  });

  it("falls back to a trusted referer when origin is absent", () => {
    const request = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        referer: "http://localhost:3000/membership"
      }
    });

    expect(isTrustedOrigin(request)).toBe(true);
  });

  it("rejects requests with no trusted origin signal", () => {
    const request = new Request("http://localhost:3000/api/contact", {
      method: "POST"
    });

    expect(isTrustedOrigin(request)).toBe(false);
  });

  it("rejects malformed origin headers", () => {
    const request = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        origin: "not-a-valid-origin"
      }
    });

    expect(isTrustedOrigin(request)).toBe(false);
  });
});
