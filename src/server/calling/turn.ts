import { createHmac } from "node:crypto";

export type CallRtcConfig = {
  iceServers: RTCIceServer[];
};

function parseOptionalInteger(value: string | undefined, fallback?: number) {
  if (!value?.trim()) {
    return fallback ?? null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback ?? null;
}

function parseBoolean(value: string | undefined, fallback = false) {
  if (!value?.trim()) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function getTurnEnvironment() {
  const domain = process.env.TURN_DOMAIN?.trim();
  const realm = process.env.TURN_REALM?.trim();
  const sharedSecret = process.env.TURN_SHARED_SECRET?.trim();
  const udpPort = parseOptionalInteger(process.env.TURN_UDP_PORT, 3478) ?? 3478;
  const tlsPort = parseOptionalInteger(process.env.TURN_TLS_PORT);
  const ttlSeconds = parseOptionalInteger(process.env.TURN_TTL_SECONDS, 3600) ?? 3600;
  const tlsEnabled = parseBoolean(process.env.TURN_TLS_ENABLED);

  return {
    domain,
    realm,
    sharedSecret,
    udpPort,
    tlsPort,
    ttlSeconds,
    tlsEnabled
  };
}

export function isTurnConfigured() {
  const env = getTurnEnvironment();
  return Boolean(env.domain && env.realm && env.sharedSecret);
}

export function isTurnTlsConfigured() {
  const env = getTurnEnvironment();
  return Boolean(
    env.domain &&
      env.realm &&
      env.sharedSecret &&
      env.tlsEnabled &&
      env.tlsPort &&
      env.tlsPort > 0
  );
}

function createTurnCredential(userId: string) {
  const env = getTurnEnvironment();

  if (!env.domain || !env.realm || !env.sharedSecret) {
    throw new Error("turn-not-configured");
  }

  const expiresAt = Math.floor(Date.now() / 1000) + env.ttlSeconds;
  const username = `${expiresAt}:${userId}`;
  const credential = createHmac("sha1", env.sharedSecret).update(username).digest("base64");

  return {
    username,
    credential,
    ...env
  };
}

export function getCallingRtcConfig(userId: string): CallRtcConfig | null {
  if (!isTurnConfigured()) {
    return null;
  }

  const credential = createTurnCredential(userId);
  const turnUrls = [
    `turn:${credential.domain}:${credential.udpPort}?transport=udp`,
    `turn:${credential.domain}:${credential.udpPort}?transport=tcp`
  ];

  if (credential.tlsEnabled && credential.tlsPort && credential.tlsPort > 0) {
    turnUrls.push(`turns:${credential.domain}:${credential.tlsPort}?transport=tcp`);
  }

  return {
    iceServers: [
      {
        urls: [`stun:${credential.domain}:${credential.udpPort}`]
      },
      {
        urls: turnUrls,
        username: credential.username,
        credential: credential.credential
      }
    ]
  };
}
