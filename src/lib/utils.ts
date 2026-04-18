import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
      hostname === "0.0.0.0"
    );
  } catch {
    return false;
  }
}

export function getBaseUrl(): string {
  const appUrl = normalizeConfiguredUrl(process.env.APP_URL);
  const authUrl = normalizeConfiguredUrl(process.env.NEXTAUTH_URL);
  const configuredUrl = appUrl || authUrl;

  if (
    configuredUrl &&
    (process.env.NODE_ENV !== "production" || !isLoopbackHost(configuredUrl))
  ) {
    return configuredUrl;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://thebusinesscircle.net";
  }

  return configuredUrl || "http://localhost:3000";
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
