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

type RedisConfig = {
  url: string;
  token: string;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export type RateLimitBackend = "upstash" | "in-memory";

export type RateLimitStatus = {
  backend: RateLimitBackend;
  label: string;
  description: string;
  warning: string | null;
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
const RATE_LIMIT_PREFIX =
  process.env.RATE_LIMIT_REDIS_PREFIX?.trim() || "ratelimit:business-circle";
const REDIS_STATUS_TTL_MS = 60_000;
const REDIS_FALLBACK_LOG_COOLDOWN_MS = 60_000;

let cachedRateLimitStatus:
  | {
      value: RateLimitStatus;
      expiresAt: number;
    }
  | null = null;
let redisFallbackUntil = 0;
let lastRedisFallbackWarningAt = 0;

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

function resolveRedisConfig(): RedisConfig | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  return {
    url,
    token
  };
}

function resolveRedisClient(): Redis | null {
  if (cachedRedisClient !== undefined) {
    return cachedRedisClient;
  }

  const config = resolveRedisConfig();
  if (!config) {
    cachedRedisClient = null;
    return cachedRedisClient;
  }

  cachedRedisClient = new Redis({
    url: config.url,
    token: config.token
  });

  return cachedRedisClient;
}

function durationFromWindowMs(windowMs: number): `${number} s` {
  const seconds = Math.max(1, Math.ceil(windowMs / 1000));
  return `${seconds} s`;
}

function resolveRedisRateLimiter(input: RateLimitInput): Ratelimit | null {
  const redis = resolveRedisClient();
  if (!redis || redisFallbackUntil > Date.now()) {
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
    prefix: RATE_LIMIT_PREFIX
  });

  redisRatelimiters.set(limiterKey, limiter);
  return limiter;
}

function buildRateLimitStatus(reason: "shared" | "unconfigured" | "unreachable"): RateLimitStatus {
  if (reason === "shared") {
    return {
      backend: "upstash",
      label: "Shared Redis",
      description: "API limits are enforced through a shared Redis store across all app instances.",
      warning: null
    };
  }

  if (reason === "unreachable") {
    return {
      backend: "in-memory",
      label: "Local fallback",
      description:
        "Shared Redis is configured but currently unreachable, so request limits are falling back locally.",
      warning:
        "Shared Redis could not be reached. Request throttling is temporarily using the local fallback."
    };
  }

  return {
    backend: "in-memory",
    label: "Local fallback",
    description:
      "API limits are active in local memory. Connect shared Redis before multi-instance production.",
    warning: "Shared Redis is not configured for this environment."
  };
}

function cacheRateLimitStatus(value: RateLimitStatus) {
  cachedRateLimitStatus = {
    value,
    expiresAt: Date.now() + REDIS_STATUS_TTL_MS
  };
}

function markRedisUnavailable() {
  redisFallbackUntil = Date.now() + REDIS_STATUS_TTL_MS;
  cacheRateLimitStatus(buildRateLimitStatus("unreachable"));
}

function markRedisHealthy() {
  redisFallbackUntil = 0;
  cacheRateLimitStatus(buildRateLimitStatus("shared"));
}

function logRedisFallbackWarningOnce() {
  const now = Date.now();
  if (now - lastRedisFallbackWarningAt < REDIS_FALLBACK_LOG_COOLDOWN_MS) {
    return;
  }

  lastRedisFallbackWarningAt = now;
  logServerWarning("redis-rate-limit-fallback", {
    provider: "upstash",
    fallback: "in-memory"
  });
}

export function getRateLimitBackend(): RateLimitBackend {
  if (redisFallbackUntil > Date.now()) {
    return "in-memory";
  }

  return resolveRedisClient() ? "upstash" : "in-memory";
}

export async function getRateLimitStatus(): Promise<RateLimitStatus> {
  if (cachedRateLimitStatus && cachedRateLimitStatus.expiresAt > Date.now()) {
    return cachedRateLimitStatus.value;
  }

  const redis = resolveRedisClient();
  if (!redis) {
    const status = buildRateLimitStatus("unconfigured");
    cacheRateLimitStatus(status);
    return status;
  }

  if (redisFallbackUntil > Date.now()) {
    return buildRateLimitStatus("unreachable");
  }

  try {
    await redis.ping();
    const status = buildRateLimitStatus("shared");
    markRedisHealthy();
    return status;
  } catch {
    const status = buildRateLimitStatus("unreachable");
    markRedisUnavailable();
    return status;
  }
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
    markRedisUnavailable();
    logRedisFallbackWarningOnce();
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
