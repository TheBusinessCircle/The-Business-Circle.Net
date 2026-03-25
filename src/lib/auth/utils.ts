export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function safeRedirectPath(candidate: string | null | undefined, fallback = "/dashboard"): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  return candidate;
}

export function withFromParam(pathname: string, from: string | null | undefined): string {
  const safeFrom = from ? safeRedirectPath(from, "") : "";

  if (!safeFrom) {
    return pathname;
  }

  const search = new URLSearchParams({ from: safeFrom });
  return `${pathname}?${search.toString()}`;
}
