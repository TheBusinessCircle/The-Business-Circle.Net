import { describe, expect, it } from "vitest";
import { validateRuntimeRequestHost } from "@/lib/security/host";

function request(host: string, forwardedHost?: string) {
  const headers = new Headers({ host });
  if (forwardedHost) {
    headers.set("x-forwarded-host", forwardedHost);
  }

  return new Request("https://internal-runtime.test/dashboard", { headers });
}

function requestWithRawHeaders(host: string, forwardedHost?: string) {
  return {
    url: "https://internal-runtime.test/dashboard",
    headers: {
      get(name: string) {
        if (name.toLowerCase() === "host") return host;
        if (name.toLowerCase() === "x-forwarded-host") return forwardedHost ?? null;
        return null;
      }
    } as Headers
  };
}

describe("runtime request host validation", () => {
  it("rejects a missing production Host header", () => {
    expect(
      validateRuntimeRequestHost(
        {
          url: "https://internal-runtime.test/dashboard",
          headers: new Headers()
        },
        { APP_BRAND: "bcn", NODE_ENV: "production" }
      )
    ).toEqual({ ok: false, reason: "missing-host" });
  });

  it("accepts only intended BCN hostnames in a BCN production runtime", () => {
    expect(
      validateRuntimeRequestHost(request("thebusinesscircle.net"), {
        APP_BRAND: "bcn",
        NODE_ENV: "production"
      })
    ).toMatchObject({ ok: true, runtimeBrand: "bcn" });
    expect(
      validateRuntimeRequestHost(request("www.thebusinesscircle.net"), {
        APP_BRAND: "bcn",
        NODE_ENV: "production"
      })
    ).toMatchObject({ ok: true, runtimeBrand: "bcn" });

    expect(
      validateRuntimeRequestHost(request("circlecard.co.uk"), {
        APP_BRAND: "bcn",
        NODE_ENV: "production"
      })
    ).toEqual({ ok: false, reason: "untrusted-host" });
  });

  it("accepts only intended Circle Card hostnames in a Circle Card production runtime", () => {
    expect(
      validateRuntimeRequestHost(request("circlecard.co.uk"), {
        APP_BRAND: "circle-card",
        NODE_ENV: "production"
      })
    ).toMatchObject({ ok: true, runtimeBrand: "circle-card" });
    expect(
      validateRuntimeRequestHost(request("www.circlecard.co.uk"), {
        APP_BRAND: "circle-card",
        NODE_ENV: "production"
      })
    ).toMatchObject({ ok: true, runtimeBrand: "circle-card" });

    expect(
      validateRuntimeRequestHost(request("thebusinesscircle.net"), {
        APP_BRAND: "circle-card",
        NODE_ENV: "production"
      })
    ).toEqual({ ok: false, reason: "untrusted-host" });
  });

  it("rejects an unknown production Host header", () => {
    expect(
      validateRuntimeRequestHost(request("attacker.example"), {
        APP_BRAND: "bcn",
        NODE_ENV: "production"
      })
    ).toEqual({ ok: false, reason: "untrusted-host" });
  });

  it("accepts case-insensitive canonical hostnames", () => {
    expect(
      validateRuntimeRequestHost(
        request("THEBUSINESSCIRCLE.NET", "THEBUSINESSCIRCLE.NET"),
        { APP_BRAND: "bcn", NODE_ENV: "production" }
      ).ok
    ).toBe(true);
  });

  it("accepts the normal Nginx Host and X-Forwarded-Host pair", () => {
    expect(
      validateRuntimeRequestHost(
        request("thebusinesscircle.net", "thebusinesscircle.net"),
        { APP_BRAND: "bcn", NODE_ENV: "production" }
      ).ok
    ).toBe(true);
  });

  it("allows only the default HTTPS port in production", () => {
    expect(
      validateRuntimeRequestHost(request("thebusinesscircle.net:443"), {
        APP_BRAND: "bcn",
        NODE_ENV: "production"
      }).ok
    ).toBe(true);
    expect(
      validateRuntimeRequestHost(request("thebusinesscircle.net:444"), {
        APP_BRAND: "bcn",
        NODE_ENV: "production"
      })
    ).toEqual({ ok: false, reason: "untrusted-host" });
  });

  it("rejects a spoofed X-Forwarded-Host instead of trusting it", () => {
    expect(
      validateRuntimeRequestHost(
        request("thebusinesscircle.net", "circlecard.co.uk"),
        { APP_BRAND: "bcn", NODE_ENV: "production" }
      )
    ).toEqual({ ok: false, reason: "forwarded-host-mismatch" });
  });

  it("rejects a forwarded-host port mismatch", () => {
    expect(
      validateRuntimeRequestHost(
        request("thebusinesscircle.net", "thebusinesscircle.net:443"),
        { APP_BRAND: "bcn", NODE_ENV: "production" }
      )
    ).toEqual({ ok: false, reason: "forwarded-host-mismatch" });
  });

  it("never lets a canonical forwarded host override an untrusted Host", () => {
    expect(
      validateRuntimeRequestHost(
        request("attacker.example", "thebusinesscircle.net"),
        { APP_BRAND: "bcn", NODE_ENV: "production" }
      ).ok
    ).toBe(false);
  });

  it.each([
    "thebusinesscircle.net.",
    "thebusinesscircle.net:",
    "thebusinesscircle.net:not-a-port",
    "thebusinesscircle.net:65536",
    "user@thebusinesscircle.net",
    "thebusinesscircle.net/path",
    "thebusinesscircle.net,thebusinesscircle.net"
  ])("rejects malformed or ambiguous Host value %s", (host) => {
    expect(
      validateRuntimeRequestHost(requestWithRawHeaders(host), {
        APP_BRAND: "bcn",
        NODE_ENV: "production"
      }).ok
    ).toBe(false);
  });

  it.each([" thebusinesscircle.net", "thebusinesscircle.net "])(
    "rejects surrounding Host whitespace %s",
    (host) => {
      expect(
        validateRuntimeRequestHost(requestWithRawHeaders(host), {
          APP_BRAND: "bcn",
          NODE_ENV: "production"
        })
      ).toEqual({ ok: false, reason: "malformed-host" });
    }
  );

  it.each([
    "thebusinesscircle.net,thebusinesscircle.net",
    "thebusinesscircle.net, attacker.example"
  ])("rejects multiple X-Forwarded-Host values %s", (forwardedHost) => {
    expect(
      validateRuntimeRequestHost(
        requestWithRawHeaders("thebusinesscircle.net", forwardedHost),
        { APP_BRAND: "bcn", NODE_ENV: "production" }
      )
    ).toEqual({ ok: false, reason: "forwarded-host-mismatch" });
  });

  it.each(["localhost:3000", "127.0.0.1:3000", "[::1]:3000", "bcn.test"])(
    "accepts deliberate local/test host %s outside production",
    (host) => {
      expect(
        validateRuntimeRequestHost(request(host), {
          APP_BRAND: "bcn",
          NODE_ENV: "test"
        }).ok
      ).toBe(true);
    }
  );

  it("keeps named test hosts brand-specific", () => {
    expect(
      validateRuntimeRequestHost(request("circle-card.test"), {
        APP_BRAND: "bcn",
        NODE_ENV: "test"
      })
    ).toEqual({ ok: false, reason: "untrusted-host" });
  });
});
