import { afterEach, describe, expect, it } from "vitest";
import {
  getCallingRtcConfig,
  isTurnConfigured,
  isTurnTlsConfigured
} from "@/server/calling/turn";

const TURN_ENV_KEYS = [
  "TURN_DOMAIN",
  "TURN_REALM",
  "TURN_SHARED_SECRET",
  "TURN_UDP_PORT",
  "TURN_TLS_ENABLED",
  "TURN_TLS_PORT",
  "TURN_TTL_SECONDS"
] as const;

const originalEnv = Object.fromEntries(
  TURN_ENV_KEYS.map((key) => [key, process.env[key]])
) as Record<(typeof TURN_ENV_KEYS)[number], string | undefined>;

function restoreTurnEnv() {
  for (const key of TURN_ENV_KEYS) {
    const originalValue = originalEnv[key];

    if (originalValue === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = originalValue;
  }
}

afterEach(() => {
  restoreTurnEnv();
});

describe("turn config", () => {
  it("reports TURN as configured without requiring TLS", () => {
    process.env.TURN_DOMAIN = "turn.example.com";
    process.env.TURN_REALM = "turn.example.com";
    process.env.TURN_SHARED_SECRET = "turn-secret";
    process.env.TURN_TLS_ENABLED = "false";
    process.env.TURN_TLS_PORT = "5349";

    expect(isTurnConfigured()).toBe(true);
    expect(isTurnTlsConfigured()).toBe(false);
  });

  it("includes a turns URL only when TURN TLS is enabled", () => {
    process.env.TURN_DOMAIN = "turn.example.com";
    process.env.TURN_REALM = "turn.example.com";
    process.env.TURN_SHARED_SECRET = "turn-secret";
    process.env.TURN_UDP_PORT = "3478";
    process.env.TURN_TLS_PORT = "5349";
    process.env.TURN_TTL_SECONDS = "3600";

    process.env.TURN_TLS_ENABLED = "false";
    const insecureConfig = getCallingRtcConfig("user-123");
    const insecureUrls = insecureConfig?.iceServers[1]?.urls;
    expect(insecureUrls).toEqual([
      "turn:turn.example.com:3478?transport=udp",
      "turn:turn.example.com:3478?transport=tcp"
    ]);

    process.env.TURN_TLS_ENABLED = "true";
    const secureConfig = getCallingRtcConfig("user-123");
    const secureUrls = secureConfig?.iceServers[1]?.urls;
    expect(secureUrls).toEqual([
      "turn:turn.example.com:3478?transport=udp",
      "turn:turn.example.com:3478?transport=tcp",
      "turns:turn.example.com:5349?transport=tcp"
    ]);
    expect(isTurnTlsConfigured()).toBe(true);
  });
});
