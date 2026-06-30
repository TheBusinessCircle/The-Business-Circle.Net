const MANAGED_CIRCLE_CARD_IMAGE_PATH =
  /^\/uploads\/(?:circle-card|profiles|links)\/([^?#]+\.(?:jpe?g|png|webp))(?:[?#].*)?$/i;

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
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function normalizeSafeCircleCardImageUrl(value: unknown) {
  return isSafeCircleCardImageUrl(value) ? value.trim() : null;
}
