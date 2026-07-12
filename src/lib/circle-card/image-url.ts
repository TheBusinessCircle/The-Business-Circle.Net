const MANAGED_CIRCLE_CARD_IMAGE_PATH =
  /^\/uploads\/(?:circle-card|profiles|links)\/([^?#]+\.(?:jpe?g|png|webp))(?:[?#].*)?$/i;

const DEFAULT_APPROVED_REMOTE_IMAGE_HOSTS = new Set([
  "thebusinesscircle.net",
  "www.thebusinesscircle.net",
  "res.cloudinary.com",
  "lh3.googleusercontent.com"
]);

function approvedRemoteImageHosts() {
  const hosts = new Set(DEFAULT_APPROVED_REMOTE_IMAGE_HOSTS);

  for (const configuredUrl of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.NEXTAUTH_URL
  ]) {
    if (!configuredUrl) continue;
    try {
      hosts.add(new URL(configuredUrl).hostname.toLowerCase());
    } catch {
      // Invalid site configuration must not expand the image allowlist.
    }
  }

  for (const host of (process.env.CIRCLE_CARD_REMOTE_IMAGE_HOSTS ?? "").split(",")) {
    const normalized = host.trim().toLowerCase();
    if (normalized && /^[a-z0-9.-]+$/.test(normalized)) hosts.add(normalized);
  }

  return hosts;
}

function hasSafeManagedPath(path: string) {
  try {
    const decodedPath = decodeURIComponent(path);

    return (
      !decodedPath.includes("\\") &&
      decodedPath.split("/").every((segment) => Boolean(segment) && segment !== "." && segment !== "..")
    );
  } catch {
    return false;
  }
}

/**
 * Image URL contract shared by Circle Card forms and public rendering.
 * Only managed root-relative uploads and credential-free HTTPS URLs are allowed.
 */
export function isSafeCircleCardImageUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const imageUrl = value.trim();
  if (!imageUrl) {
    return false;
  }

  const localUploadMatch = imageUrl.match(MANAGED_CIRCLE_CARD_IMAGE_PATH);
  if (localUploadMatch) {
    return hasSafeManagedPath(localUploadMatch[1]);
  }

  try {
    const url = new URL(imageUrl);
    return (
      url.protocol === "https:" &&
      approvedRemoteImageHosts().has(url.hostname.toLowerCase()) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function normalizeSafeCircleCardImageUrl(value: unknown) {
  return isSafeCircleCardImageUrl(value) ? value.trim() : null;
}
