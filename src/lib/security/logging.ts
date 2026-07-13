type SafeLogValue = string | number | boolean | null | undefined;

export type SafeLogDetails = Record<string, SafeLogValue>;

const SENSITIVE_DETAIL_KEY =
  /(?:token|secret|password|authorization|cookie|signature|invite.?code)/i;
const EMAIL_DETAIL_KEY = /email(?:address)?$/i;
const AUTHENTICATION_URL_KEY = /(?:verification|verify|reset|magic|invite).*(?:url|uri|link)/i;

function compactDetails(details?: SafeLogDetails) {
  if (!details) {
    return undefined;
  }

  const entries = Object.entries(details)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, sanitizeLogDetail(key, value)]);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function redactSensitiveLogText(value: string) {
  return value
    .replace(
      /https?:\/\/[^\s"'<>]*(?:\/api\/auth\/verify-email|\/reset-password|\/invite\/)[^\s"'<>]*/gi,
      "[redacted authentication URL]"
    )
    .replace(
      /([?&](?:token|code|secret|key|signature|email)=)[^&\s"'<>]*/gi,
      "$1[redacted]"
    )
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
    .replace(/(?:sk|rk)_(?:live|test)_[A-Za-z0-9]+/g, "[redacted Stripe key]")
    .replace(/whsec_[A-Za-z0-9]+/g, "[redacted webhook secret]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*\b/gi, "Bearer [redacted token]")
    .replace(/\b[A-Fa-f0-9]{48,}\b/g, "[redacted token]")
    .replace(/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, "[redacted token]")
    .replace(/\b(?:pm|card|src|ba|tok)_[A-Za-z0-9]+\b/g, "[redacted payment method]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[redacted payment number]");
}

function sanitizeLogDetail(key: string, value: SafeLogValue): SafeLogValue {
  if (typeof value !== "string") return value;
  if (SENSITIVE_DETAIL_KEY.test(key)) return "[redacted secret]";
  if (EMAIL_DETAIL_KEY.test(key)) return "[redacted email]";
  if (AUTHENTICATION_URL_KEY.test(key)) return "[redacted authentication URL]";
  return redactSensitiveLogText(value);
}

function summarizeErrorCause(error: Error) {
  const causeChain: string[] = [];
  let current: unknown = error;

  while (current instanceof Error && causeChain.length < 4) {
    causeChain.push(`${current.name}: ${redactSensitiveLogText(current.message)}`);
    current = current.cause;
  }

  return causeChain.length > 1
    ? {
        errorCauseMessage: causeChain[1]?.split(": ").slice(1).join(": ") || undefined,
        errorChain: causeChain.join(" <= ")
      }
    : undefined;
}

function summarizeError(error: unknown): SafeLogDetails {
  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: unknown };
    const causeSummary = summarizeErrorCause(error);

    return {
      errorName: error.name,
      errorMessage: redactSensitiveLogText(error.message),
      errorCode: typeof errorWithCode.code === "string" ? errorWithCode.code : undefined,
      ...causeSummary,
      errorStack:
        process.env.NODE_ENV !== "production"
          ? redactSensitiveLogText(error.stack ?? "")
              ?.split("\n")
              .map((line) => line.trim())
              .slice(0, 8)
              .join(" | ")
          : undefined
    };
  }

  return {
    errorType: typeof error
  };
}

export function logServerError(
  event: string,
  error: unknown,
  details?: SafeLogDetails
) {
  console.error(`[server] ${event}`, {
    ...compactDetails(details),
    ...summarizeError(error)
  });
}

export function logServerWarning(event: string, details?: SafeLogDetails) {
  const payload = compactDetails(details);

  if (payload) {
    console.warn(`[server] ${event}`, payload);
    return;
  }

  console.warn(`[server] ${event}`);
}

export function logServerInfo(event: string, details?: SafeLogDetails) {
  const payload = compactDetails(details);

  if (payload) {
    console.info(`[server] ${event}`, payload);
    return;
  }

  console.info(`[server] ${event}`);
}
