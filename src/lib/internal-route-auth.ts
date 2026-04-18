function matchesSecret(candidate: string | null | undefined, secret: string) {
  return Boolean(candidate) && candidate === secret;
}

export function isAuthorizedInternalAutomationRequest(
  request: Request,
  input: {
    bearerSecrets: string[];
    headerSecrets?: Array<{
      headerName: string;
      secret: string;
    }>;
    allowQuerySecret?: boolean;
  }
) {
  const url = new URL(request.url);
  const authorization = request.headers.get("authorization")?.trim();
  const querySecret =
    input.allowQuerySecret === false
      ? null
      : url.searchParams.get("secret")?.trim();

  for (const secret of input.bearerSecrets.filter(Boolean)) {
    if (
      matchesSecret(authorization, `Bearer ${secret}`) ||
      matchesSecret(querySecret, secret)
    ) {
      return true;
    }
  }

  for (const headerSecret of input.headerSecrets ?? []) {
    const headerValue = request.headers.get(headerSecret.headerName)?.trim();
    if (matchesSecret(headerValue, headerSecret.secret)) {
      return true;
    }
  }

  return false;
}
