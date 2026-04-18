import { afterEach, describe, expect, it } from "vitest";
import { absoluteUrl, getBaseUrl } from "@/lib/utils";

const originalNodeEnv = process.env.NODE_ENV;
const originalAppUrl = process.env.APP_URL;
const originalNextAuthUrl = process.env.NEXTAUTH_URL;

function setNodeEnv(value: string) {
  process.env.NODE_ENV = value;
}

describe("base url resolution", () => {
  afterEach(() => {
    setNodeEnv(originalNodeEnv ?? "test");
    process.env.APP_URL = originalAppUrl;
    process.env.NEXTAUTH_URL = originalNextAuthUrl;
  });

  it("never returns localhost in production when configured auth urls are loopback hosts", () => {
    setNodeEnv("production");
    process.env.APP_URL = "http://localhost:3000";
    process.env.NEXTAUTH_URL = "http://127.0.0.1:3000";

    expect(getBaseUrl()).toBe("https://thebusinesscircle.net");
    expect(absoluteUrl("/api/auth/verify-email")).toBe(
      "https://thebusinesscircle.net/api/auth/verify-email"
    );
  });

  it("uses the configured public url in production when it is not loopback", () => {
    setNodeEnv("production");
    process.env.APP_URL = "https://thebusinesscircle.net/";
    process.env.NEXTAUTH_URL = "http://localhost:3000";

    expect(getBaseUrl()).toBe("https://thebusinesscircle.net");
  });
});
