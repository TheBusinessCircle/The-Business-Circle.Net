export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hasUnsafeDecodedRedirectPath(pathname: string) {
  let candidate = pathname;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (
      candidate.startsWith("//") ||
      candidate.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(candidate)
    ) {
      return true;
    }

    try {
      const decoded = decodeURIComponent(candidate);
      if (decoded === candidate) return false;
      candidate = decoded;
    } catch {
      return true;
    }
  }

  return (
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  );
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

    if (hasUnsafeDecodedRedirectPath(parsed.pathname)) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function safeAuthenticationRedirectPath(
  candidate: string | null | undefined,
  fallback = "/dashboard"
): string {
  const safePath = safeRedirectPath(candidate, "");
  if (!safePath) return fallback;

  try {
    const parsed = new URL(safePath, "http://internal.local");
    return parsed.hash ? fallback : safePath;
  } catch {
    return fallback;
  }
}

export function withFromParam(pathname: string, from: string | null | undefined): string {
  const safeFrom = from ? safeAuthenticationRedirectPath(from, "") : "";

  if (!safeFrom) {
    return pathname;
  }

  const search = new URLSearchParams({ from: safeFrom });
  return `${pathname}?${search.toString()}`;
}
