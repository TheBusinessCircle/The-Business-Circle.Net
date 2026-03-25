import { compare, hash } from "bcryptjs";

const DEFAULT_BCRYPT_ROUNDS = 12;
const MIN_BCRYPT_ROUNDS = 10;
const TIMING_SAFE_FALLBACK_HASH =
  "$2a$12$UhuN3IbizfUZgAfczvtJMOqiew3Fkg/7VGatKRhT8IVVpbKrE5pL6";

function getBcryptRounds(): number {
  const configured = Number(process.env.AUTH_BCRYPT_ROUNDS ?? DEFAULT_BCRYPT_ROUNDS);

  if (!Number.isFinite(configured) || configured < MIN_BCRYPT_ROUNDS) {
    return DEFAULT_BCRYPT_ROUNDS;
  }

  return configured;
}

export async function hashPassword(plainTextPassword: string): Promise<string> {
  if (!plainTextPassword || plainTextPassword.length > 72) {
    throw new Error("Password payload is invalid.");
  }

  return hash(plainTextPassword, getBcryptRounds());
}

export async function verifyPassword(plainTextPassword: string, passwordHash: string | null | undefined): Promise<boolean> {
  if (!passwordHash || !plainTextPassword) {
    return false;
  }

  return compare(plainTextPassword, passwordHash);
}

export async function verifyPasswordWithTimingSafeFallback(
  plainTextPassword: string,
  passwordHash: string | null | undefined
): Promise<boolean> {
  if (!plainTextPassword) {
    return false;
  }

  const candidateHash = passwordHash ?? TIMING_SAFE_FALLBACK_HASH;
  const matched = await compare(plainTextPassword, candidateHash);
  return Boolean(passwordHash) && matched;
}
