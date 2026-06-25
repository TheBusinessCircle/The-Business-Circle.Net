"use client";

import {
  resolveCircleCardPlatformOwnerSandboxMode,
  type CircleCardPlatformOwnerSandboxMode
} from "@/lib/circle-card/platform-owner-control";

export const CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_STORAGE_KEY =
  "circle-card-platform-owner-sandbox-mode";
export const CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_ELIGIBLE_STORAGE_KEY =
  "circle-card-platform-owner-sandbox-eligible";
export const CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_EVENT =
  "circle-card-platform-owner-sandbox-change";

type CircleCardPlatformOwnerSandboxSuppressionTarget =
  | "analytics"
  | "referral"
  | "notification"
  | "email"
  | "tracking";

const CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_SUPPRESSED_TARGETS =
  new Set<CircleCardPlatformOwnerSandboxSuppressionTarget>([
    "analytics",
    "referral",
    "notification",
    "email",
    "tracking"
  ]);

function readSessionStorageValue(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorageValue(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Sandbox mode is progressive enhancement for owner testing only.
  }
}

export function markCircleCardPlatformOwnerSandboxEligible() {
  if (typeof window === "undefined") {
    return;
  }

  writeSessionStorageValue(CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_ELIGIBLE_STORAGE_KEY, "true");
}

export function readCircleCardPlatformOwnerSandboxMode(
  fallback: CircleCardPlatformOwnerSandboxMode = "off"
) {
  if (typeof window === "undefined") {
    return fallback;
  }

  return resolveCircleCardPlatformOwnerSandboxMode(
    readSessionStorageValue(CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_STORAGE_KEY) ?? fallback
  );
}

export function writeCircleCardPlatformOwnerSandboxMode(
  mode: CircleCardPlatformOwnerSandboxMode
) {
  if (typeof window === "undefined") {
    return;
  }

  markCircleCardPlatformOwnerSandboxEligible();
  writeSessionStorageValue(CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_STORAGE_KEY, mode);
  window.dispatchEvent(
    new CustomEvent(CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_EVENT, {
      detail: { mode }
    })
  );
}

export function isCircleCardPlatformOwnerSandboxActive() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    readSessionStorageValue(CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_ELIGIBLE_STORAGE_KEY) === "true" &&
    readCircleCardPlatformOwnerSandboxMode() === "on"
  );
}

export function shouldSuppressCircleCardPlatformOwnerSandboxEvent(
  target: CircleCardPlatformOwnerSandboxSuppressionTarget
) {
  return (
    CIRCLE_CARD_PLATFORM_OWNER_SANDBOX_SUPPRESSED_TARGETS.has(target) &&
    isCircleCardPlatformOwnerSandboxActive()
  );
}
