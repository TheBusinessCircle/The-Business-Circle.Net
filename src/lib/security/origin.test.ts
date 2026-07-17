import { afterEach, describe, expect, it } from "vitest";
import { isTrustedOrigin } from "@/lib/security/origin";

const originalEnvironment = {
  APP_BRAND: process.env.APP_BRAND,
  APP_URL: process.env.APP_URL,
  AUTH_URL: process.env.AUTH_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NODE_ENV: process.env.NODE_ENV
};

function setNodeEnv(value: string) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

function restoreEnvironmentValue(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

function setRuntime(brand: "bcn" | "circle-card") {
  const origin =
    brand === "bcn" ? "https://thebusinesscircle.net" : "https://circlecard.co.uk";

  setNodeEnv("production");
  process.env.APP_BRAND = brand;
  process.env.APP_URL = origin;
  process.env.AUTH_URL = origin;
  process.env.NEXTAUTH_URL = "";
}

function productionRequest(
  requestUrl: string,
  host: string,
  headers: Record<string, string> = {}
) {
  return new Request(requestUrl, {
    method: "POST",
    headers: { host, ...headers }
  });
}

describe("isTrustedOrigin", () => {
  afterEach(() => {
    restoreEnvironmentValue("APP_BRAND", originalEnvironment.APP_BRAND);
    restoreEnvironmentValue("APP_URL", originalEnvironment.APP_URL);
    restoreEnvironmentValue("AUTH_URL", originalEnvironment.AUTH_URL);
    restoreEnvironmentValue("NEXTAUTH_URL", originalEnvironment.NEXTAUTH_URL);
    setNodeEnv(originalEnvironment.NODE_ENV ?? "test");
  });

  it("accepts a same-brand BCN origin", () => {
    setRuntime("bcn");
    const request = productionRequest(
      "https://thebusinesscircle.net/api/contact",
      "thebusinesscircle.net",
      { origin: "https://thebusinesscircle.net" }
    );

    expect(isTrustedOrigin(request)).toBe(true);
  });

  it("accepts a same-brand Circle Card origin", () => {
    setRuntime("circle-card");
    const request = productionRequest(
      "https://circlecard.co.uk/api/contact",
      "circlecard.co.uk",
      { origin: "https://circlecard.co.uk" }
    );

    expect(isTrustedOrigin(request)).toBe(true);
  });

  it("rejects a cross-brand origin", () => {
    setRuntime("bcn");
    const request = productionRequest(
      "https://thebusinesscircle.net/api/contact",
      "thebusinesscircle.net",
      { origin: "https://circlecard.co.uk" }
    );

    expect(isTrustedOrigin(request)).toBe(false);
  });

  it("does not treat the request URL as automatic proof of trust", () => {
    setRuntime("bcn");
    const request = productionRequest(
      "https://attacker.example/api/contact",
      "attacker.example",
      { origin: "https://attacker.example" }
    );

    expect(isTrustedOrigin(request)).toBe(false);
  });

  it("falls back to a trusted referer when origin is absent", () => {
    setRuntime("bcn");
    const request = productionRequest(
      "https://thebusinesscircle.net/api/contact",
      "thebusinesscircle.net",
      { referer: "https://thebusinesscircle.net/membership" }
    );

    expect(isTrustedOrigin(request)).toBe(true);
  });

  it("rejects requests with no trusted origin signal", () => {
    setRuntime("bcn");
    const request = productionRequest(
      "https://thebusinesscircle.net/api/contact",
      "thebusinesscircle.net"
    );

    expect(isTrustedOrigin(request)).toBe(false);
  });

  it("allows a missing Origin only when the caller opts in explicitly", () => {
    setRuntime("bcn");
    const request = productionRequest(
      "https://thebusinesscircle.net/api/analytics/collect",
      "thebusinesscircle.net"
    );

    expect(isTrustedOrigin(request, { allowMissingOrigin: true })).toBe(true);
  });

  it("does not let allowMissingOrigin bypass runtime host validation", () => {
    setRuntime("bcn");
    const request = productionRequest(
      "https://attacker.example/api/analytics/collect",
      "attacker.example"
    );

    expect(isTrustedOrigin(request, { allowMissingOrigin: true })).toBe(false);
  });

  it("rejects malformed origin headers", () => {
    setRuntime("bcn");
    const request = productionRequest(
      "https://thebusinesscircle.net/api/contact",
      "thebusinesscircle.net",
      { origin: "not-a-valid-origin" }
    );

    expect(isTrustedOrigin(request)).toBe(false);
  });
});
