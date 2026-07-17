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

  it.each([
    "https://thebusinesscircle.net/",
    "https://thebusinesscircle.net/api/auth/session",
    "https://thebusinesscircle.net/api/circle-card/public-image/card.jpg",
    "https://thebusinesscircle.net/branding/circle-card-logo.png",
    "https://thebusinesscircle.net/_next/image?url=%2Ficon.png&w=64&q=75"
  ])("covers application path %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });

  it.each([
    "https://thebusinesscircle.net/_next/static/chunks/main.js",
    "https://thebusinesscircle.net/_next/webpack-hmr"
  ])("excludes expected non-application Next.js internal path %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
  });
});
