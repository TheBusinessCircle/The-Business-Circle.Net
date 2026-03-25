const AUTH_ERROR_MESSAGES: Record<string, string> = {
  suspended: "Your account is currently suspended. Contact support for reactivation.",
  "invalid-verification": "This verification link is invalid or has expired.",
  database_unavailable:
    "Sign-in is temporarily unavailable because the local database connection failed.",
  CredentialsSignin: "Invalid email or password.",
  AccessDenied: "Access denied for this account.",
  OAuthAccountNotLinked: "This email is linked to a different sign-in method."
};

export function resolveAuthErrorMessage(
  errorCode: string | null | undefined,
  detailCode?: string | null | undefined
): string | null {
  if (detailCode && AUTH_ERROR_MESSAGES[detailCode]) {
    return AUTH_ERROR_MESSAGES[detailCode];
  }

  if (!errorCode) {
    return null;
  }

  return AUTH_ERROR_MESSAGES[errorCode] ?? "Authentication failed. Please try again.";
}
