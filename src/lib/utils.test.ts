import { afterEach, describe, expect, it, vi } from "vitest";
import { absoluteUrl, getBaseUrl } from "@/lib/utils";

const originalNodeEnv = process.env.NODE_ENV;
const originalAppBrand = process.env.APP_BRAND;
const originalAppUrl = process.env.APP_URL;
const originalAuthUrl = process.env.AUTH_URL;
const originalNextAuthUrl = process.env.NEXTAUTH_URL;

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

describe("base url resolution", () => {
  afterEach(() => {
    setNodeEnv(originalNodeEnv ?? "test");
    restoreEnvironmentValue("APP_BRAND", originalAppBrand);
    restoreEnvironmentValue("APP_URL", originalAppUrl);
    restoreEnvironmentValue("AUTH_URL", originalAuthUrl);
    restoreEnvironmentValue("NEXTAUTH_URL", originalNextAuthUrl);
    vi.restoreAllMocks();
  });

  it("uses the configured public url in development", () => {
    setNodeEnv("development");
    delete process.env.APP_BRAND;
    process.env.APP_URL = "https://thebusinesscircle.net/";
    process.env.AUTH_URL = "";
    process.env.NEXTAUTH_URL = "http://localhost:3000";

    expect(getBaseUrl()).toBe("https://thebusinesscircle.net");
  });

  it("uses localhost fallback in development when app urls are missing", () => {
    setNodeEnv("development");
    delete process.env.APP_BRAND;
    process.env.APP_URL = "";
    process.env.AUTH_URL = "";
    process.env.NEXTAUTH_URL = "";

    expect(getBaseUrl()).toBe("http://localhost:3000");
    expect(absoluteUrl("/api/auth/verify-email")).toBe(
      "http://localhost:3000/api/auth/verify-email"
    );
  });

  it("throws in production when configured auth urls use localhost", () => {
    setNodeEnv("production");
    process.env.APP_BRAND = "bcn";
    process.env.APP_URL = "http://localhost:3000";
    process.env.AUTH_URL = "";
    process.env.NEXTAUTH_URL = "http://127.0.0.1:3000";

    expect(() => getBaseUrl()).toThrow("APP_URL must be set to https://thebusinesscircle.net");
  });

  it("throws in production when configured urls do not match", () => {
    setNodeEnv("production");
    process.env.APP_BRAND = "bcn";
    process.env.APP_URL = "https://thebusinesscircle.net";
    process.env.AUTH_URL = "";
    process.env.NEXTAUTH_URL = "https://example.com";

    expect(() => getBaseUrl()).toThrow("NEXTAUTH_URL must be set to https://thebusinesscircle.net");
  });

  it("throws in production when the configured url is not the canonical live domain", () => {
    setNodeEnv("production");
    process.env.APP_BRAND = "bcn";
    process.env.APP_URL = "https://staging.thebusinesscircle.net";
    process.env.AUTH_URL = "";
    process.env.NEXTAUTH_URL = "https://staging.thebusinesscircle.net";

    expect(() => getBaseUrl()).toThrow("APP_URL must be set to https://thebusinesscircle.net");
  });

  it("uses the canonical live domain in production when both env values are correct", () => {
    setNodeEnv("production");
    process.env.APP_BRAND = "bcn";
    process.env.APP_URL = " https://thebusinesscircle.net/ ";
    process.env.AUTH_URL = "";
    process.env.NEXTAUTH_URL = "https://thebusinesscircle.net";

    expect(getBaseUrl()).toBe("https://thebusinesscircle.net");
    expect(absoluteUrl("/api/auth/verify-email")).toBe(
      "https://thebusinesscircle.net/api/auth/verify-email"
    );
  });

  it("uses the Circle Card canonical origin in an explicit Circle Card runtime", () => {
    setNodeEnv("production");
    process.env.APP_BRAND = "circle-card";
    process.env.APP_URL = "https://circlecard.co.uk";
    process.env.AUTH_URL = "https://circlecard.co.uk";
    process.env.NEXTAUTH_URL = "";

    expect(getBaseUrl()).toBe("https://circlecard.co.uk");
    expect(absoluteUrl("/login")).toBe("https://circlecard.co.uk/login");
  });
});
