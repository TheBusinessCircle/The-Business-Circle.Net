import { safeRedirectPath } from "@/lib/auth/utils";
import type { RuntimeBrandKey } from "@/config/runtime-brand";
import {
  getCircleCardRoutes,
  preferCircleCardRuntimePath
} from "@/lib/circle-card/routes";

export const CIRCLE_CARD_PRO_SOURCES = [
  "pro_page",
  "dashboard",
  "studio",
  "business_builder",
  "media_kit",
  "audience_snapshot",
  "second_card",
  "link_limit",
  "locked_module"
] as const;

export const CIRCLE_CARD_PRO_CAPABILITIES = [
  "explore_pro",
  "apply_studio_design",
  "create_second_card",
  "activate_more_links",
  "open_business_builder",
  "open_media_kit",
  "open_audience_snapshot",
  "restore_pro"
] as const;

export type CircleCardProSource = (typeof CIRCLE_CARD_PRO_SOURCES)[number];
export type CircleCardProCapability = (typeof CIRCLE_CARD_PRO_CAPABILITIES)[number];

export type CircleCardProIntent = {
  source: CircleCardProSource;
  capability: CircleCardProCapability;
  returnPath: string;
  cardId?: string;
};

const DEFAULT_INTENT: CircleCardProIntent = {
  source: "pro_page",
  capability: "explore_pro",
  returnPath: "/dashboard/circle-card"
};

function includesValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}

export function safeCircleCardProReturnPath(candidate: string | null | undefined) {
  const safe = safeRedirectPath(candidate, DEFAULT_INTENT.returnPath);
  return safe === "/dashboard/circle-card" || safe.startsWith("/dashboard/circle-card?") ||
    safe.startsWith("/dashboard/circle-card#") || safe.startsWith("/dashboard/circle-card/") ||
    safe === "/app" || safe.startsWith("/app?") || safe.startsWith("/app#") ||
    safe.startsWith("/app/")
    ? safe
    : DEFAULT_INTENT.returnPath;
}

export function safeCircleCardBillingReturnPath(
  candidate: string | null | undefined,
  runtimeBrand: RuntimeBrandKey
) {
  const fallback = getCircleCardRoutes(runtimeBrand).dashboard;
  const safe = safeRedirectPath(candidate, fallback);
  const preferred = preferCircleCardRuntimePath(safe, runtimeBrand);
  const dashboard = getCircleCardRoutes(runtimeBrand).dashboard;

  return preferred === dashboard ||
    preferred.startsWith(`${dashboard}?`) ||
    preferred.startsWith(`${dashboard}#`) ||
    preferred.startsWith(`${dashboard}/`)
    ? preferred
    : fallback;
}

export function appendCircleCardPortalReturnState(
  candidate: string | null | undefined,
  runtimeBrand: RuntimeBrandKey
) {
  const safePath = safeCircleCardBillingReturnPath(candidate, runtimeBrand);
  const url = new URL(safePath, "http://internal.local");
  url.searchParams.set("billing", "portal-return");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function normalizeCircleCardProIntent(
  input?: Partial<CircleCardProIntent> | null,
  runtimeBrand: RuntimeBrandKey = "bcn"
): CircleCardProIntent {
  const source = includesValue(CIRCLE_CARD_PRO_SOURCES, input?.source)
    ? input.source
    : DEFAULT_INTENT.source;
  const capability = includesValue(CIRCLE_CARD_PRO_CAPABILITIES, input?.capability)
    ? input.capability
    : DEFAULT_INTENT.capability;
  const cardId = typeof input?.cardId === "string" && /^[a-z0-9_-]{8,64}$/i.test(input.cardId)
    ? input.cardId
    : undefined;

  return {
    source,
    capability,
    returnPath: safeCircleCardBillingReturnPath(
      safeCircleCardProReturnPath(input?.returnPath),
      runtimeBrand
    ),
    ...(cardId ? { cardId } : {})
  };
}

export function buildCircleCardProHref(
  input?: Partial<CircleCardProIntent> | null,
  runtimeBrand: RuntimeBrandKey = "bcn"
) {
  const intent = normalizeCircleCardProIntent(input, runtimeBrand);
  const params = new URLSearchParams({
    source: intent.source,
    capability: intent.capability,
    returnTo: intent.returnPath
  });
  if (intent.cardId) params.set("card", intent.cardId);
  return `${getCircleCardRoutes(runtimeBrand).pro}?${params.toString()}#register-interest`;
}

export function appendCircleCardProResultParams(
  returnPath: string,
  input: { billing: "success" | "cancelled"; capability: CircleCardProCapability }
) {
  const safePath = safeCircleCardProReturnPath(returnPath);
  const url = new URL(safePath, "http://internal.local");
  url.searchParams.set("billing", input.billing);
  url.searchParams.set("plan", "pro");
  url.searchParams.set("capability", input.capability);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function circleCardProCapabilityLabel(capability: CircleCardProCapability) {
  const labels: Record<CircleCardProCapability, string> = {
    explore_pro: "Circle Card Pro",
    apply_studio_design: "apply your saved Studio design",
    create_second_card: "create your second Circle Card",
    activate_more_links: "activate more links",
    open_business_builder: "open Business Card Builder",
    open_media_kit: "open your Creator Media Kit",
    open_audience_snapshot: "open Audience Snapshot",
    restore_pro: "restore your saved Pro experience"
  };
  return labels[capability];
}
