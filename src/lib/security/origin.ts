import { SITE_CONFIG } from "@/config/site";

type TrustedOriginOptions = {
  allowMissingOrigin?: boolean;
};

function toOrigin(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function allowedOrigins(requestUrl: string) {
  const origins = new Set<string>();

  const requestOrigin = toOrigin(requestUrl);
  if (requestOrigin) {
    origins.add(requestOrigin);
  }

  const siteOrigin = toOrigin(SITE_CONFIG.url);
  if (siteOrigin) {
    origins.add(siteOrigin);
  }

  const authOrigin = toOrigin(process.env.NEXTAUTH_URL ?? null);
  if (authOrigin) {
    origins.add(authOrigin);
  }

  return origins;
}

function isSameSiteBrowserRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();

  return fetchSite === "same-origin" || fetchSite === "same-site";
}

export function isTrustedOrigin(
  request: Request,
  options: TrustedOriginOptions = {}
): boolean {
  const allowed = allowedOrigins(request.url);
  const originHeader = request.headers.get("origin");
  const normalizedOrigin = toOrigin(originHeader);

  if (originHeader) {
    return normalizedOrigin ? allowed.has(normalizedOrigin) : false;
  }

  const normalizedReferer = toOrigin(request.headers.get("referer"));
  if (normalizedReferer) {
    return allowed.has(normalizedReferer);
  }

  if (isSameSiteBrowserRequest(request)) {
    return true;
  }

  return options.allowMissingOrigin ?? false;
}
