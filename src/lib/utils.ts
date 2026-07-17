import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { getConfiguredRuntimeBaseUrl } from "@/config/runtime-origin";

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

export function getBaseUrl(): string {
  const configuredUrl = getConfiguredRuntimeBaseUrl();

  if (configuredUrl) {
    logResolvedBaseUrl(configuredUrl);
    return configuredUrl;
  }

  const runtimeBrand = getRuntimeBrand();
  const fallbackUrl = "http://localhost:3000";
  logResolvedBaseUrl(fallbackUrl, "development-fallback");

  if (runtimeBrand.key !== "bcn") {
    console.info("[url-resolution] using local fallback for runtime brand", {
      runtimeBrand: runtimeBrand.key
    });
  }

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
