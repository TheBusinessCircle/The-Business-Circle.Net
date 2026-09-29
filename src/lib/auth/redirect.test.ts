import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveAuthenticationRedirect,
  resolveRuntimeAuthenticationRedirect
} from "@/lib/auth/redirect";

describe("authentication redirect ownership", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["/", "https://circlecard.co.uk/"],
    ["/app", "https://circlecard.co.uk/app"],
    ["/app/studio?section=links", "https://circlecard.co.uk/app/studio?section=links"],
    ["/card/example?spin=return", "https://circlecard.co.uk/card/example?spin=return"],
    ["https://circlecard.co.uk/app/wallet", "https://circlecard.co.uk/app/wallet"]
  ])("keeps the Circle callback %s on the Circle origin", (candidate, expected) => {
    expect(resolveAuthenticationRedirect("circle-card", candidate)).toBe(expected);
  });

  it.each([
    "https://thebusinesscircle.net/dashboard",
    "https://attacker.example/app",
    "//attacker.example/app",
    "/membership",
    "/admin",
    "/testimonial",
    "/APP",
    "/%2f%2fattacker.example",
    "https%3A%2F%2Fthebusinesscircle.net%2Fdashboard",
    "/app/%255c%255cattacker.example",
    "/app/../../admin",
    "/app#settings",
    "https://www.circlecard.co.uk/app",
    "https://circlecard.co.uk.attacker.example/app",
    "not-a-url"
  ])("fails a cross-product or unsafe Circle callback closed: %s", (candidate) => {
    expect(resolveAuthenticationRedirect("circle-card", candidate)).toBe(
      "https://circlecard.co.uk/"
    );
  });

  it("does not let the Auth.js base URL or client query choose another product", () => {
    vi.stubEnv("APP_BRAND", "circle-card");

    expect(
      resolveRuntimeAuthenticationRedirect({
        url: "/app?callbackUrl=https%3A%2F%2Fthebusinesscircle.net%2Fdashboard&brand=bcn&source=bcn-join",
        baseUrl: "https://thebusinesscircle.net"
      })
    ).toBe(
      "https://circlecard.co.uk/app?callbackUrl=https%3A%2F%2Fthebusinesscircle.net%2Fdashboard&brand=bcn&source=bcn-join"
    );
  });

  it("requires an explicit trusted runtime brand at the policy boundary", () => {
    expect(() => resolveAuthenticationRedirect(undefined as never, "/app")).toThrow();
    expect(() => resolveAuthenticationRedirect("attacker" as never, "/app")).toThrow();
  });

  it("preserves safe same-product BCN callbacks for the temporary BCN runtime", () => {
    expect(resolveAuthenticationRedirect("bcn", "/dashboard?notice=welcome")).toBe(
      "https://thebusinesscircle.net/dashboard?notice=welcome"
    );
    expect(
      resolveAuthenticationRedirect("bcn", "https://circlecard.co.uk/app")
    ).toBe("https://thebusinesscircle.net/");
  });
});
