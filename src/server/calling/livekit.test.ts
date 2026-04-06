import { afterEach, describe, expect, it } from "vitest";
import {
  getLiveKitConfig,
  getLiveKitConfigSummary,
  getLiveKitJoinConfig,
  LiveKitConfigError
} from "@/server/calling/livekit";

const LIVEKIT_ENV_KEYS = [
  "LIVEKIT_URL",
  "LIVEKIT_SERVER_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET"
] as const;

const originalEnv = Object.fromEntries(
  LIVEKIT_ENV_KEYS.map((key) => [key, process.env[key]])
) as Record<(typeof LIVEKIT_ENV_KEYS)[number], string | undefined>;

function restoreLiveKitEnv() {
  for (const key of LIVEKIT_ENV_KEYS) {
    const originalValue = originalEnv[key];

    if (originalValue === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = originalValue;
  }
}

afterEach(() => {
  restoreLiveKitEnv();
});

describe("livekit config", () => {
  it("allows token issuance config without an explicit server management URL", () => {
    process.env.LIVEKIT_URL = "wss://rtc.example.com";
    delete process.env.LIVEKIT_SERVER_URL;
    process.env.LIVEKIT_API_KEY = "test-key";
    process.env.LIVEKIT_API_SECRET = "test-secret";

    const config = getLiveKitJoinConfig();

    expect(config.publicUrl).toBe("wss://rtc.example.com");
    expect(config.apiKey).toBe("test-key");
    expect(config.apiSecret).toBe("test-secret");
  });

  it("derives the server-side HTTP endpoint from a websocket public URL", () => {
    process.env.LIVEKIT_URL = "wss://rtc.example.com";
    delete process.env.LIVEKIT_SERVER_URL;
    process.env.LIVEKIT_API_KEY = "test-key";
    process.env.LIVEKIT_API_SECRET = "test-secret";

    const config = getLiveKitConfig();

    expect(config.publicUrl).toBe("wss://rtc.example.com");
    expect(config.serverUrl).toBe("https://rtc.example.com");
    expect(config.summary.serverUrlDerivedFromPublicUrl).toBe(true);
    expect(config.summary.serverUrlProtocol).toBe("https");
  });

  it("uses the explicit server URL when one is configured", () => {
    process.env.LIVEKIT_URL = "wss://rtc.example.com";
    process.env.LIVEKIT_SERVER_URL = "http://livekit.internal:7880";
    process.env.LIVEKIT_API_KEY = "test-key";
    process.env.LIVEKIT_API_SECRET = "test-secret";

    const config = getLiveKitConfig();

    expect(config.serverUrl).toBe("http://livekit.internal:7880");
    expect(config.summary.serverUrlDerivedFromPublicUrl).toBe(false);
    expect(config.summary.serverUrlProtocol).toBe("http");
  });

  it("throws a clear configuration error when credentials are missing", () => {
    process.env.LIVEKIT_URL = "ws://localhost:7880";
    delete process.env.LIVEKIT_SERVER_URL;
    process.env.LIVEKIT_API_KEY = "test-key";
    delete process.env.LIVEKIT_API_SECRET;

    expect(() => getLiveKitConfig()).toThrowError(LiveKitConfigError);
    expect(getLiveKitConfigSummary()).toMatchObject({
      publicUrlConfigured: true,
      serverUrlConfigured: true,
      serverUrlDerivedFromPublicUrl: true,
      apiKeyConfigured: true,
      apiSecretConfigured: false
    });
  });
});
