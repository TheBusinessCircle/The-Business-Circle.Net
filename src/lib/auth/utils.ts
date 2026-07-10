export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function safeRedirectPath(candidate: string | null | undefined, fallback = "/dashboard"): string {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "http://internal.local");

    if (parsed.origin !== "http://internal.local") {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function withFromParam(pathname: string, from: string | null | undefined): string {
  const safeFrom = from ? safeRedirectPath(from, "") : "";

  if (!safeFrom) {
    return pathname;
  }

  const search = new URLSearchParams({ from: safeFrom });
  return `${pathname}?${search.toString()}`;
}
