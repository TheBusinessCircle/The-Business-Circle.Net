import { safeRedirectPath } from "@/lib/auth/utils";

export type MembershipTier = "FOUNDATION" | "INNER_CIRCLE" | "CORE";
export type MembershipBillingInterval = "monthly" | "annual";

const MOBILE_USER_AGENT_PATTERN =
  /Android.+Mobile|iPhone|iPod|webOS|BlackBerry|IEMobile|Windows Phone|Opera Mini/i;
const TABLET_USER_AGENT_PATTERN =
  /iPad|Tablet|PlayBook|Silk|Kindle|Android(?!.*Mobile)/i;

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveTier(value: string | undefined): MembershipTier {
  if (value === "CORE") {
    return "CORE";
  }

  if (value === "INNER_CIRCLE") {
    return "INNER_CIRCLE";
  }

  return "FOUNDATION";
}

export function resolveBillingInterval(value: string | undefined): MembershipBillingInterval {
  return value === "annual" ? "annual" : "monthly";
}

export function buildAuthModeRedirect({
  from,
  error
}: {
  from?: string;
  error?: string;
}) {
  const search = new URLSearchParams();

  if (from) {
    search.set("from", from);
  }

  if (error) {
    search.set("error", error);
  }

  return search.size ? `/login?${search.toString()}` : "/login";
}

export function buildMembershipSelectionRedirect(input: {
  from?: string;
  tier?: string;
  interval?: string;
  billing?: string;
  invite?: string;
  auth?: string;
  coreAccessConfirmed?: string | boolean;
}) {
  const search = new URLSearchParams();
  const from = input.from ? safeRedirectPath(input.from, "") : "";
  const tier = input.tier ? resolveTier(input.tier) : undefined;
  const interval = input.interval ? resolveBillingInterval(input.interval) : undefined;
  const invite = input.invite?.trim().toUpperCase();
  const auth = input.auth === "register" || invite ? "register" : undefined;

  if (from) {
    search.set("from", from);
  }

  if (tier) {
    search.set("tier", tier);
  }

  if (interval) {
    search.set("interval", interval);
  }

  if (input.billing) {
    search.set("billing", input.billing);
  }

  if (invite) {
    search.set("invite", invite);
  }

  if (auth) {
    search.set("auth", auth);
  }

  if (input.coreAccessConfirmed === true || input.coreAccessConfirmed === "1") {
    search.set("coreAccessConfirmed", "1");
  }

  return search.size ? `/membership?${search.toString()}` : "/membership";
}

export function toSearchParams(params: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) {
          search.append(key, item);
        }
      });
      continue;
    }

    if (value) {
      search.set(key, value);
    }
  }

  return search;
}

function parseViewportWidth(headerValue: string | null) {
  if (!headerValue) {
    return null;
  }

  const width = Number.parseInt(headerValue, 10);
  return Number.isFinite(width) ? width : null;
}

export function shouldUseMobileJoin(headersList: Headers) {
  const viewportWidth =
    parseViewportWidth(headersList.get("viewport-width")) ??
    parseViewportWidth(headersList.get("sec-ch-viewport-width"));

  if (viewportWidth !== null) {
    return viewportWidth < 1100;
  }

  const mobileHint = headersList.get("sec-ch-ua-mobile")?.trim();

  if (mobileHint === "?1" || mobileHint === "1") {
    return true;
  }

  const userAgent = headersList.get("user-agent") ?? "";
  return (
    MOBILE_USER_AGENT_PATTERN.test(userAgent) || TABLET_USER_AGENT_PATTERN.test(userAgent)
  );
}
