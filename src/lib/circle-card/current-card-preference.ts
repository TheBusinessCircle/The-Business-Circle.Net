export const CIRCLE_CARD_CURRENT_CARD_STORAGE_KEY = "circle-card.workspace.current-card-id.v1";
export const CIRCLE_CARD_CURRENT_CARD_COOKIE = "circle_card_workspace_card";

const CARD_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
const LEGACY_SESSION_STORAGE_KEY = "circle-card.dashboard.current-card-id";
export const CIRCLE_CARD_LEGACY_CURRENT_CARD_COOKIE_PATH = "/dashboard/circle-card";
export const CIRCLE_CARD_CURRENT_CARD_COOKIE_PATH = "/";

export function buildCircleCardCurrentCardCookie(
  value: string,
  path: string,
  maxAge: number,
  secure: boolean
) {
  return `${CIRCLE_CARD_CURRENT_CARD_COOKIE}=${value}; Path=${path}; Max-Age=${maxAge}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function buildCircleCardCurrentCardCookieMigration(value: string, secure: boolean) {
  return [
    buildCircleCardCurrentCardCookie(
      "",
      CIRCLE_CARD_LEGACY_CURRENT_CARD_COOKIE_PATH,
      0,
      secure
    ),
    buildCircleCardCurrentCardCookie(
      value,
      CIRCLE_CARD_CURRENT_CARD_COOKIE_PATH,
      ONE_YEAR_SECONDS,
      secure
    )
  ] as const;
}

export function normalizeCircleCardCurrentCardId(value: unknown) {
  if (typeof value !== "string") return null;
  const cardId = value.trim();
  return CARD_ID_PATTERN.test(cardId) ? cardId : null;
}

export function readCircleCardCurrentCardPreference() {
  try {
    const stored = normalizeCircleCardCurrentCardId(
      window.localStorage.getItem(CIRCLE_CARD_CURRENT_CARD_STORAGE_KEY)
    );
    if (stored) {
      persistCircleCardCurrentCardPreference(stored);
      return stored;
    }

    const legacy = normalizeCircleCardCurrentCardId(
      window.sessionStorage.getItem(LEGACY_SESSION_STORAGE_KEY)
    );
    if (legacy) persistCircleCardCurrentCardPreference(legacy);
    return legacy;
  } catch {
    return null;
  }
}

export function persistCircleCardCurrentCardPreference(cardId: string) {
  const normalized = normalizeCircleCardCurrentCardId(cardId);
  if (!normalized) return;

  try {
    window.localStorage.setItem(CIRCLE_CARD_CURRENT_CARD_STORAGE_KEY, normalized);
  } catch {
    // Storage may be unavailable in hardened browsers; the scoped cookie remains a fallback.
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const isSecure = Boolean(secure);
  const migrationCookies = buildCircleCardCurrentCardCookieMigration(
    encodeURIComponent(normalized),
    isSecure
  );
  migrationCookies.forEach((cookie) => {
    document.cookie = cookie;
  });
}

export function clearCircleCardCurrentCardPreference() {
  try {
    window.localStorage.removeItem(CIRCLE_CARD_CURRENT_CARD_STORAGE_KEY);
  } catch {
    // Keep the cleanup best-effort.
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const isSecure = Boolean(secure);
  document.cookie = buildCircleCardCurrentCardCookie(
    "",
    CIRCLE_CARD_LEGACY_CURRENT_CARD_COOKIE_PATH,
    0,
    isSecure
  );
  document.cookie = buildCircleCardCurrentCardCookie(
    "",
    CIRCLE_CARD_CURRENT_CARD_COOKIE_PATH,
    0,
    isSecure
  );
}

export function resolveCircleCardCurrentCardCookieValues(values: readonly unknown[]) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const cardId = normalizeCircleCardCurrentCardId(values[index]);
    if (cardId) return cardId;
  }

  return null;
}
