import { createHash, randomBytes } from "node:crypto";

export const SCALESMITHS_LINK_CHALLENGE_TTL_MS = 10 * 60 * 1000;

export function createScaleSmithsLinkToken(): string {
  // 256 bits of randomness. Display exactly once to the intended owner.
  return randomBytes(32).toString("hex");
}

export function hashScaleSmithsLinkToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isValidScaleSmithsExternalId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value);
}

export function linkChallengeIsUsable(input: {
  expectedUserId: string;
  expectedPartnerId: string;
  challengeUserId: string;
  challengePartnerId: string;
  expiresAt: Date;
  consumedAt: Date | null;
  now: Date;
}): boolean {
  return input.challengeUserId === input.expectedUserId &&
    input.challengePartnerId === input.expectedPartnerId &&
    input.expiresAt > input.now &&
    !input.consumedAt;
}
