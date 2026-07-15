import { safeRedirectPath } from "@/lib/auth/utils";
import { logServerWarning } from "@/lib/security/logging";

type LoginSearchParamValue = string | string[] | undefined;

export type LoginSearchParams = Record<string, LoginSearchParamValue>;

export const LOGIN_VERIFIED_NOTICE = "Email verified successfully. You can sign in now.";

function firstString(value: LoginSearchParamValue): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return typeof value === "string" ? value : undefined;
}

function normalizeCode(value: LoginSearchParamValue): string | undefined {
  const candidate = firstString(value)?.trim();
  return candidate ? candidate : undefined;
}

function normalizeFrom(value: LoginSearchParamValue): string | undefined {
  const candidate = firstString(value);

  if (!candidate) {
    return undefined;
  }

  const safeFrom = safeRedirectPath(candidate, "");
  return safeFrom || undefined;
}

export function parseLoginSearchParams(params: LoginSearchParams) {
  const rawVerified = firstString(params.verified);
  const rawFrom = firstString(params.from);
  const from = normalizeFrom(params.from);

  if (rawVerified && rawVerified !== "1") {
    logServerWarning("auth-login-verified-param-ignored");
  }

  if (rawFrom && !from) {
    logServerWarning("auth-login-return-path-rejected");
  }

  return {
    from,
    errorCode: normalizeCode(params.error),
    errorDetailCode: normalizeCode(params.code),
    initialNotice: rawVerified === "1" ? LOGIN_VERIFIED_NOTICE : undefined
  };
}
