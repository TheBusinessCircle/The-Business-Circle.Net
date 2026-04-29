import { afterEach, describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "../next.config";

const originalLiveKitUrl = process.env.LIVEKIT_URL;

describe("content security policy", () => {
  afterEach(() => {
    process.env.LIVEKIT_URL = originalLiveKitUrl;
  });

  it("allows the launch-critical browser integrations without exposing server-only Resend", () => {
    process.env.LIVEKIT_URL = "wss://rtc.thebusinesscircle.net";

    const csp = buildContentSecurityPolicy();

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("form-action 'self' https://checkout.stripe.com https://billing.stripe.com");
    expect(csp).toContain("frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://billing.stripe.com");
    expect(csp).toContain("img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com");
    expect(csp).toContain("media-src 'self' blob: https://res.cloudinary.com");
    expect(csp).toContain("https://*.ably.io");
    expect(csp).toContain("wss://*.ably.io");
    expect(csp).toContain("wss://rtc.thebusinesscircle.net");
    expect(csp).not.toContain("resend.com");
  });

  it("includes local and configured LiveKit browser endpoints", () => {
    process.env.LIVEKIT_URL = "ws://localhost:7880";

    const csp = buildContentSecurityPolicy();

    expect(csp).toContain("ws://localhost:7880");
    expect(csp).toContain("http://localhost:7880");
  });
});
