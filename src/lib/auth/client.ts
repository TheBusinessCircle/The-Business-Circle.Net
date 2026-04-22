export const DEFAULT_AUTH_ERROR_MESSAGE = "Authentication failed. Please try again.";

const AUTH_ERROR_MESSAGES = {
  suspended: "Your account is currently suspended. Contact support for reactivation.",
  "invalid-verification": "This verification link is invalid or has expired.",
  database_unavailable:
    "Sign-in is temporarily unavailable because the local database connection failed.",
  CredentialsSignin: "Invalid email or password.",
  AccessDenied: "Access denied for this account.",
  OAuthAccountNotLinked: "This email is linked to a different sign-in method."
} as const;

function resolveKnownAuthErrorMessage(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(AUTH_ERROR_MESSAGES, code)) {
    return AUTH_ERROR_MESSAGES[code as keyof typeof AUTH_ERROR_MESSAGES];
  }

  return null;
}

export function resolveAuthErrorMessage(
  errorCode: string | null | undefined,
  detailCode?: string | null | undefined
): string | null {
  const detailMessage = resolveKnownAuthErrorMessage(detailCode);

  if (detailMessage) {
    return detailMessage;
  }

  const errorMessage = resolveKnownAuthErrorMessage(errorCode);

  if (errorMessage) {
    return errorMessage;
  }

  if (!errorCode) {
    return null;
  }

  console.warn("[auth] Unrecognized login error code", {
    errorCode,
    detailCode: detailCode ?? null
  });

  return DEFAULT_AUTH_ERROR_MESSAGE;
}
