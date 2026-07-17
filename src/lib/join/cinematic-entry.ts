import { safeAuthenticationRedirectPath } from "@/lib/auth/utils";
import {
  buildJoinConfirmationHref,
  buildMembershipDecisionHref,
  normalizeInviteCode
} from "@/lib/join/routing";

export type Join2MembershipTier = "FOUNDATION" | "INNER_CIRCLE" | "CORE";
export type Join2BillingInterval = "monthly" | "annual";
export type Join2SceneStage = "intro" | "entering" | "choices";

export const JOIN2_FALLBACK_TIMEOUT_MS = 4700;

export function sanitizeJoin2From(from?: string) {
  const safeFrom = from ? safeAuthenticationRedirectPath(from, "") : "";
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
  invite
}: {
  tier: Join2MembershipTier;
  billingInterval: Join2BillingInterval;
  billing?: string;
  from?: string;
  invite?: string;
}) {
  const safeFrom = sanitizeJoin2From(from);
  const normalizedInvite = normalizeInviteCode(invite);
  const joinHref = buildJoinConfirmationHref({
    tier,
    period: billingInterval,
    billing,
    from: safeFrom,
    invite: normalizedInvite
  });

  return {
    publicSiteHref: "/home",
    membershipHref: buildMembershipDecisionHref({
      tier,
      period: billingInterval,
      billing,
      from: safeFrom,
      invite: normalizedInvite
    }),
    auditHref: "/audit?source=join&topic=join-mobile",
    joinHref,
    loginHref: `/login?from=${encodeURIComponent(joinHref)}`
  };
}

export function isJoin2ActivationKey(key: string) {
  return key === "Enter" || key === " " || key === "Spacebar";
}
