import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const PRODUCTION_CANONICAL_BASE_URL = "https://thebusinesscircle.net";
const PRODUCTION_ALLOWED_HOSTNAME = "thebusinesscircle.net";
let lastLoggedBaseUrl: string | null = null;
let lastLoggedReason: string | null = null;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function formatDateTime(value: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatDate(value: Date | string): string {
  return formatDateTime(value);
}

export function formatCurrency(amount: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}

function normalizeConfiguredUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function isLoopbackHost(value: string) {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

function isAllowedProductionUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === PRODUCTION_ALLOWED_HOSTNAME;
  } catch {
    return false;
  }
}

function logResolvedBaseUrl(baseUrl: string, reason?: string) {
  const normalizedReason = reason || null;
  if (lastLoggedBaseUrl === baseUrl && lastLoggedReason === normalizedReason) {
    return;
  }

  console.info("[url-resolution] resolved base url", {
    baseUrl,
    ...(reason ? { reason } : {})
  });
  lastLoggedBaseUrl = baseUrl;
  lastLoggedReason = normalizedReason;
}

function throwInvalidProductionBaseUrl(reason: string, details: Record<string, unknown>): never {
  console.error("[url-resolution] invalid production base url", {
    reason,
    ...details
  });

  if (reason === "loopback-host" && "configuredUrl" in details) {
    console.error("[verify-email] refusing localhost in production", {
      configuredUrl: details.configuredUrl
    });
  }

  throw new Error(
    `Invalid production base URL configuration: ${reason}. Expected ${PRODUCTION_CANONICAL_BASE_URL}.`
  );
}

function resolveConfiguredBaseUrl() {
  const appUrl = normalizeConfiguredUrl(process.env.APP_URL);
  const authUrl = normalizeConfiguredUrl(process.env.NEXTAUTH_URL);

  if (
    process.env.NODE_ENV === "production" &&
    ((appUrl && isLoopbackHost(appUrl)) || (authUrl && isLoopbackHost(authUrl)))
  ) {
    throwInvalidProductionBaseUrl("loopback-host", {
      configuredUrl: appUrl || authUrl
    });
  }

  if (process.env.NODE_ENV === "production" && appUrl && authUrl && appUrl !== authUrl) {
    throwInvalidProductionBaseUrl("configured-url-mismatch", {
      appUrl,
      nextAuthUrl: authUrl
    });
  }

  return appUrl || authUrl || null;
}

export function getBaseUrl(): string {
  const configuredUrl = resolveConfiguredBaseUrl();

  if (process.env.NODE_ENV === "production") {
    if (!configuredUrl) {
      throwInvalidProductionBaseUrl("missing-configured-url", {
        appUrl: process.env.APP_URL?.trim() || null,
        nextAuthUrl: process.env.NEXTAUTH_URL?.trim() || null
      });
    }

    if (isLoopbackHost(configuredUrl)) {
      throwInvalidProductionBaseUrl("loopback-host", {
        configuredUrl
      });
    }

    if (!isAllowedProductionUrl(configuredUrl)) {
      throwInvalidProductionBaseUrl("non-canonical-production-url", {
        configuredUrl
      });
    }

    logResolvedBaseUrl(configuredUrl);
    return configuredUrl;
  }

  if (configuredUrl) {
    logResolvedBaseUrl(configuredUrl);
    return configuredUrl;
  }

  const fallbackUrl = "http://localhost:3000";
  logResolvedBaseUrl(fallbackUrl, "development-fallback");
  return fallbackUrl;
}

export function absoluteUrl(path: string): string {
  const baseUrl = getBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalized}`;
}

export function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

export function nonEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
