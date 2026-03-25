import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logServerWarning } from "@/lib/security/logging";

type HeaderSource = {
  get(name: string): string | null;
} | null | undefined;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

declare global {
  var __businessCircleRateLimitStore: Map<string, RateLimitBucket> | undefined;
}

const inMemoryStore =
  globalThis.__businessCircleRateLimitStore ?? new Map<string, RateLimitBucket>();

if (!globalThis.__businessCircleRateLimitStore) {
  globalThis.__businessCircleRateLimitStore = inMemoryStore;
}

let cachedRedisClient: Redis | null | undefined;
const redisRatelimiters = new Map<string, Ratelimit>();

function cleanupExpiredBuckets(now: number) {
  // Opportunistic cleanup to avoid unbounded growth in long-lived processes.
  if (Math.random() > 0.02) {
    return;
  }

  for (const [key, value] of inMemoryStore.entries()) {
    if (value.resetAt <= now) {
      inMemoryStore.delete(key);
    }
  }
}

function consumeInMemoryRateLimit(input: RateLimitInput): RateLimitResult {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const existing = inMemoryStore.get(input.key);
  const active =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + input.windowMs
        };

  active.count += 1;
  inMemoryStore.set(input.key, active);

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((active.resetAt - now) / 1000)
  );

  if (active.count > input.limit) {
    return {
      allowed: false,
      limit: input.limit,
      remaining: 0,
      resetAt: active.resetAt,
      retryAfterSeconds
    };
  }

  return {
    allowed: true,
    limit: input.limit,
    remaining: Math.max(0, input.limit - active.count),
    resetAt: active.resetAt,
    retryAfterSeconds
  };
}

function resolveRedisClient(): Redis | null {
  if (cachedRedisClient !== undefined) {
    return cachedRedisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    cachedRedisClient = null;
    return cachedRedisClient;
  }

  cachedRedisClient = new Redis({
    url,
    token
  });

  return cachedRedisClient;
}

function durationFromWindowMs(windowMs: number): `${number} s` {
  const seconds = Math.max(1, Math.ceil(windowMs / 1000));
  return `${seconds} s`;
}

function resolveRedisRateLimiter(input: RateLimitInput): Ratelimit | null {
  const redis = resolveRedisClient();
  if (!redis) {
    return null;
  }

  const limiterKey = `${input.limit}:${input.windowMs}`;
  const existing = redisRatelimiters.get(limiterKey);
  if (existing) {
    return existing;
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(input.limit, durationFromWindowMs(input.windowMs)),
    prefix: "ratelimit:business-circle"
  });

  redisRatelimiters.set(limiterKey, limiter);
  return limiter;
}

export function getRateLimitBackend(): "upstash" | "in-memory" {
  return resolveRedisClient() ? "upstash" : "in-memory";
}

export async function consumeRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const limiter = resolveRedisRateLimiter(input);
  if (!limiter) {
    return consumeInMemoryRateLimit(input);
  }

  try {
    const result = await limiter.limit(input.key);
    const resetAt = Number(result.reset ?? Date.now() + input.windowMs);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((resetAt - Date.now()) / 1000)
    );

    return {
      allowed: result.success,
      limit: result.limit,
      remaining: Math.max(0, result.remaining),
      resetAt,
      retryAfterSeconds
    };
  } catch {
    logServerWarning("redis-rate-limit-fallback", {
      provider: "upstash",
      fallback: "in-memory"
    });
    return consumeInMemoryRateLimit(input);
  }
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000))
  };
}

export function clientIpFromHeaders(headers: HeaderSource): string {
  if (!headers) {
    return "unknown";
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstHop = forwardedFor.split(",")[0]?.trim();
    if (firstHop) {
      return firstHop;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}
