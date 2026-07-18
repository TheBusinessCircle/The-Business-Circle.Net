import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest, type NextFetchEvent } from "next/server";

const authenticatedMiddlewareMock = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => vi.fn(() => authenticatedMiddlewareMock));

vi.mock("@/auth", () => ({ auth: authMock }));

import middleware, { config } from "@/middleware";

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

describe("middleware runtime host gate", () => {
  beforeEach(() => {
    setNodeEnv("production");
    process.env.APP_BRAND = "bcn";
    process.env.APP_URL = "https://thebusinesscircle.net";
    process.env.AUTH_URL = "https://thebusinesscircle.net";
    delete process.env.NEXTAUTH_URL;
  });

  afterEach(() => {
    restoreEnvironmentValue("APP_BRAND", originalEnvironment.APP_BRAND);
    restoreEnvironmentValue("APP_URL", originalEnvironment.APP_URL);
    restoreEnvironmentValue("AUTH_URL", originalEnvironment.AUTH_URL);
    restoreEnvironmentValue("NEXTAUTH_URL", originalEnvironment.NEXTAUTH_URL);
    setNodeEnv(originalEnvironment.NODE_ENV ?? "test");
  });

  it("rejects an unknown host before invoking authentication", () => {
    const request = new NextRequest("https://attacker.example/dashboard", {
      headers: { host: "attacker.example" }
    });

    const response = middleware(request, {} as NextFetchEvent);

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(421);
    expect(authenticatedMiddlewareMock).not.toHaveBeenCalled();
  });

  it("rejects a cross-brand runtime origin before invoking authentication", () => {
    process.env.APP_BRAND = "circle-card";
    process.env.APP_URL = "https://thebusinesscircle.net";
    process.env.AUTH_URL = "https://thebusinesscircle.net";
    const request = new NextRequest("https://circlecard.co.uk/dashboard", {
      headers: { host: "circlecard.co.uk" }
    });

    const response = middleware(request, {} as NextFetchEvent);

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(503);
    expect(authenticatedMiddlewareMock).not.toHaveBeenCalled();
  });

  it("allows the unchanged BCN runtime to reach existing protected-route authentication", () => {
    const request = new NextRequest("https://thebusinesscircle.net/dashboard", {
      headers: { host: "thebusinesscircle.net" }
    });

    middleware(request, {} as NextFetchEvent);

    expect(authenticatedMiddlewareMock).toHaveBeenCalledOnce();
  });

  it("canonicalizes a valid www page host without invoking authentication", () => {
    const request = new NextRequest("https://www.thebusinesscircle.net/dashboard?section=home", {
      headers: {
        host: "www.thebusinesscircle.net",
        "x-forwarded-host": "www.thebusinesscircle.net"
      }
    });

    const response = middleware(request, {} as NextFetchEvent) as Response;

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://thebusinesscircle.net/dashboard?section=home"
    );
    expect(authenticatedMiddlewareMock).not.toHaveBeenCalled();
  });

  it.each(["GET", "HEAD", "POST"])(
    "never redirects %s requests for APIs from a www host",
    (method) => {
      const request = new NextRequest("https://www.thebusinesscircle.net/api/stripe/webhook", {
        method,
        headers: {
          host: "www.thebusinesscircle.net",
          "x-forwarded-host": "www.thebusinesscircle.net"
        }
      });

      const response = middleware(request, {} as NextFetchEvent) as Response;

      expect(response.status).toBe(404);
      expect(response.headers.get("location")).toBeNull();
    }
  );

  it("rejects BCN-owned jobs on Circle Card before authentication", () => {
    process.env.APP_BRAND = "circle-card";
    process.env.APP_URL = "https://circlecard.co.uk";
    process.env.AUTH_URL = "https://circlecard.co.uk";
    const request = new NextRequest(
      "https://circlecard.co.uk/api/internal/circle-card/weekly-summary/run",
      {
        method: "POST",
        headers: {
          host: "circlecard.co.uk",
          "x-forwarded-host": "circlecard.co.uk"
        }
      }
    );

    const response = middleware(request, {} as NextFetchEvent) as Response;

    expect(response.status).toBe(404);
    expect(authenticatedMiddlewareMock).not.toHaveBeenCalled();
  });

  it("rejects a BCN-owned local source passed through the image optimiser", () => {
    process.env.APP_BRAND = "circle-card";
    process.env.APP_URL = "https://circlecard.co.uk";
    process.env.AUTH_URL = "https://circlecard.co.uk";
    const request = new NextRequest(
      "https://circlecard.co.uk/_next/image?url=%2Fapi%2Finternal%2Fcircle-card%2Fweekly-summary%2Frun&w=64&q=75",
      {
        headers: {
          host: "circlecard.co.uk",
          "x-forwarded-host": "circlecard.co.uk"
        }
      }
    );

    const response = middleware(request, {} as NextFetchEvent) as Response;

    expect(response.status).toBe(404);
    expect(authenticatedMiddlewareMock).not.toHaveBeenCalled();
  });

  it("uses the trusted Circle Card origin for denied-page redirects behind a proxy", () => {
    process.env.APP_BRAND = "circle-card";
    process.env.APP_URL = "https://circlecard.co.uk";
    process.env.AUTH_URL = "https://circlecard.co.uk";
    const request = new NextRequest("http://127.0.0.1:3200/membership", {
      headers: {
        host: "circlecard.co.uk",
        "x-forwarded-host": "circlecard.co.uk",
        "x-forwarded-proto": "https"
      }
    });

    const response = middleware(request, {} as NextFetchEvent) as Response;

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://circlecard.co.uk/");
    expect(authenticatedMiddlewareMock).not.toHaveBeenCalled();
  });

  it("canonicalizes a safe trailing-slash page from the trusted brand registry", () => {
    process.env.APP_BRAND = "circle-card";
    process.env.APP_URL = "https://circlecard.co.uk";
    process.env.AUTH_URL = "https://circlecard.co.uk";
    const request = new NextRequest("https://circlecard.co.uk/pro/?source=smoke", {
      headers: {
        host: "circlecard.co.uk",
        "x-forwarded-host": "circlecard.co.uk"
      }
    });

    const response = middleware(request, {} as NextFetchEvent) as Response;

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://circlecard.co.uk/pro?source=smoke"
    );
  });

  it.each([
    "https://thebusinesscircle.net/",
    "https://thebusinesscircle.net/api/auth/session",
    "https://thebusinesscircle.net/api/circle-card/export.csv",
    "https://thebusinesscircle.net/_next/image?url=%2Ficon.png&w=64&q=75"
  ])("covers application path %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });

  it.each([
    "https://thebusinesscircle.net/_next/static/chunks/main.js",
    "https://thebusinesscircle.net/_next/webpack-hmr",
    "https://thebusinesscircle.net/circle-card-icon-192.png",
    "https://thebusinesscircle.net/branding/circle-card-logo.png",
    "https://thebusinesscircle.net/uploads/circle-card/example.png",
    "https://thebusinesscircle.net/api/circle-card/public-image/example.png"
  ])("excludes expected non-application Next.js internal path %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
  });
});
