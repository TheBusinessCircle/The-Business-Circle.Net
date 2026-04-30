import { safeRedirectPath } from "@/lib/auth/utils";
import { buildJoinConfirmationHref } from "@/lib/join/routing";

export type Join2MembershipTier = "FOUNDATION" | "INNER_CIRCLE" | "CORE";
export type Join2BillingInterval = "monthly" | "annual";
export type Join2SceneStage = "intro" | "entering";

export const JOIN2_FALLBACK_TIMEOUT_MS = 4700;
export const JOIN2_HANDOFF_STORAGE_KEY = "business-circle:join-handoff";

export function normalizeJoin2InviteCode(inviteCode?: string) {
  const normalized = inviteCode?.trim().toUpperCase();
  return normalized || undefined;
}

export function sanitizeJoin2From(from?: string) {
  const safeFrom = from ? safeRedirectPath(from, "") : "";
  return safeFrom || undefined;
}

export function withJoin2From(pathname: string, from?: string) {
  const safeFrom = sanitizeJoin2From(from);

  if (!safeFrom) {
    return pathname;
  }

  const url = new URL(pathname, "http://localhost");
  url.searchParams.set("from", safeFrom);
  return `${url.pathname}${url.search}`;
}

export function isJoin2MembershipPath(pathname?: string) {
  const safePath = sanitizeJoin2From(pathname);
  return safePath?.startsWith("/membership") ?? false;
}

export function buildJoin2ActionHrefs({
  tier,
  billingInterval,
  billing,
  from,
  inviteCode
}: {
  tier: Join2MembershipTier;
  billingInterval: Join2BillingInterval;
  billing?: string;
  from?: string;
  inviteCode?: string;
}) {
  return {
    publicSiteHref: "/",
    joinHref: buildJoinConfirmationHref({
      tier,
      period: billingInterval,
      billing,
      from: sanitizeJoin2From(from),
      invite: normalizeJoin2InviteCode(inviteCode)
    }),
    loginHref: withJoin2From("/login", from)
  };
}

export function isJoin2ActivationKey(key: string) {
  return key === "Enter" || key === " " || key === "Spacebar";
}
