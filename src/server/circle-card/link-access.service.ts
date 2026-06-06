import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { compare, hash } from "bcryptjs";

const ACCESS_TOKEN_TTL_SECONDS = 5 * 60;

type CircleCardLinkAccessTokenPayload = {
  linkId: string;
  exp: number;
};

function accessTokenSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("circle-card-link-access-secret-missing");
  }

  return "development-circle-card-link-access-secret";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", accessTokenSecret()).update(payload).digest("base64url");
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function generateCircleCardAccessCode() {
  return randomInt(0, 10_000).toString().padStart(4, "0");
}

export function isCircleCardAccessCode(value: string) {
  return /^\d{4}$/.test(value);
}

export async function hashCircleCardAccessCode(code: string) {
  return hash(code, 10);
}

export async function verifyCircleCardAccessCode(code: string, codeHash: string) {
  if (!isCircleCardAccessCode(code)) {
    return false;
  }

  return compare(code, codeHash);
}

export function createCircleCardLinkAccessToken(linkId: string) {
  const payload: CircleCardLinkAccessTokenPayload = {
    linkId,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyCircleCardLinkAccessToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !signaturesMatch(signPayload(encodedPayload), signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<CircleCardLinkAccessTokenPayload>;

    if (
      typeof payload.linkId !== "string" ||
      !payload.linkId ||
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      linkId: payload.linkId
    };
  } catch {
    return null;
  }
}
