import { SITE_CONFIG } from "@/config/site";

const EXTERNAL_REL = "noopener noreferrer";

function resolveBaseOrigin() {
  try {
    return new URL(SITE_CONFIG.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function normalizeExternalHref(value: string): string {
  const href = value.trim();
  if (!href) {
    return href;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//") || href.startsWith("/")) {
    return href;
  }

  return `https://${href}`;
}

export function isExternalHref(value: string): boolean {
  const href = normalizeExternalHref(value);
  if (!href || href.startsWith("/")) {
    return false;
  }

  try {
    const url = new URL(href, SITE_CONFIG.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    return url.origin !== resolveBaseOrigin();
  } catch {
    return false;
  }
}

export function getExternalLinkProps(value: string) {
  const href = normalizeExternalHref(value);

  if (!isExternalHref(href)) {
    return { href };
  }

  return {
    href,
    target: "_blank" as const,
    rel: EXTERNAL_REL
  };
}

export const EXTERNAL_LINK_REL = EXTERNAL_REL;
